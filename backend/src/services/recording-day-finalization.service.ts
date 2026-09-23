import { segmentsAreContiguous } from "../lib/compute-coverage.ts";
import type { EventTypeValue } from "../lib/event-types.ts";
import { prisma } from "../lib/prisma.ts";

const EVENT_LABELS: Record<EventTypeValue, string> = {
  gateOpen: "Portão aberto",
  occupancy: "Permanência suspeita",
  restrictedArea: "Acesso a área restrita",
  abandonedObject: "Objeto abandonado",
  illegalParking: "Carro em local inapropriado",
  childRunning: "Criança correndo",
  petWaste: "Necessidade de animal não recolhida",
  other: "Outro",
};

const describeFusedEvent = (
  eventType: EventTypeValue,
  durationSec: number | null,
  confidence: number,
): string => {
  const label = EVENT_LABELS[eventType];
  const confidencePct = Math.round(confidence * 100);
  if (durationSec !== null && durationSec > 0) {
    const minutes = Math.round(durationSec / 60);
    const durationText =
      minutes >= 1 ? `${minutes} min` : `${Math.round(durationSec)} s`;
    return `${label} detectado por ${durationText} (confiança ${confidencePct}%).`;
  }
  return `${label} detectado (confiança ${confidencePct}%).`;
};

const loadSegments = (recordingDayId: string) =>
  prisma.segment.findMany({
    where: { recordingDayId, status: "completed" },
    orderBy: { startedAt: "asc" },
    include: { intervals: true },
  });

type LoadedSegment = Awaited<ReturnType<typeof loadSegments>>[number];

type FusedEvent = {
  eventType: EventTypeValue;
  occurredAt: Date;
  endedAt: Date;
  maxConfidence: number;
  segmentId: string;
};

// Walks segments in chronological order, merging same-type intervals across a
// segment boundary when the earlier one touches its segment's end, the later
// one touches its segment's start, and the two segments are contiguous
// (`segmentsAreContiguous`, same tolerance used for the coverage warnings).
const fuseAcrossSegments = (segments: LoadedSegment[]): FusedEvent[] => {
  const result: FusedEvent[] = [];
  let open = new Map<EventTypeValue, FusedEvent>();

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const previous = i > 0 ? segments[i - 1]! : null;
    const contiguous = previous
      ? segmentsAreContiguous(previous, segment)
      : false;

    if (!contiguous) {
      for (const fused of open.values()) result.push(fused);
      open = new Map();
    }

    const stillOpen = new Map<EventTypeValue, FusedEvent>();
    const sorted = [...segment.intervals].sort(
      (a, b) => a.startSec - b.startSec,
    );

    for (const interval of sorted) {
      const occurredAt = new Date(
        segment.startedAt.getTime() + interval.startSec * 1000,
      );
      const endedAt = new Date(
        segment.startedAt.getTime() + interval.endSec * 1000,
      );

      const carried = interval.touchesStart
        ? open.get(interval.eventType)
        : undefined;
      if (carried) {
        open.delete(interval.eventType);
        carried.endedAt = endedAt;
        carried.maxConfidence = Math.max(
          carried.maxConfidence,
          interval.maxConfidence,
        );
        if (interval.touchesEnd) stillOpen.set(interval.eventType, carried);
        else result.push(carried);
        continue;
      }

      const fresh: FusedEvent = {
        eventType: interval.eventType,
        occurredAt,
        endedAt,
        maxConfidence: interval.maxConfidence,
        segmentId: segment.id,
      };
      if (interval.touchesEnd) stillOpen.set(interval.eventType, fresh);
      else result.push(fresh);
    }

    // Anything still open from the previous segment that this segment's
    // intervals didn't continue closes here.
    for (const fused of open.values()) result.push(fused);
    open = stillOpen;
  }
  for (const fused of open.values()) result.push(fused);

  return result;
};

const eventKey = (type: string, occurredAt: Date) =>
  `${type}|${occurredAt.toISOString()}`;

// Passo B: fuses this batch's detection intervals into events, keeps only
// those whose camera has an active `Rule` (and meets its time limit), and
// upserts them by (cameraId, type, occurredAt) — idempotent, and never
// touches `status` on an update, so a status the user already set survives a
// reprocess or a rule edit. Events from a previous run that no longer match
// anything (rule deactivated, intervals changed) are removed.
export const finalizeRecordingDay = async (recordingDayId: string) => {
  const day = await prisma.recordingDay.findUniqueOrThrow({
    where: { id: recordingDayId },
    select: { cameraId: true },
  });

  const segments = await loadSegments(recordingDayId);
  const rules = await prisma.rule.findMany({
    where: { cameraId: day.cameraId, active: true },
  });
  const ruleByType = new Map(rules.map((rule) => [rule.eventType, rule]));

  const fused = fuseAcrossSegments(segments);

  const toKeep = fused.filter((event) => {
    const rule = ruleByType.get(event.eventType);
    if (!rule) return false;
    if (rule.timeLimitSeconds == null) return true;
    const durationSec =
      (event.endedAt.getTime() - event.occurredAt.getTime()) / 1000;
    return durationSec >= rule.timeLimitSeconds;
  });

  for (const event of toKeep) {
    const durationSec = Math.round(
      (event.endedAt.getTime() - event.occurredAt.getTime()) / 1000,
    );
    const technicalDescription = describeFusedEvent(
      event.eventType,
      durationSec,
      event.maxConfidence,
    );

    const existing = await prisma.event.findUnique({
      where: {
        cameraId_type_occurredAt: {
          cameraId: day.cameraId,
          type: event.eventType,
          occurredAt: event.occurredAt,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          endedAt: event.endedAt,
          confidence: event.maxConfidence,
          segmentId: event.segmentId,
          technicalDescription,
        },
      });
    } else {
      const created = await prisma.event.create({
        data: {
          cameraId: day.cameraId,
          type: event.eventType,
          status: "pending",
          startedAt: event.occurredAt,
          endedAt: event.endedAt,
          occurredAt: event.occurredAt,
          confidence: event.maxConfidence,
          segmentId: event.segmentId,
          technicalDescription,
        },
        select: { id: true },
      });
      await prisma.alert.create({
        data: { eventId: created.id, sentAt: new Date() },
      });
    }
  }

  const keepKeys = new Set(
    toKeep.map((event) => eventKey(event.eventType, event.occurredAt)),
  );
  const existingEvents = await prisma.event.findMany({
    where: { segment: { recordingDayId } },
    select: { id: true, type: true, occurredAt: true },
  });
  const staleIds = existingEvents
    .filter(
      (event) =>
        !event.occurredAt ||
        !keepKeys.has(eventKey(event.type, event.occurredAt)),
    )
    .map((event) => event.id);
  if (staleIds.length > 0) {
    // `Alert.event` has onDelete: Cascade, so this also removes their alerts.
    await prisma.event.deleteMany({ where: { id: { in: staleIds } } });
  }
};

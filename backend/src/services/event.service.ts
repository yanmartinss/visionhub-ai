import { AppError } from "../lib/app-error.ts";
import { EVENT_TYPE_REQUIREMENTS } from "../lib/event-types.ts";
import { prisma } from "../lib/prisma.ts";
import type { ListEventsFilters } from "../schemas/list-events-schema.ts";
import type {
  EventStatus,
  Prisma,
} from "../../generated/prisma/client.ts";

// Raw event row, as returned by `PATCH /events/:id` and
// `GET /recording-days/:id/events`.
export const eventSelect = {
  id: true,
  cameraId: true,
  type: true,
  status: true,
  technicalDescription: true,
  startedAt: true,
  endedAt: true,
  segmentId: true,
  occurredAt: true,
  confidence: true,
  thumbnailPath: true,
  clipPath: true,
  createdAt: true,
} as const;

// Fields behind `EventListItem` (history, detail, dashboard — see
// docs/agentes/README.md §3.3). Storage paths are read only to derive
// `hasThumbnail`/`hasClip`; they never leave the API.
export const eventListSelect = {
  id: true,
  type: true,
  status: true,
  occurredAt: true,
  startedAt: true,
  endedAt: true,
  confidence: true,
  technicalDescription: true,
  thumbnailPath: true,
  clipPath: true,
  camera: { select: { id: true, name: true, location: true } },
  segment: {
    select: { recordingDay: { select: { id: true, date: true } } },
  },
} as const satisfies Prisma.EventSelect;

type EventListRow = Prisma.EventGetPayload<{ select: typeof eventListSelect }>;

export const toEventListItem = (event: EventListRow) => {
  const { thumbnailPath, clipPath, segment, ...rest } = event;
  return {
    ...rest,
    occurredAt: event.occurredAt ?? event.startedAt,
    durationSec: event.endedAt
      ? Math.round((event.endedAt.getTime() - event.startedAt.getTime()) / 1000)
      : null,
    hasThumbnail: thumbnailPath !== null,
    hasClip: clipPath !== null,
    recordingDay: segment?.recordingDay ?? null,
  };
};

// Date filters go through the event's segment, so events without one are
// excluded whenever `from`/`to` is set (documented in the API contract).
const buildListWhere = (filters: ListEventsFilters): Prisma.EventWhereInput => {
  const where: Prisma.EventWhereInput = {
    type: filters.type,
    cameraId: filters.cameraId,
    status: filters.status,
  };
  if (filters.from || filters.to) {
    where.segment = {
      recordingDay: { date: { gte: filters.from, lte: filters.to } },
    };
  }
  return where;
};

export const listEvents = async (filters: ListEventsFilters) => {
  const where = buildListWhere(filters);
  const [total, events] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      select: eventListSelect,
      // `startedAt === occurredAt` on automatic events, and unlike
      // `occurredAt` it is never null.
      orderBy: [{ startedAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return {
    items: events.map(toEventListItem),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
};

// "Why was this event generated" (US33): the detector label and area
// containment the event type relies on, plus the camera's *current* rule and
// areas of that type. Which area actually matched is not stored (containment
// is checked in Passo A, per detection), so every area of the type is listed.
export const getEventDetail = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      ...eventListSelect,
      cameraId: true,
      segment: {
        select: {
          id: true,
          startedAt: true,
          recordingDay: { select: { id: true, date: true } },
        },
      },
    },
  });
  if (!event) throw new AppError(404, "Event not found");

  const { cameraId, segment, ...listRow } = event;
  const requirements = EVENT_TYPE_REQUIREMENTS[event.type];

  const [rule, areas] = await Promise.all([
    prisma.rule.findUnique({
      where: { cameraId_eventType: { cameraId, eventType: event.type } },
      select: { timeLimitSeconds: true, active: true },
    }),
    requirements.areaType
      ? prisma.area.findMany({
          where: { cameraId, type: requirements.areaType },
          select: { id: true, type: true, polygon: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    ...toEventListItem({ ...listRow, segment }),
    detectionLabel: requirements.detectionLabel,
    containment: requirements.containment,
    rule,
    areas,
    segment: segment ? { id: segment.id, startedAt: segment.startedAt } : null,
    offsetSec: segment
      ? Math.max(
          0,
          Math.round(
            (event.startedAt.getTime() - segment.startedAt.getTime()) / 1000,
          ),
        )
      : null,
  };
};

export const updateEventStatus = async (
  eventId: string,
  status: EventStatus,
) => {
  const updated = await prisma.event.updateMany({
    where: { id: eventId },
    data: { status },
  });
  if (updated.count === 0) throw new AppError(404, "Event not found");

  return await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: eventSelect,
  });
};

export type EventMediaKind = "clip" | "thumbnail";

// Object key of an event's clip/thumbnail. 404 both when the event does not
// exist and when it has no media yet (not generated, expired by retention).
export const getEventMediaKey = async (
  eventId: string,
  kind: EventMediaKind,
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { clipPath: true, thumbnailPath: true },
  });
  if (!event) throw new AppError(404, "Event not found");

  const key = kind === "clip" ? event.clipPath : event.thumbnailPath;
  if (!key) throw new AppError(404, "Media not found");
  return key;
};

import { createHash } from "node:crypto";
import { computeCoverage } from "../lib/compute-coverage.ts";
import type { EventTypeValue } from "../lib/event-types.ts";
import { chat } from "../lib/ollama.ts";
import { prisma } from "../lib/prisma.ts";
import type { EventStatus } from "../../generated/prisma/client.ts";

// Same labels as `recording-day-finalization.service.ts` and the front's
// `lib/eventTypes.ts` (pt-BR names the síndico sees in the dashboard).
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

const STATUS_LABELS: Record<EventStatus, string> = {
  pending: "ainda pendente",
  inProgress: "em atendimento",
  resolved: "já resolvido",
  falsePositive: "descartado como falso positivo",
};

// Busy days are summarized by type counts; only this many events are listed
// one by one, keeping the prompt inside the model's context window.
const MAX_LISTED_EVENTS = 40;
const MAX_SUMMARY_CHARS = 4000;

const timeZone = () => process.env.SUMMARY_TIMEZONE || "America/Sao_Paulo";

const SYSTEM_PROMPT = [
  "Você é o assistente de monitoramento de um condomínio residencial.",
  "Escreva, em português do Brasil, o resumo do dia para o síndico a partir dos FATOS fornecidos.",
  "Regras:",
  "- Use somente os fatos fornecidos. Não invente eventos, horários, pessoas, placas, causas nem números.",
  "- Comece com uma frase geral sobre o dia; depois fale de cada tipo de evento, citando os horários.",
  "- O status de cada ocorrência (ainda pendente, em atendimento, já resolvido) está na mesma linha dela; nunca atribua o status de uma ocorrência a outra.",
  "- Não feche com uma lista de pendências: ela é anexada automaticamente depois do seu texto.",
  '- Refira-se ao dia como "neste dia" (o resumo é lido depois), nunca "hoje".',
  "- Use os horários exatamente como aparecem nos fatos (ex.: 08h15).",
  "- Tom objetivo e cordial, de 1 a 3 parágrafos curtos, sem títulos, listas, markdown ou emojis.",
  "- Só mencione confiança quando os fatos indicarem baixa confiança.",
].join("\n");

const loadDay = (recordingDayId: string) =>
  prisma.recordingDay.findUnique({
    where: { id: recordingDayId },
    select: {
      id: true,
      date: true,
      status: true,
      camera: { select: { name: true, location: true } },
      segments: {
        select: { id: true, startedAt: true, durationSec: true, status: true },
        orderBy: { startedAt: "asc" },
      },
    },
  });

type LoadedDay = NonNullable<Awaited<ReturnType<typeof loadDay>>>;

const loadEvents = (recordingDayId: string) =>
  prisma.event.findMany({
    where: { segment: { recordingDayId } },
    select: {
      type: true,
      status: true,
      startedAt: true,
      endedAt: true,
      occurredAt: true,
      confidence: true,
    },
    orderBy: [{ occurredAt: "asc" }, { startedAt: "asc" }],
  });

type LoadedEvent = Awaited<ReturnType<typeof loadEvents>>[number];

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: timeZone(),
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(":", "h");

// `RecordingDay.date` is a calendar date stored as UTC midnight.
const formatDay = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
};

// What the camera actually covered: processed time, failed segments and
// gaps between segments. Shown verbatim (not left to the model) so an
// incomplete day is always flagged, even if the model skips it.
const describeCoverage = (day: LoadedDay): string | null => {
  const failed = day.segments.filter((s) => s.status === "failed").length;
  const { issues } = computeCoverage(day.segments);
  const gaps = issues.filter((issue) => issue.type === "gap");

  const parts: string[] = [];
  if (failed > 0) {
    parts.push(
      `${failed} de ${day.segments.length} trecho(s) de gravação não puderam ser processados`,
    );
  }
  if (gaps.length > 0) {
    const missingSec = gaps.reduce((sum, gap) => sum + gap.seconds, 0);
    parts.push(
      `há ${gaps.length} intervalo(s) sem gravação enviada (cerca de ${formatDuration(missingSec)} no total)`,
    );
  }
  if (parts.length === 0) return null;
  return `Atenção: a análise deste dia está incompleta — ${parts.join(" e ")}. Eventos nesses períodos podem não aparecer acima.`;
};

// Open items, computed here: in tests the 3B model got the closing "what is
// still pending" sentence wrong in most runs, even with correct facts.
const describePending = (events: LoadedEvent[]): string | null => {
  const open = events.filter((e) => e.status !== "resolved");
  if (open.length === 0) return null;
  const items = open
    .slice(0, MAX_LISTED_EVENTS)
    .map(
      (e) =>
        `${EVENT_LABELS[e.type].toLowerCase()} às ${formatTime(eventTime(e))} (${STATUS_LABELS[e.status]})`,
    );
  const rest = open.length - items.length;
  if (rest > 0) items.push(`mais ${rest} ocorrência(s)`);
  return `Sem solução até a geração deste resumo: ${items.join("; ")}.`;
};

const coveredSeconds = (day: LoadedDay) =>
  day.segments
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + (s.durationSec ?? 0), 0);

const eventTime = (event: LoadedEvent) => event.occurredAt ?? event.startedAt;

// Plain-text fact sheet the model writes from. Everything numeric is computed
// here so the model never has to count or do date math. No personal data:
// only event type, time, duration and triage status.
export const buildFacts = (day: LoadedDay, events: LoadedEvent[]): string => {
  const lines: string[] = [];
  lines.push(`Câmera: ${day.camera.name} (${day.camera.location})`);
  lines.push(`Data: ${formatDay(day.date)}`);

  const completed = day.segments.filter((s) => s.status === "completed");
  if (completed.length > 0) {
    const first = completed[0]!.startedAt;
    const lastSegment = completed[completed.length - 1]!;
    const last = new Date(
      lastSegment.startedAt.getTime() + (lastSegment.durationSec ?? 0) * 1000,
    );
    lines.push(
      `Período analisado: das ${formatTime(first)} às ${formatTime(last)} (${formatDuration(coveredSeconds(day))} de gravação)`,
    );
  }

  lines.push(`Total de eventos: ${events.length}`);

  // Grouped by type, each event on one self-contained line (time, duration,
  // status together): small models mix up attributes between events when
  // they have to cross-reference a separate count table and timeline.
  const byType = new Map<EventTypeValue, LoadedEvent[]>();
  for (const event of events) {
    const list = byType.get(event.type) ?? [];
    list.push(event);
    byType.set(event.type, list);
  }

  let listed = 0;
  for (const [type, list] of byType) {
    const counts = (Object.keys(STATUS_LABELS) as EventStatus[])
      .map(
        (status) =>
          [status, list.filter((e) => e.status === status).length] as const,
      )
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${count} ${STATUS_LABELS[status]}`);
    lines.push("");
    lines.push(
      `${EVENT_LABELS[type]} — ${list.length} ocorrência(s) (${counts.join(", ")}):`,
    );

    for (const event of list) {
      if (listed >= MAX_LISTED_EVENTS) break;
      listed++;
      const start = eventTime(event);
      const parts: string[] = [];
      if (event.endedAt && event.endedAt > start) {
        const duration = formatDuration(
          (event.endedAt.getTime() - start.getTime()) / 1000,
        );
        parts.push(
          `das ${formatTime(start)} às ${formatTime(event.endedAt)} (${duration})`,
        );
      } else {
        parts.push(`às ${formatTime(start)}`);
      }
      if (event.confidence !== null && event.confidence < 0.6) {
        parts.push(
          `detecção com baixa confiança (${Math.round(event.confidence * 100)}%)`,
        );
      }
      parts.push(STATUS_LABELS[event.status]);
      lines.push(`- ${parts.join(", ")}`);
    }
  }
  if (events.length > listed) {
    lines.push("");
    lines.push(
      `(${events.length - listed} ocorrência(s) não detalhadas; use apenas as contagens por tipo)`,
    );
  }

  return lines.join("\n");
};

const emptyDayText = (day: LoadedDay) => {
  const covered = coveredSeconds(day);
  const period =
    covered > 0
      ? ` Foram analisados ${formatDuration(covered)} de gravação da câmera ${day.camera.name}`
      : ` Nenhum trecho de gravação da câmera ${day.camera.name} pôde ser analisado`;
  return `Dia tranquilo: nenhum evento foi registrado em ${formatDay(day.date)}.${period}.`;
};

// Only what a refinalization can change (segments and the event set). Triage
// status is left out on purpose: `PATCH /events/:id` does not trigger a new
// summary, so treating it as "stale" would leave the day without one.
const fingerprint = (day: LoadedDay, events: LoadedEvent[]) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        segments: day.segments.map((s) => [s.id, s.status, s.durationSec]),
        events: events.map((e) => [
          e.type,
          eventTime(e).getTime(),
          e.endedAt?.getTime() ?? null,
        ]),
      }),
    )
    .digest("hex");

const loadSnapshot = async (recordingDayId: string) => {
  const day = await loadDay(recordingDayId);
  if (!day) return null;
  return { day, events: await loadEvents(recordingDayId) };
};

// Contract 3.2 (docs/agentes/README.md): reads the day's events, asks the
// local model for a natural-language summary and upserts `DailySummary`.
// Called by the backend after `finalizeRecordingDay` on `completed`/`partial`,
// without `await`. Never rejects: an Ollama outage only logs, the day is
// unaffected, and the next refinalization tries again.
export const generateDailySummary = async (
  recordingDayId: string,
): Promise<void> => {
  try {
    const snapshot = await loadSnapshot(recordingDayId);
    if (!snapshot) return;
    const { day, events } = snapshot;
    if (day.status !== "completed" && day.status !== "partial") return;

    let text: string;
    if (events.length === 0) {
      text = emptyDayText(day);
    } else {
      const result = await chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `FATOS DO DIA:\n${buildFacts(day, events)}` },
      ]);
      text = result.text;
      const pending = describePending(events);
      if (pending) text = `${text}\n\n${pending}`;
    }

    const coverage = describeCoverage(day);
    if (coverage) text = `${text}\n\n${coverage}`;
    text = text.slice(0, MAX_SUMMARY_CHARS);

    // Generation can take minutes; if the day was refinalized meanwhile
    // (reprocess, rule change), a newer call is on its way and this
    // text is stale — drop it instead of overwriting the newer one.
    const current = await loadSnapshot(recordingDayId);
    if (
      !current ||
      fingerprint(current.day, current.events) !== fingerprint(day, events)
    ) {
      return;
    }

    await prisma.dailySummary.upsert({
      where: { recordingDayId },
      create: { recordingDayId, referenceDate: day.date, generatedText: text },
      update: { referenceDate: day.date, generatedText: text },
    });
  } catch (err) {
    console.error(
      `[daily-summary] failed for recording day ${recordingDayId}:`,
      err,
    );
  }
};

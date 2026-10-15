import { EVENT_TYPE_INFO } from "../lib/eventTypes";
import { formatDuration } from "../lib/format";
import type { DetectedEvent, EventType } from "../lib/types";
import { useEventMedia } from "../hooks/useEventMedia";
import { EventStatusBadge } from "./StatusBadge";

// Same tones as `EventTypeBadge`, as solid colors for the markers.
const MARKER_COLOR: Record<EventType, string> = {
  gateOpen: "#d97706",
  occupancy: "#2563eb",
  restrictedArea: "#dc2626",
  abandonedObject: "#64748b",
  illegalParking: "#ea580c",
  childRunning: "#7c3aed",
  petWaste: "#059669",
  other: "#94a3b8",
};

function hasThumbnail(event: DetectedEvent) {
  return event.thumbnailPath !== null;
}

function minutesOfDay(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Thumbnail({ event }: { event: DetectedEvent }) {
  const media = useEventMedia(event.id, "thumbnail", hasThumbnail(event));
  return (
    <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-center text-[11px] text-slate-400">
      {media.status === "ready" ? (
        <img src={media.url} alt="" className="h-full w-full object-cover" />
      ) : hasThumbnail(event) && media.status === "loading" ? (
        "Carregando…"
      ) : (
        "Sem imagem"
      )}
    </div>
  );
}

type Props = {
  events: DetectedEvent[];
  onOpen: (eventId: string) => void;
};

// Chronological view of the day's events (US20): a 24 h strip with one marker
// per event and, below, one row per event with its thumbnail.
function DayTimeline({ events, onOpen }: Props) {
  const timed = events
    .filter((event) => event.occurredAt !== null)
    .sort((a, b) => Date.parse(a.occurredAt!) - Date.parse(b.occurredAt!));

  if (timed.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="relative mx-2 h-8">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-slate-200" />
        {timed.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpen(event.id)}
            title={`${EVENT_TYPE_INFO[event.type].label} · ${clock(event.occurredAt!)}`}
            aria-label={`${EVENT_TYPE_INFO[event.type].label} às ${clock(event.occurredAt!)}`}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white shadow ring-1 ring-slate-300"
            style={{
              left: `${(minutesOfDay(event.occurredAt!) / 1440) * 100}%`,
              backgroundColor: MARKER_COLOR[event.type],
            }}
          />
        ))}
      </div>
      <div className="mx-2 mt-1 flex justify-between text-[11px] text-slate-400">
        {["00h", "06h", "12h", "18h", "24h"].map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>

      <ol className="mt-4 divide-y divide-slate-100">
        {timed.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onOpen(event.id)}
              className="flex w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="w-12 shrink-0 text-sm font-semibold text-slate-900">
                {clock(event.occurredAt!)}
              </span>
              <Thumbnail event={event} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  {EVENT_TYPE_INFO[event.type].label}
                </span>
                <span className="block text-xs text-slate-500">
                  {event.endedAt
                    ? `Duração ${formatDuration(
                        (Date.parse(event.endedAt) -
                          Date.parse(event.occurredAt!)) /
                          1000,
                      )}`
                    : "Sem duração"}
                  {event.clipPath !== null && " · com clipe"}
                </span>
              </span>
              <EventStatusBadge status={event.status} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default DayTimeline;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, X } from "lucide-react";
import { fetchEventDetail } from "../lib/dashboard-api";
import { AREA_TYPE_INFO, EVENT_TYPE_INFO } from "../lib/eventTypes";
import { explainEvent } from "../lib/explain-event";
import { formatDateTime, formatDuration } from "../lib/format";
import { describeError } from "../lib/messages";
import type { EventDetail } from "../lib/types";
import { useEventMedia } from "../hooks/useEventMedia";
import { EventStatusBadge } from "./StatusBadge";

type Props = { eventId: string; onClose: () => void };

type Loaded =
  | { id: string; detail: EventDetail }
  | { id: string; error: string };

// Areas are drawn on a plain 16:9 canvas in normalized coordinates: there is no
// reference image here (that endpoint is manager-only).
function AreasPreview({ areas }: { areas: EventDetail["areas"] }) {
  return (
    <svg
      viewBox="0 0 1 0.5625"
      role="img"
      aria-label="Áreas marcadas na câmera"
      className="w-full rounded-md border border-slate-200 bg-slate-100"
    >
      {areas.map((area) => {
        const color = AREA_TYPE_INFO[area.type].color;
        return (
          <polygon
            key={area.id}
            points={area.polygon.map((p) => `${p.x},${p.y * 0.5625}`).join(" ")}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={0.004}
          />
        );
      })}
    </svg>
  );
}

function Media({ detail }: { detail: EventDetail }) {
  const [playing, setPlaying] = useState(false);
  const thumb = useEventMedia(detail.id, "thumbnail", detail.hasThumbnail);
  const clip = useEventMedia(detail.id, "clip", playing);

  if (clip.status === "ready") {
    return (
      <video
        src={clip.url}
        controls
        autoPlay
        className="w-full rounded-md bg-black"
      />
    );
  }

  const poster = thumb.status === "ready" ? thumb.url : null;
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-slate-900">
      {poster && (
        <img src={poster} alt="Quadro do evento" className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 px-4 text-center text-sm text-white">
        {detail.hasClip ? (
          clip.status === "loading" ? (
            <span>Carregando clipe…</span>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              <Play className="h-4 w-4" />
              Assistir ao clipe
            </button>
          )
        ) : (
          <span>
            {poster
              ? "Clipe ainda não disponível."
              : "Mídia ainda não disponível. Ela é gerada depois que o dia é processado."}
          </span>
        )}
        {(clip.status === "missing" || clip.status === "error") && (
          <span className="text-xs text-amber-200">
            {clip.status === "missing"
              ? "O clipe não está mais disponível (retenção)."
              : "Não foi possível carregar o clipe."}
          </span>
        )}
      </div>
    </div>
  );
}

function EventDetailDialog({ eventId, onClose }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventDetail(eventId)
      .then((detail) => {
        if (!cancelled) setLoaded({ id: eventId, detail });
      })
      .catch((err) => {
        if (!cancelled)
          setLoaded({
            id: eventId,
            error: describeError(err, "Erro ao carregar o evento."),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = loaded?.id === eventId ? loaded : null;
  const detail = current && "detail" in current ? current.detail : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do evento"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-lg font-bold text-slate-900">
            {detail ? EVENT_TYPE_INFO[detail.type].label : "Detalhes do evento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!current && <p className="mt-4 text-sm text-slate-500">Carregando…</p>}
        {current && "error" in current && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {current.error}
          </p>
        )}

        {detail && (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <EventStatusBadge status={detail.status} />
              <span>{formatDateTime(detail.occurredAt)}</span>
              {detail.durationSec !== null && (
                <span>Duração: {formatDuration(detail.durationSec)}</span>
              )}
              <span>
                {detail.camera.name} · {detail.camera.location}
              </span>
            </div>

            <Media detail={detail} />

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Por que este evento foi gerado
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {explainEvent(detail).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {detail.areas.length > 0 && (
                <div className="mt-3 max-w-sm">
                  <AreasPreview areas={detail.areas} />
                  <p className="mt-1 text-xs text-slate-500">
                    Áreas «{AREA_TYPE_INFO[detail.areas[0].type].label}» da
                    câmera. O sistema não registra qual delas disparou o evento.
                  </p>
                </div>
              )}
            </section>

            {detail.recordingDay && (
              <Link
                to={`/recordings/${detail.recordingDay.id}`}
                className="inline-block text-sm font-semibold text-slate-900 underline"
              >
                Ver no lote
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventDetailDialog;

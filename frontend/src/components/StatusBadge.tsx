import type {
  EventStatus,
  RecordingDayStatus,
  SegmentStatus,
} from "../lib/types";

const PILL = "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const DAY_STATUS: Record<RecordingDayStatus, { label: string; tone: string }> =
  {
    pending: { label: "Pendente", tone: "bg-slate-100 text-slate-700" },
    processing: { label: "Processando", tone: "bg-amber-100 text-amber-800" },
    completed: { label: "Concluído", tone: "bg-emerald-100 text-emerald-800" },
    partial: { label: "Parcial", tone: "bg-orange-100 text-orange-800" },
    failed: { label: "Falhou", tone: "bg-red-100 text-red-700" },
  };

const SEGMENT_STATUS: Record<SegmentStatus, { label: string; tone: string }> = {
  received: { label: "Recebido", tone: "bg-slate-100 text-slate-700" },
  processing: { label: "Processando", tone: "bg-amber-100 text-amber-800" },
  completed: { label: "Concluído", tone: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Falhou", tone: "bg-red-100 text-red-700" },
};

const EVENT_STATUS: Record<EventStatus, { label: string; tone: string }> = {
  pending: { label: "Pendente", tone: "bg-slate-100 text-slate-700" },
  inProgress: { label: "Em andamento", tone: "bg-amber-100 text-amber-800" },
  resolved: { label: "Resolvido", tone: "bg-emerald-100 text-emerald-800" },
};

export function DayStatusBadge({ status }: { status: RecordingDayStatus }) {
  const { label, tone } = DAY_STATUS[status];
  return <span className={`${PILL} ${tone}`}>{label}</span>;
}

export function SegmentStatusBadge({ status }: { status: SegmentStatus }) {
  const { label, tone } = SEGMENT_STATUS[status];
  return <span className={`${PILL} ${tone}`}>{label}</span>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, tone } = EVENT_STATUS[status];
  return <span className={`${PILL} ${tone}`}>{label}</span>;
}

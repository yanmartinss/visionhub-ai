import type { SegmentProgressCounts } from "../lib/types";

const BARS = [
  { key: "completed", tone: "bg-emerald-500", label: "concluído(s)" },
  { key: "processing", tone: "bg-amber-400", label: "processando" },
  { key: "received", tone: "bg-slate-300", label: "na fila" },
  { key: "failed", tone: "bg-red-500", label: "com falha" },
] as const;

function SegmentProgress({ progress }: { progress: SegmentProgressCounts }) {
  if (progress.total === 0) {
    return <p className="text-xs text-slate-500">Nenhum segmento enviado</p>;
  }

  const summary = BARS.filter(({ key }) => progress[key] > 0)
    .map(({ key, label }) => `${progress[key]} ${label}`)
    .join(" · ");

  return (
    <div className="min-w-32">
      <div
        className="flex h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
        aria-label={`${progress.completed} de ${progress.total} segmentos concluídos`}
      >
        {BARS.map(({ key, tone }) =>
          progress[key] > 0 ? (
            <div
              key={key}
              className={tone}
              style={{ width: `${(progress[key] / progress.total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {progress.total} segmento{progress.total > 1 ? "s" : ""} · {summary}
      </p>
    </div>
  );
}

export default SegmentProgress;

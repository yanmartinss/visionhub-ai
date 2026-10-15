import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { fetchDaySummary } from "../lib/summary-api";
import type { DaySummary } from "../lib/types";

type State =
  | { id: string; kind: "ready"; summary: DaySummary | null }
  | { id: string; kind: "error" };

type Props = {
  recordingDayId: string;
  // Shown before the text, e.g. the camera name when listing several days.
  label?: string;
};

// Daily summary written by the local model. A missing summary is normal (the
// day may still be processing or the generation failed), so it is not an error.
function DaySummaryCard({ recordingDayId, label }: Props) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDaySummary(recordingDayId)
      .then((summary) => {
        if (!cancelled) setState({ id: recordingDayId, kind: "ready", summary });
      })
      .catch(() => {
        if (!cancelled) setState({ id: recordingDayId, kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [recordingDayId]);

  const current = state?.id === recordingDayId ? state : null;

  let body: string;
  if (!current) body = "Carregando resumo…";
  else if (current.kind === "error") body = "Não foi possível carregar o resumo.";
  else if (!current.summary) {
    body =
      "O resumo ainda não está disponível. Ele é gerado quando todas as gravações do dia terminam de processar.";
  } else body = current.summary.generatedText;

  const isText = current?.kind === "ready" && current.summary !== null;

  return (
    <div>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      )}
      <p
        className={
          isText
            ? "mt-1 whitespace-pre-line text-sm text-slate-700"
            : "mt-1 text-sm text-slate-500"
        }
      >
        {body}
      </p>
    </div>
  );
}

export function DaySummaryHeading() {
  return (
    <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900">
      <Sparkles className="h-4 w-4 text-slate-500" />
      Resumo do dia — IA
    </h2>
  );
}

export default DaySummaryCard;

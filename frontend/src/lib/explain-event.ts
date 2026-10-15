import { AREA_TYPE_INFO, EVENT_TYPE_INFO } from "./eventTypes";
import { formatDuration } from "./format";
import type { EventDetail } from "./types";

// Detector labels (contract 3.1 in docs/agentes/README.md) in plain language.
const LABEL_TEXT: Record<string, string> = {
  gate_open: "um portão aberto",
  person: "uma pessoa",
  object: "um objeto",
  car: "um carro",
  child_running: "uma criança correndo",
  pet_waste: "um dejeto de animal",
};

// "Why was this event generated?" as short sentences (US33), built only from
// what the API knows. The rule is the camera's current one, so it is flagged
// when it may differ from the one that fired.
export function explainEvent(detail: EventDetail): string[] {
  const lines: string[] = [];
  const info = EVENT_TYPE_INFO[detail.type];

  if (detail.detectionLabel) {
    lines.push(
      `O detector identificou ${LABEL_TEXT[detail.detectionLabel] ?? `"${detail.detectionLabel}"`}${
        detail.confidence !== null
          ? ` com ${Math.round(detail.confidence * 100)}% de confiança`
          : ""
      }.`,
    );
  }

  const area = info.areaType ? AREA_TYPE_INFO[info.areaType].label : null;
  if (detail.containment === "inside" && area) {
    lines.push(`A detecção estava dentro de uma área «${area}».`);
  } else if (detail.containment === "outside" && area) {
    lines.push(`A detecção estava fora de todas as áreas «${area}».`);
  } else if (detail.containment === null && info.areaType === null) {
    lines.push("Este tipo de evento considera a câmera inteira, sem área.");
  }

  if (detail.rule === null) {
    lines.push(
      "Esta câmera não tem mais uma regra para este tipo: o evento some na próxima atualização do dia.",
    );
  } else {
    if (detail.rule.timeLimitSeconds !== null) {
      const limit = formatDuration(detail.rule.timeLimitSeconds);
      const lasted =
        detail.durationSec !== null
          ? ` Ele durou ${formatDuration(detail.durationSec)}.`
          : "";
      lines.push(`A regra atual avisa após mais de ${limit}.${lasted}`);
    } else {
      lines.push("A regra atual avisa assim que a situação é detectada.");
    }
    if (!detail.rule.active) lines.push("Atenção: essa regra está desativada.");
  }

  return lines;
}

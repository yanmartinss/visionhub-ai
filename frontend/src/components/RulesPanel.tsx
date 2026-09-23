import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  EVENT_TYPES,
  EVENT_TYPE_INFO,
  AREA_TYPE_INFO,
} from "../lib/eventTypes";
import type { Area, EventType, Rule } from "../lib/types";

type Props = {
  rules: Rule[];
  areas: Area[];
  disabled?: boolean;
  onSave: (
    eventType: EventType,
    data: { timeLimitSeconds?: number; active: boolean },
  ) => Promise<void>;
};

function RuleRow({
  eventType,
  rule,
  hasMatchingArea,
  disabled,
  onSave,
}: {
  eventType: EventType;
  rule: Rule | undefined;
  hasMatchingArea: boolean;
  disabled?: boolean;
  onSave: Props["onSave"];
}) {
  const info = EVENT_TYPE_INFO[eventType];
  const [minutes, setMinutes] = useState(
    rule?.timeLimitSeconds
      ? String(Math.round(rule.timeLimitSeconds / 60))
      : "",
  );
  const [active, setActive] = useState(rule?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setNotice(null);
    if (info.requiresTimeLimit) {
      const parsed = Number(minutes);
      if (!minutes || !Number.isFinite(parsed) || parsed <= 0) {
        setError("Informe um número de minutos maior que zero.");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(eventType, {
        timeLimitSeconds: info.requiresTimeLimit
          ? Math.round(Number(minutes) * 60)
          : undefined,
        active,
      });
      setNotice("Salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-event-type={eventType}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{info.label}</p>
          <p className="text-xs text-slate-500">{info.description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            rule
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {rule ? "Configurada" : "Não configurada"}
        </span>
      </div>

      {info.areaType && !hasMatchingArea && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Marque uma área do tipo "{AREA_TYPE_INFO[info.areaType].label}" para
          esta regra funcionar.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {info.requiresTimeLimit && (
          <div>
            <label
              htmlFor={`minutes-${eventType}`}
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Minutos
            </label>
            <input
              id={`minutes-${eventType}`}
              type="number"
              min={1}
              step={1}
              value={minutes}
              disabled={disabled || saving}
              onChange={(event) => setMinutes(event.target.value)}
              className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none disabled:opacity-60"
            />
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-1.5 pb-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={active}
            disabled={disabled || saving}
            onChange={(event) => setActive(event.target.checked)}
          />
          Ativa
        </label>

        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => void handleSave()}
          className="cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}

function RulesPanel({ rules, areas, disabled, onSave }: Props) {
  return (
    <div className="space-y-3">
      {EVENT_TYPES.map((eventType) => {
        const info = EVENT_TYPE_INFO[eventType];
        const rule = rules.find((r) => r.eventType === eventType);
        const hasMatchingArea = info.areaType
          ? areas.some((area) => area.type === info.areaType)
          : true;
        return (
          <RuleRow
            key={eventType}
            eventType={eventType}
            rule={rule}
            hasMatchingArea={hasMatchingArea}
            disabled={disabled}
            onSave={onSave}
          />
        );
      })}
    </div>
  );
}

export default RulesPanel;

import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AREA_TYPE_INFO,
  EVENT_TYPE_INFO,
  WIZARD_EVENT_TYPES,
  describeRule,
} from "../lib/eventTypes";
import type { Area, EventType, Rule } from "../lib/types";

type Props = {
  rules: Rule[];
  areas: Area[];
  busyType: EventType | null;
  onToggle: (rule: Rule) => void;
  onEdit: (type: EventType) => void;
  onDelete: (rule: Rule) => void;
};

function MonitoringList({
  rules,
  areas,
  busyType,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const configured = rules.filter((rule) =>
    WIZARD_EVENT_TYPES.includes(rule.eventType),
  );

  if (configured.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Esta câmera ainda não monitora nada. Clique em “Adicionar monitoramento”
        para escolher o que ela deve avisar.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {configured.map((rule) => {
        const info = EVENT_TYPE_INFO[rule.eventType];
        const missingArea =
          info.areaType !== null &&
          !areas.some((area) => area.type === info.areaType);
        return (
          <li
            key={rule.id}
            data-event-type={rule.eventType}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{info.label}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {describeRule(rule.eventType, rule.timeLimitSeconds)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    rule.active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {rule.active ? "Ativo" : "Desativado"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.active}
                  aria-label={`${rule.active ? "Desativar" : "Ativar"} ${info.label}`}
                  disabled={busyType === rule.eventType}
                  onClick={() => onToggle(rule)}
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition disabled:opacity-60 ${
                    rule.active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      rule.active ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(rule.eventType)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${info.label}`}
                  disabled={busyType === rule.eventType}
                  onClick={() => onDelete(rule)}
                  className="cursor-pointer rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {missingArea && info.areaType && (
              <p className="mt-3 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Falta marcar a área “{AREA_TYPE_INFO[info.areaType].label}”.
                Clique em Editar para marcá-la.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default MonitoringList;

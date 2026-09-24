import { useState } from "react";
import { Upload, X } from "lucide-react";
import {
  AREA_TYPE_INFO,
  EVENT_TYPE_INFO,
  RULE_COPY,
  WIZARD_EVENT_TYPES,
  describeRule,
} from "../lib/eventTypes";
import type { Area, AreaPoint, AreaType, EventType, Rule } from "../lib/types";
import PolygonEditor from "./PolygonEditor";

type StepKey = "type" | "area" | "time" | "review";

const STEP_LABEL: Record<StepKey, string> = {
  type: "O que monitorar",
  area: "Onde",
  time: "Tempo",
  review: "Revisão",
};

type Props = {
  // Set when editing an existing rule: the type is fixed and step 1 is skipped.
  editingType: EventType | null;
  rules: Rule[];
  areas: Area[];
  hasImage: boolean;
  imageUrl: string | null;
  onUploadImage: (file: File) => Promise<void>;
  onCreateArea: (type: AreaType, polygon: AreaPoint[]) => Promise<void>;
  onDeleteArea: (areaId: string) => Promise<void>;
  onSave: (
    type: EventType,
    data: { timeLimitSeconds?: number; active: boolean },
  ) => Promise<void>;
  onClose: () => void;
};

// Steps that apply to a type: only the ones the type actually needs.
function stepsFor(type: EventType | null, editing: boolean): StepKey[] {
  const steps: StepKey[] = [];
  if (!editing) steps.push("type");
  if (type) {
    const info = EVENT_TYPE_INFO[type];
    if (info.areaType) steps.push("area");
    if (info.requiresTimeLimit) steps.push("time");
  }
  steps.push("review");
  return steps;
}

function RuleWizard({
  editingType,
  rules,
  areas,
  hasImage,
  imageUrl,
  onUploadImage,
  onCreateArea,
  onDeleteArea,
  onSave,
  onClose,
}: Props) {
  const editing = editingType !== null;
  const existing = editingType
    ? rules.find((rule) => rule.eventType === editingType)
    : undefined;

  const [type, setType] = useState<EventType | null>(editingType);
  const [step, setStep] = useState<StepKey>(
    () => stepsFor(editingType, editing)[0]!,
  );
  const [minutes, setMinutes] = useState(
    existing?.timeLimitSeconds
      ? String(Math.round(existing.timeLimitSeconds / 60))
      : "",
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const steps = stepsFor(type, editing);
  const stepIndex = steps.indexOf(step);
  const info = type ? EVENT_TYPE_INFO[type] : null;
  const areasOfType = info?.areaType
    ? areas.filter((area) => area.type === info.areaType)
    : [];

  const configuredTypes = new Set(rules.map((rule) => rule.eventType));
  const availableTypes = WIZARD_EVENT_TYPES.filter(
    (candidate) => !configuredTypes.has(candidate),
  );

  const minutesNumber = Number(minutes);
  const minutesValid =
    Number.isInteger(minutesNumber) && minutesNumber > 0 && minutes !== "";

  function goNext() {
    setError(null);
    if (step === "type" && !type) {
      setError("Escolha o que a câmera deve monitorar.");
      return;
    }
    if (step === "time" && !minutesValid) {
      setError("Informe um número inteiro de minutos maior que zero.");
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    setError(null);
    const previous = steps[stepIndex - 1];
    if (previous) setStep(previous);
  }

  async function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUploadImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a imagem.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleFinish() {
    if (!type) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(type, {
        timeLimitSeconds: info?.requiresTimeLimit
          ? minutesNumber * 60
          : undefined,
        active,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  }

  const sentence = type
    ? describeRule(
        type,
        info?.requiresTimeLimit && minutesValid ? minutesNumber * 60 : null,
      )
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
      <div
        role="dialog"
        aria-label="Adicionar monitoramento"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">
              {editing && info
                ? `Editar: ${info.label}`
                : "Adicionar monitoramento"}
            </h2>
            {type && (
              <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {steps.map((key, index) => (
                  <li
                    key={key}
                    className={`flex items-center gap-1 ${
                      key === step
                        ? "font-bold text-slate-900"
                        : index < stepIndex
                          ? "text-emerald-700"
                          : "text-slate-400"
                    }`}
                  >
                    <span>
                      {index + 1}. {STEP_LABEL[key]}
                    </span>
                    {index < steps.length - 1 && <span>›</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {step === "type" && (
            <div>
              <p className="text-sm text-slate-600">
                O que esta câmera deve avisar?
              </p>
              {availableTypes.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Todos os tipos já estão configurados. Use “Editar” na lista.
                </p>
              ) : (
                <div role="radiogroup" className="mt-3 space-y-2">
                  {availableTypes.map((candidate) => {
                    const candidateInfo = EVENT_TYPE_INFO[candidate];
                    const selected = type === candidate;
                    return (
                      <label
                        key={candidate}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          selected
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="event-type"
                          value={candidate}
                          checked={selected}
                          onChange={() => {
                            setType(candidate);
                            setError(null);
                          }}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">
                            {candidateInfo.label}
                          </span>
                          <span className="block text-sm text-slate-600">
                            {RULE_COPY[candidate].plain}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {candidateInfo.areaType && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                usa uma área
                              </span>
                            )}
                            {candidateInfo.requiresTimeLimit && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                usa um tempo
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === "area" && type && info?.areaType && (
            <div>
              <p className="text-sm text-slate-700">
                {RULE_COPY[type].areaHint}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tipo de área: {AREA_TYPE_INFO[info.areaType].label}. Clique na
                imagem para marcar os pontos e depois em “Finalizar área”.
              </p>

              <div className="mt-3">
                {!hasImage ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-sm text-slate-600">
                      Primeiro envie uma foto desta câmera para desenhar por
                      cima. Pode ser uma captura de tela da imagem da câmera.
                    </p>
                    <input
                      id="wizard-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => void handleImage(event)}
                    />
                    <label
                      htmlFor="wizard-image-input"
                      className={`mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 ${uploading ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Enviando…" : "Enviar imagem"}
                    </label>
                  </div>
                ) : !imageUrl ? (
                  <p className="text-sm text-slate-500">Carregando imagem…</p>
                ) : (
                  <PolygonEditor
                    imageUrl={imageUrl}
                    areas={areasOfType}
                    fixedType={info.areaType}
                    onCreate={onCreateArea}
                    onDelete={onDeleteArea}
                  />
                )}
              </div>

              {hasImage && areasOfType.length === 0 && (
                <p className="mt-3 text-xs text-amber-700">
                  Marque pelo menos uma área para continuar.
                </p>
              )}
            </div>
          )}

          {step === "time" && type && (
            <div>
              <label
                htmlFor="wizard-minutes"
                className="text-sm font-semibold text-slate-800"
              >
                Por quanto tempo? (em minutos)
              </label>
              <p className="mt-1 text-xs text-slate-500">
                A câmera só avisa depois desse tempo seguido.
              </p>
              <input
                id="wizard-minutes"
                type="number"
                min={1}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="mt-2 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {sentence}
              </p>
            </div>
          )}

          {step === "review" && type && (
            <div>
              <p className="text-sm text-slate-600">Confira e conclua:</p>
              <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900">
                {sentence}
              </p>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                Ativar agora
              </label>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-between gap-2">
          <div>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            {step === "review" ? (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={saving || !type}
                className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Concluir"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === "type" && !type) ||
                  (step === "area" && areasOfType.length === 0)
                }
                className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RuleWizard;

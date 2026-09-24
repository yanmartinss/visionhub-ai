import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { AREA_TYPES, AREA_TYPE_INFO } from "../lib/eventTypes";
import type { Area, AreaPoint, AreaType } from "../lib/types";

type Props = {
  imageUrl: string | null;
  areas: Area[];
  disabled?: boolean;
  // When set, new areas are always of this type and the type selector is hidden.
  fixedType?: AreaType;
  onCreate: (type: AreaType, polygon: AreaPoint[]) => Promise<void>;
  onDelete: (areaId: string) => Promise<void>;
};

const toPolylinePoints = (polygon: AreaPoint[]) =>
  polygon.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");

function PolygonEditor({
  imageUrl,
  areas,
  disabled,
  fixedType,
  onCreate,
  onDelete,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [chosenType, setDrawType] = useState<AreaType>("restricted");
  const drawType = fixedType ?? chosenType;
  const [points, setPoints] = useState<AreaPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drawing = points.length > 0;

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (disabled || saving || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.min(
      1,
      Math.max(0, (event.clientY - rect.top) / rect.height),
    );
    setPoints((prev) => [...prev, { x, y }]);
  }

  function cancelDrawing() {
    setPoints([]);
    setError(null);
  }

  async function finishDrawing() {
    if (points.length < 3) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(drawType, points);
      setPoints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a área.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(areaId: string) {
    setBusyId(areaId);
    setError(null);
    try {
      await onDelete(areaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover a área.");
    } finally {
      setBusyId(null);
    }
  }

  if (!imageUrl) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Envie uma imagem de referência para poder marcar áreas.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!fixedType && (
          <select
            aria-label="Tipo da nova área"
            value={drawType}
            onChange={(event) => setDrawType(event.target.value as AreaType)}
            disabled={disabled || drawing}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:opacity-60"
          >
            {AREA_TYPES.map((type) => (
              <option key={type} value={type}>
                {AREA_TYPE_INFO[type].label}
              </option>
            ))}
          </select>
        )}
        {drawing ? (
          <>
            <span className="text-xs text-slate-500">
              {points.length} ponto{points.length > 1 ? "s" : ""} marcado
              {points.length > 1 ? "s" : ""} (mínimo 3)
            </span>
            <button
              type="button"
              disabled={points.length < 3 || saving}
              onClick={() => void finishDrawing()}
              className="cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Finalizar área"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelDrawing}
              className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </>
        ) : (
          !disabled && (
            <span className="text-xs text-slate-500">
              Clique na imagem para começar a marcar os pontos da área.
            </span>
          )
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div
        ref={wrapperRef}
        onClick={handleClick}
        className="relative mt-3 inline-block w-full select-none overflow-hidden rounded-lg border border-slate-200"
        style={{ cursor: disabled ? "default" : "crosshair" }}
      >
        <img
          src={imageUrl}
          alt="Referência da câmera"
          className="block h-auto w-full"
          draggable={false}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {areas.map((area) => (
            <polygon
              key={area.id}
              points={toPolylinePoints(area.polygon)}
              fill={AREA_TYPE_INFO[area.type].color}
              fillOpacity={0.25}
              stroke={AREA_TYPE_INFO[area.type].color}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {points.length > 0 && (
            <polygon
              points={toPolylinePoints(points)}
              fill={AREA_TYPE_INFO[drawType].color}
              fillOpacity={0.15}
              stroke={AREA_TYPE_INFO[drawType].color}
              strokeDasharray="2,1"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x * 100}
              cy={point.y * 100}
              r={0.8}
              fill={AREA_TYPE_INFO[drawType].color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {areas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {areas.map((area) => (
            <li
              key={area.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: AREA_TYPE_INFO[area.type].color }}
                />
                {AREA_TYPE_INFO[area.type].label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  disabled={busyId === area.id}
                  onClick={() => void remove(area.id)}
                  aria-label={`Remover área ${AREA_TYPE_INFO[area.type].label}`}
                  className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PolygonEditor;

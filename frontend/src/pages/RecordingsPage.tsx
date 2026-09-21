import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { apiFetch } from "../lib/api";
import { formatDay, formatTime } from "../lib/format";
import { describeError } from "../lib/messages";
import type {
  CameraOption,
  RecordingDayStatus,
  RecordingDayWithProgress,
} from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { usePolling } from "../hooks/usePolling";
import { DayStatusBadge } from "../components/StatusBadge";
import SegmentProgress from "../components/SegmentProgress";
import NewRecordingDialog from "../components/NewRecordingDialog";

const STATUS_OPTIONS: { value: RecordingDayStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "processing", label: "Processando" },
  { value: "completed", label: "Concluído" },
  { value: "partial", label: "Parcial" },
  { value: "failed", label: "Falhou" },
];

const FILTER_INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

// Worth refreshing while the worker may still change it (an empty pending
// batch is just waiting for uploads, so it is not polled).
function isActive(day: RecordingDayWithProgress) {
  return (
    day.status === "processing" ||
    (day.status === "pending" && day.progress.total > 0)
  );
}

function RecordingsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "manager" || user?.role === "admin";

  const [days, setDays] = useState<RecordingDayWithProgress[]>([]);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);

  const [cameraId, setCameraId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (cameraId) params.set("cameraId", cameraId);
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    return `/recording-days${params.size > 0 ? `?${params}` : ""}`;
  }, [cameraId, date, status]);

  const showDays = useCallback((data: RecordingDayWithProgress[]) => {
    setDays(data);
    setError(null);
    setUpdatedAt(new Date());
  }, []);
  const showError = useCallback((err: unknown) => {
    setError(describeError(err, "Erro ao carregar as gravações."));
  }, []);

  // Initial load and reload when a filter changes. State is only set inside the
  // promise callbacks; `changeFilter` turns the spinner on.
  useEffect(() => {
    let cancelled = false;
    apiFetch<RecordingDayWithProgress[]>(path)
      .then((data) => {
        if (!cancelled) showDays(data);
      })
      .catch((err) => {
        if (!cancelled) showError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, showDays, showError]);

  const refresh = useCallback(
    () =>
      apiFetch<RecordingDayWithProgress[]>(path).then(showDays).catch(showError),
    [path, showDays, showError],
  );

  // `GET /cameras` is manager-only, so employees only get date/status filters.
  useEffect(() => {
    if (!canManage) return;
    apiFetch<CameraOption[]>("/cameras")
      .then(setCameras)
      .catch(() => setCameras([]));
  }, [canManage]);

  usePolling(refresh, 8000, days.some(isActive));

  const hasFilters = Boolean(cameraId || date || status);

  function changeFilter(update: () => void) {
    update();
    setLoading(true);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Gravações
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Um lote por câmera e dia, formado pelos arquivos enviados.
            {updatedAt && ` Atualizado às ${formatTime(updatedAt)}.`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova gravação
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {canManage && (
          <select
            aria-label="Filtrar por câmera"
            value={cameraId}
            onChange={(event) =>
              changeFilter(() => setCameraId(event.target.value))
            }
            className={FILTER_INPUT}
          >
            <option value="">Todas as câmeras</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.name}
              </option>
            ))}
          </select>
        )}
        <input
          aria-label="Filtrar por dia"
          type="date"
          value={date}
          onChange={(event) =>
            changeFilter(() => setDate(event.target.value))
          }
          className={FILTER_INPUT}
        />
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) =>
            changeFilter(() => setStatus(event.target.value))
          }
          className={FILTER_INPUT}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() =>
              changeFilter(() => {
                setCameraId("");
                setDate("");
                setStatus("");
              })
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {hasFilters
            ? "Nenhum lote encontrado com esses filtros."
            : canManage
              ? "Nenhuma gravação ainda. Clique em “Nova gravação” para enviar a primeira."
              : "Nenhuma gravação enviada ainda."}
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Dia</th>
                <th className="px-4 py-3">Câmera</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progresso</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr
                  key={day.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatDay(day.date)}
                  </td>
                  <td className="px-4 py-3">{day.camera.name}</td>
                  <td className="px-4 py-3">
                    <DayStatusBadge status={day.status} />
                  </td>
                  <td className="px-4 py-3">
                    <SegmentProgress progress={day.progress} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/recordings/${day.id}`}
                      className="text-sm font-semibold text-slate-900 underline"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <NewRecordingDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

export default RecordingsPage;

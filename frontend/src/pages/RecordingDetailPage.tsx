import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Link as LinkIcon, RefreshCw, Upload } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { formatDateTime, formatDay, formatTime } from "../lib/format";
import { describeError, describeSegmentError } from "../lib/messages";
import type { RecordingDayDetail, Segment } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { usePolling } from "../hooks/usePolling";
import { DayStatusBadge, SegmentStatusBadge } from "../components/StatusBadge";
import SegmentProgress from "../components/SegmentProgress";
import AddSegmentForm from "../components/AddSegmentForm";

function isInFlight(segment: Segment) {
  return segment.status === "received" || segment.status === "processing";
}

function RecordingDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const canManage = user?.role === "manager" || user?.role === "admin";

  const [day, setDay] = useState<RecordingDayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const showDay = useCallback((data: RecordingDayDetail) => {
    setDay(data);
    setError(null);
    setUpdatedAt(new Date());
  }, []);
  const showError = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      setNotFound(true);
    } else {
      setError(describeError(err, "Erro ao carregar o lote."));
    }
  }, []);

  // State is only set inside the promise callbacks (not synchronously).
  useEffect(() => {
    let cancelled = false;
    apiFetch<RecordingDayDetail>(`/recording-days/${id}`)
      .then((data) => {
        if (!cancelled) showDay(data);
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
  }, [id, showDay, showError]);

  const refresh = useCallback(
    () =>
      apiFetch<RecordingDayDetail>(`/recording-days/${id}`)
        .then(showDay)
        .catch(showError),
    [id, showDay, showError],
  );

  usePolling(refresh, 5000, Boolean(day?.segments.some(isInFlight)));

  async function reprocess(segmentId: string) {
    setBusyId(segmentId);
    setError(null);
    try {
      await apiFetch(`/segments/${segmentId}/reprocess`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(describeError(err, "Erro ao reprocessar o segmento."));
    } finally {
      setBusyId(null);
    }
  }

  function errorText(segment: Segment) {
    if (!segment.error) return null;
    return (
      <span
        className={
          segment.status === "failed"
            ? "text-xs text-red-700 sm:text-sm"
            : "text-xs text-slate-500 sm:text-sm"
        }
      >
        {describeSegmentError(segment.error)}
      </span>
    );
  }

  function reprocessButton(segment: Segment) {
    if (!canManage || segment.status !== "failed") return null;
    return (
      <button
        disabled={busyId === segment.id}
        onClick={() => void reprocess(segment.id)}
        className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {busyId === segment.id ? "Enviando…" : "Reprocessar"}
      </button>
    );
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;

  if (notFound || !day) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link
          to="/recordings"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Gravações
        </Link>
        <p className="mt-6 text-sm text-slate-600">
          {error ?? "Lote não encontrado."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/recordings"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Gravações
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            {formatDay(day.date)} · {day.camera.name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <DayStatusBadge status={day.status} />
            {updatedAt && (
              <span className="text-xs text-slate-500">
                Atualizado às {formatTime(updatedAt)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      <div className="mt-4 max-w-md">
        <SegmentProgress progress={day.progress} />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <h2 className="mt-8 font-serif text-lg font-bold text-slate-900">
        Segmentos
      </h2>
      {day.segments.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          {canManage
            ? "Nenhum segmento ainda. Envie um arquivo ou cole um link abaixo."
            : "Nenhum segmento enviado ainda."}
        </p>
      ) : (
        <div className="relative mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 sm:table-cell">Tentativas</th>
                <th className="hidden px-4 py-3 sm:table-cell">Detalhe</th>
                {canManage && (
                  <th className="hidden px-4 py-3 sm:table-cell">
                    <span className="sr-only">Ações</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {day.segments.map((segment) => (
                <tr
                  key={segment.id}
                  className="border-b border-slate-100 align-top last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDateTime(segment.startedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      {segment.sourceType === "upload" ? (
                        <Upload className="h-3.5 w-3.5" />
                      ) : (
                        <LinkIcon className="h-3.5 w-3.5" />
                      )}
                      {segment.sourceType === "upload" ? "Arquivo" : "Link"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SegmentStatusBadge status={segment.status} />
                    {/* Small screens: the columns below are hidden, so their content lives here. */}
                    <div className="mt-2 space-y-2 sm:hidden">
                      <p className="text-xs text-slate-500">
                        Tentativas: {segment.attempts}
                      </p>
                      {errorText(segment)}
                      {reprocessButton(segment)}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {segment.attempts}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {errorText(segment)}
                  </td>
                  {canManage && (
                    <td className="hidden px-4 py-3 text-right sm:table-cell">
                      {reprocessButton(segment)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <div className="mt-8 max-w-xl">
          <AddSegmentForm
            recordingDayId={day.id}
            dayDate={day.date}
            onAdded={() => void refresh()}
          />
        </div>
      )}
    </div>
  );
}

// `key` resets the state when navigating between two batches.
function RecordingDetailPage() {
  const { id } = useParams();
  return id ? <RecordingDetail key={id} id={id} /> : null;
}

export default RecordingDetailPage;

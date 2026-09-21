import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { todayLocalDate } from "../lib/format";
import { describeError } from "../lib/messages";
import type { CameraOption, RecordingDay } from "../lib/types";

function NewRecordingDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraId, setCameraId] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<CameraOption[]>("/cameras")
      .then((data) => {
        if (cancelled) return;
        const active = data.filter((camera) => camera.active);
        setCameras(active);
        setCameraId(active[0]?.id ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err, "Erro ao carregar câmeras."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!cameraId || !date) {
      setError("Escolha uma câmera e uma data.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Creates the batch, or returns the existing one for this camera and day.
      const recordingDay = await apiFetch<RecordingDay>("/recording-days", {
        method: "POST",
        body: { cameraId, date },
      });
      navigate(`/recordings/${recordingDay.id}`);
    } catch (err) {
      setError(describeError(err, "Erro ao criar o lote."));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={() => !submitting && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-serif text-lg font-bold text-slate-900">
          Nova gravação
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha a câmera e o dia. Se o lote já existir, ele será aberto.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando câmeras…</p>
        ) : cameras.length === 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Nenhuma câmera ativa. Cadastre ou reative uma câmera primeiro.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <label
                htmlFor="recording-camera"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Câmera
              </label>
              <select
                id="recording-camera"
                value={cameraId}
                onChange={(event) => setCameraId(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label
                htmlFor="recording-date"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Dia da gravação
              </label>
              <input
                id="recording-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || loading || cameras.length === 0}
            className="flex-1 cursor-pointer rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Abrindo…" : "Continuar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewRecordingDialog;

import { useRef, useState } from "react";
import { Link as LinkIcon, Upload } from "lucide-react";
import { ApiError, apiRequest, apiUpload } from "../lib/api";
import { dayToInputDate, formatBytes, toApiDateTime } from "../lib/format";
import { inferStartedAt } from "../lib/infer-started-at";
import { describeError } from "../lib/messages";
import type { Segment } from "../lib/types";

type Mode = "upload" | "link";

type Props = {
  recordingDayId: string;
  // The batch's calendar day (as sent by the API); pre-fills the start time.
  dayDate: string;
  onAdded: () => void;
};

const FIELD_LABEL = "text-xs font-bold uppercase tracking-wide text-slate-700";
const FIELD_INPUT =
  "mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

function AddSegmentForm({ recordingDayId, dayDate, onAdded }: Props) {
  const [mode, setMode] = useState<Mode>("upload");
  const [startedAt, setStartedAt] = useState(
    `${dayToInputDate(dayDate)}T00:00`,
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [startedAtHint, setStartedAtHint] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function validStartedAt(): boolean {
    if (!startedAt || Number.isNaN(new Date(startedAt).getTime())) {
      setError("Informe o horário de início da gravação.");
      return false;
    }
    return true;
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    if (!validStartedAt()) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const form = new FormData();
    form.append("startedAt", toApiDateTime(startedAt));
    form.append("file", file);

    setBusy(true);
    setProgress(0);
    try {
      const { status } = await apiUpload<Segment>(
        `/recording-days/${recordingDayId}/segments/upload`,
        form,
        { onProgress: setProgress, signal: controller.signal },
      );
      setNotice(
        status === 200
          ? "Este arquivo já foi enviado neste lote."
          : "Arquivo enviado. O processamento começa automaticamente.",
      );
      setFile(null);
      setFileKey((key) => key + 1);
      setStartedAtHint(null);
      onAdded();
    } catch (err) {
      if (controller.signal.aborted) {
        setNotice("Envio cancelado.");
      } else {
        setError(describeError(err, "Erro ao enviar o arquivo."));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  async function handleLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!url.trim()) {
      setError("Cole o link da gravação.");
      return;
    }
    if (!validStartedAt()) return;

    setBusy(true);
    try {
      const { status } = await apiRequest<Segment>(
        `/recording-days/${recordingDayId}/segments/link`,
        {
          method: "POST",
          body: { url: url.trim(), startedAt: toApiDateTime(startedAt) },
        },
      );
      setNotice(
        status === 200
          ? "Este link já foi enviado neste lote."
          : "Link recebido. O download começa automaticamente.",
      );
      setUrl("");
      onAdded();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? describeError(err, "Erro ao enviar o link.")
          : "Erro ao enviar o link.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setStartedAtHint(null);
    if (!selected) return;

    const inferred = inferStartedAt(selected.name);
    if (!inferred) return;

    const sameDay = inferred.date === dayToInputDate(dayDate);
    setStartedAt(`${inferred.date}T${inferred.time}`);
    setStartedAtHint(
      sameDay
        ? "Sugerido a partir do nome do arquivo — confira."
        : `Sugerido a partir do nome do arquivo (${inferred.date}), que é um dia diferente do lote — confira.`,
    );
  }

  function switchMode(next: Mode) {
    if (busy) return;
    setMode(next);
    setError(null);
    setNotice(null);
  }

  const uploadingDone = busy && progress >= 1;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-slate-900">
        Adicionar gravação
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Cada arquivo é um segmento do dia (DVRs costumam exportar pedaços de 15
        min a 1 h). Informe a hora em que aquela gravação começa.
      </p>

      <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
        {(
          [
            ["upload", "Enviar arquivo", Upload],
            ["link", "Colar link", LinkIcon],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              mode === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={mode === "upload" ? handleUpload : handleLink}
        className="mt-4 space-y-4"
      >
        <div>
          <label htmlFor="segment-started-at" className={FIELD_LABEL}>
            Horário de início da gravação
          </label>
          <input
            id="segment-started-at"
            type="datetime-local"
            value={startedAt}
            onChange={(event) => {
              setStartedAt(event.target.value);
              setStartedAtHint(null);
            }}
            disabled={busy}
            className={FIELD_INPUT}
          />
          {startedAtHint && (
            <p className="mt-1.5 text-xs text-amber-700">{startedAtHint}</p>
          )}
        </div>

        {mode === "upload" ? (
          <div>
            <label htmlFor="segment-file" className={FIELD_LABEL}>
              Arquivo de vídeo
            </label>
            <input
              key={fileKey}
              id="segment-file"
              type="file"
              accept="video/*,.dav,.mkv,.avi,.mov,.ts,.h264,.264"
              disabled={busy}
              onChange={handleFileChange}
              className="mt-1.5 block w-full text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
            />
            {file && (
              <p className="mt-1.5 text-xs text-slate-500">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="segment-url" className={FIELD_LABEL}>
              Link da gravação
            </label>
            <input
              id="segment-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={busy}
              placeholder="https://…"
              className={FIELD_INPUT}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Use um link de <strong>download direto</strong> do arquivo. Links
              de compartilhamento que abrem uma página (como o do Google Drive
              em “…/view”) não funcionam.
            </p>
          </div>
        )}

        {busy && mode === "upload" && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {uploadingDone
                ? "Finalizando no servidor…"
                : `Enviando… ${Math.round(progress * 100)}%`}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? mode === "upload"
                ? "Enviando…"
                : "Enviando link…"
              : mode === "upload"
                ? "Enviar arquivo"
                : "Enviar link"}
          </button>
          {busy && mode === "upload" && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default AddSegmentForm;

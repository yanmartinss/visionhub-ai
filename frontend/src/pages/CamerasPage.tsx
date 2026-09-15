import { useState } from "react";
import { Camera as CameraIcon, List } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import CamerasTable from "../components/CamerasTable";

type View = "cadastrar" | "listar";

function CamerasPage() {
  const [view, setView] = useState<View>("cadastrar");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !location.trim()) {
      setError("Nome e localização são obrigatórios.");
      return;
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await apiFetch("/cameras", {
        method: "POST",
        body: { name: name.trim(), location: location.trim() },
      });
      setNotice("Câmera cadastrada.");
      setName("");
      setLocation("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Erro ao cadastrar câmera.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`mx-auto ${view === "cadastrar" ? "max-w-lg" : "max-w-5xl"}`}
    >
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          Câmeras
        </h1>

        <div className="inline-flex self-start rounded-full border border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setView("cadastrar")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              view === "cadastrar"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CameraIcon className="h-4 w-4" />
            Cadastrar
          </button>
          <button
            onClick={() => setView("listar")}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              view === "listar"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <List className="h-4 w-4" />
            Listar
          </button>
        </div>
      </div>

      {view === "listar" && <CamerasTable />}

      {view === "cadastrar" && (
        <div>
          {notice && (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              {notice}
            </p>
          )}

          <form
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                htmlFor="camera-name"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Nome
              </label>
              <input
                id="camera-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da câmera"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="camera-location"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Localização
              </label>
              <input
                id="camera-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Entrada de pedestres, próximo à guarita"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Cadastrando…" : "Cadastrar Câmera"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default CamerasPage;

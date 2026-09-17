import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";

type CameraRow = {
  id: string;
  name: string;
  location: string;
  active: boolean;
};

function CamerasTable() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<CameraRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(background = false) {
    if (!background) setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CameraRow[]>("/cameras");
      setCameras(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "deactivate" | "reactivate") {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/cameras/${id}/${action}`, { method: "PATCH" });
      await load(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro na ação.");
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(camera: CameraRow) {
    setEditing(camera);
    setEditName(camera.name);
    setEditLocation(camera.location);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editName.trim() || !editLocation.trim()) {
      setEditError("Nome e localização são obrigatórios.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await apiFetch(`/cameras/${editing.id}`, {
        method: "PATCH",
        body: { name: editName.trim(), location: editLocation.trim() },
      });
      setEditing(null);
      await load(true);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;
  if (cameras.length === 0 && !error) {
    return <p className="text-sm text-slate-500">Nenhuma câmera cadastrada.</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Localização</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((c) => (
              <tr
                key={c.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.location}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === c.id}
                      onClick={() => openEdit(c)}
                      className="cursor-pointer w-20 shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Editar
                    </button>
                    {c.active ? (
                      <button
                        disabled={busyId === c.id}
                        onClick={() => act(c.id, "deactivate")}
                        className="cursor-pointer w-24 shrink-0 rounded-md border border-red-300 px-3 py-1.5 text-center text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button
                        disabled={busyId === c.id}
                        onClick={() => act(c.id, "reactivate")}
                        className="w-24 shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        Reativar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold text-slate-900">
              Editar câmera
            </h2>

            <div className="mt-4">
              <label
                htmlFor="edit-camera-name"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Nome
              </label>
              <input
                id="edit-camera-name"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="edit-camera-location"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Localização
              </label>
              <input
                id="edit-camera-location"
                type="text"
                value={editLocation}
                onChange={(event) => setEditLocation(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            {editError && (
              <p className="mt-3 text-sm text-red-600">{editError}</p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CamerasTable;

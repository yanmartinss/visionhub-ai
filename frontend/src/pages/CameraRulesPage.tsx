import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { apiFetch, apiFetchBlob, apiUploadImage, ApiError } from "../lib/api";
import { describeError } from "../lib/messages";
import type {
  Area,
  AreaPoint,
  AreaType,
  CameraOption,
  EventType,
  Rule,
} from "../lib/types";
import PolygonEditor from "../components/PolygonEditor";
import RulesPanel from "../components/RulesPanel";

function CameraRules({ id }: { id: string }) {
  const [camera, setCamera] = useState<CameraOption | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const loadImage = useCallback(
    async (hasImage: boolean) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (!hasImage) {
        setImageUrl(null);
        return;
      }
      try {
        const blob = await apiFetchBlob(`/cameras/${id}/reference-image`);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setImageUrl(url);
      } catch {
        setImageUrl(null);
      }
    },
    [id],
  );

  const load = useCallback(async () => {
    try {
      const [cameraData, rulesData, areasData] = await Promise.all([
        apiFetch<CameraOption>(`/cameras/${id}`),
        apiFetch<Rule[]>(`/cameras/${id}/rules`),
        apiFetch<Area[]>(`/cameras/${id}/areas`),
      ]);
      setCamera(cameraData);
      setRules(rulesData);
      setAreas(areasData);
      setError(null);
      await loadImage(cameraData.hasReferenceImage);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 400)
      ) {
        setNotFound(true);
      } else {
        setError(describeError(err, "Erro ao carregar a câmera."));
      }
    }
  }, [id, loadImage]);

  // Written as a literal promise chain (not a call to `load`) so state is only
  // set from inside a `.then`/`.catch` callback, never synchronously in the
  // effect body.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<CameraOption>(`/cameras/${id}`),
      apiFetch<Rule[]>(`/cameras/${id}/rules`),
      apiFetch<Area[]>(`/cameras/${id}/areas`),
    ])
      .then(([cameraData, rulesData, areasData]) => {
        if (cancelled) return undefined;
        setCamera(cameraData);
        setRules(rulesData);
        setAreas(areasData);
        setError(null);
        return loadImage(cameraData.hasReferenceImage);
      })
      .catch((err) => {
        if (cancelled) return;
        if (
          err instanceof ApiError &&
          (err.status === 404 || err.status === 400)
        ) {
          setNotFound(true);
        } else {
          setError(describeError(err, "Erro ao carregar a câmera."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [id, loadImage]);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setImageError(null);
    try {
      await apiUploadImage(`/cameras/${id}/reference-image`, file);
      await load();
    } catch (err) {
      setImageError(describeError(err, "Erro ao enviar a imagem."));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function createArea(type: AreaType, polygon: AreaPoint[]) {
    await apiFetch<Area>(`/cameras/${id}/areas`, {
      method: "POST",
      body: { type, polygon },
    });
    await load();
  }

  async function deleteArea(areaId: string) {
    await apiFetch(`/areas/${areaId}`, { method: "DELETE" });
    await load();
  }

  async function saveRule(
    eventType: EventType,
    data: { timeLimitSeconds?: number; active: boolean },
  ) {
    await apiFetch<Rule>(`/cameras/${id}/rules/${eventType}`, {
      method: "PUT",
      body: data,
    });
    await load();
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;

  if (notFound || !camera) {
    return (
      <div className="mx-auto max-w-4xl">
        <Link
          to="/cameras"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Câmeras
        </Link>
        <p className="mt-6 text-sm text-slate-600">
          {error ?? "Câmera não encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/cameras"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Câmeras
      </Link>

      <h1 className="mt-3 font-serif text-2xl font-bold text-slate-900">
        Regras e áreas · {camera.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{camera.location}</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <h2 className="mt-8 font-serif text-lg font-bold text-slate-900">
        Imagem de referência
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Uma foto parada da câmera, usada de fundo para marcar as áreas abaixo.
        Não é o vídeo enviado nas gravações.
      </p>

      <div className="mt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleImageChange(event)}
          disabled={uploadingImage}
          className="hidden"
          id="reference-image-input"
        />
        <label
          htmlFor="reference-image-input"
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="h-4 w-4" />
          {uploadingImage
            ? "Enviando…"
            : camera.hasReferenceImage
              ? "Trocar imagem"
              : "Enviar imagem"}
        </label>
        {imageError && (
          <p className="mt-2 text-sm text-red-600">{imageError}</p>
        )}
      </div>

      <h2 className="mt-8 font-serif text-lg font-bold text-slate-900">
        Áreas
      </h2>
      <div className="mt-3">
        <PolygonEditor
          imageUrl={imageUrl}
          areas={areas}
          onCreate={createArea}
          onDelete={deleteArea}
        />
      </div>

      <h2 className="mt-8 font-serif text-lg font-bold text-slate-900">
        Regras
      </h2>
      <div className="mt-3">
        <RulesPanel rules={rules} areas={areas} onSave={saveRule} />
      </div>
    </div>
  );
}

// `key` below resets state when navigating between two cameras.
function CameraRulesPage() {
  const { id } = useParams();
  return id ? <CameraRules key={id} id={id} /> : null;
}

export default CameraRulesPage;

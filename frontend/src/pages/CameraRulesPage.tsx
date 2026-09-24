import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { apiFetch, apiFetchBlob, apiUploadImage, ApiError } from "../lib/api";
import { EVENT_TYPE_INFO } from "../lib/eventTypes";
import { describeError } from "../lib/messages";
import type {
  Area,
  AreaPoint,
  AreaType,
  CameraOption,
  EventType,
  Rule,
} from "../lib/types";
import MonitoringList from "../components/MonitoringList";
import RuleWizard from "../components/RuleWizard";

type WizardState = { editingType: EventType | null } | null;

function CameraRules({ id }: { id: string }) {
  const [camera, setCamera] = useState<CameraOption | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<EventType | null>(null);
  const [wizard, setWizard] = useState<WizardState>(null);
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

  async function uploadImage(file: File) {
    await apiUploadImage(`/cameras/${id}/reference-image`, file);
    await load();
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

  async function toggleRule(rule: Rule) {
    setBusyType(rule.eventType);
    setError(null);
    try {
      // Types with a time limit require it on every save, so resend it.
      await saveRule(rule.eventType, {
        active: !rule.active,
        ...(EVENT_TYPE_INFO[rule.eventType].requiresTimeLimit &&
        rule.timeLimitSeconds
          ? { timeLimitSeconds: rule.timeLimitSeconds }
          : {}),
      });
    } catch (err) {
      setError(describeError(err, "Erro ao salvar a regra."));
    } finally {
      setBusyType(null);
    }
  }

  async function removeRule(rule: Rule) {
    const label = EVENT_TYPE_INFO[rule.eventType].label;
    if (
      !window.confirm(
        `Excluir o monitoramento “${label}”? Os eventos já gerados por ele nos dias processados também serão removidos. As áreas desenhadas continuam salvas.`,
      )
    )
      return;
    setBusyType(rule.eventType);
    setError(null);
    try {
      await apiFetch(`/cameras/${id}/rules/${rule.eventType}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(describeError(err, "Erro ao excluir a regra."));
    } finally {
      setBusyType(null);
    }
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

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            O que esta câmera monitora
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {camera.name} · {camera.location}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizard({ editingType: null })}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Adicionar monitoramento
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6">
        <MonitoringList
          rules={rules}
          areas={areas}
          busyType={busyType}
          onToggle={(rule) => void toggleRule(rule)}
          onEdit={(type) => setWizard({ editingType: type })}
          onDelete={(rule) => void removeRule(rule)}
        />
      </div>

      {wizard && (
        <RuleWizard
          editingType={wizard.editingType}
          rules={rules}
          areas={areas}
          hasImage={camera.hasReferenceImage}
          imageUrl={imageUrl}
          onUploadImage={uploadImage}
          onCreateArea={createArea}
          onDeleteArea={deleteArea}
          onSave={saveRule}
          onClose={() => setWizard(null)}
        />
      )}
    </div>
  );
}

// `key` below resets state when navigating between two cameras.
function CameraRulesPage() {
  const { id } = useParams();
  return id ? <CameraRules key={id} id={id} /> : null;
}

export default CameraRulesPage;

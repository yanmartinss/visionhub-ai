import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
import {
  fetchDashboard,
  fetchEvents,
  updateEventStatus,
} from "../lib/dashboard-api";
import { EVENT_TYPES, EVENT_TYPE_INFO } from "../lib/eventTypes";
import { formatDuration, formatShortDateTime } from "../lib/format";
import { describeError } from "../lib/messages";
import type {
  EventFilters,
  EventPage,
  EventStatus,
  EventType,
} from "../lib/types";
import {
  EventStatusBadge,
  EventTypeBadge,
} from "../components/StatusBadge";
import EventStatusSelect from "../components/EventStatusSelect";
import EventDetailDialog from "../components/EventDetailDialog";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "inProgress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
];

const FILTER_INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

type CameraChoice = { id: string; name: string };

// Filters live in the URL so Back/Forward and shared links keep them.
function filtersFromParams(params: URLSearchParams): EventFilters {
  const type = params.get("type");
  const status = params.get("status");
  const page = Number(params.get("page"));
  return {
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    type: EVENT_TYPES.includes(type as EventType)
      ? (type as EventType)
      : undefined,
    cameraId: params.get("cameraId") || undefined,
    status: STATUS_OPTIONS.some((option) => option.value === status)
      ? (status as EventStatus)
      : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    pageSize: PAGE_SIZE,
  };
}

function paramsFromFilters(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "type", "cameraId", "status"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

// Draft of the filter bar; remounted (via `key`) whenever the URL changes, so it
// always starts from the filters actually applied.
function FilterBar({
  applied,
  cameras,
  onApply,
}: {
  applied: EventFilters;
  cameras: CameraChoice[];
  onApply: (filters: EventFilters) => void;
}) {
  const [from, setFrom] = useState(applied.from ?? "");
  const [to, setTo] = useState(applied.to ?? "");
  const [type, setType] = useState(applied.type ?? "");
  const [cameraId, setCameraId] = useState(applied.cameraId ?? "");
  const [status, setStatus] = useState(applied.status ?? "");
  const [invalid, setInvalid] = useState(false);

  const hasFilters = Boolean(
    applied.from ||
      applied.to ||
      applied.type ||
      applied.cameraId ||
      applied.status,
  );

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (from && to && from > to) {
      setInvalid(true);
      return;
    }
    onApply({
      from: from || undefined,
      to: to || undefined,
      type: (type || undefined) as EventType | undefined,
      cameraId: cameraId || undefined,
      status: (status || undefined) as EventStatus | undefined,
      page: 1,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-lg border border-slate-200 bg-white p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </span>
        <input
          type="date"
          aria-label="De"
          value={from}
          onChange={(ev) => {
            setFrom(ev.target.value);
            setInvalid(false);
          }}
          className={FILTER_INPUT}
        />
        <span className="text-slate-400">—</span>
        <input
          type="date"
          aria-label="Até"
          value={to}
          onChange={(ev) => {
            setTo(ev.target.value);
            setInvalid(false);
          }}
          className={FILTER_INPUT}
        />
        <select
          aria-label="Tipo de evento"
          value={type}
          onChange={(ev) => setType(ev.target.value)}
          className={FILTER_INPUT}
        >
          <option value="">Todos os tipos de evento</option>
          {EVENT_TYPES.map((eventType) => (
            <option key={eventType} value={eventType}>
              {EVENT_TYPE_INFO[eventType].label}
            </option>
          ))}
        </select>
        <select
          aria-label="Câmera"
          value={cameraId}
          onChange={(ev) => setCameraId(ev.target.value)}
          className={FILTER_INPUT}
        >
          <option value="">Todas as câmeras</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(ev) => setStatus(ev.target.value)}
          className={FILTER_INPUT}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          {hasFilters && (
            <button
              type="button"
              onClick={() => onApply({ page: 1 })}
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Limpar filtros
            </button>
          )}
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
      {invalid && (
        <p className="mt-2 px-1 text-xs text-red-700">
          A data inicial precisa ser anterior ou igual à data final.
        </p>
      )}
    </form>
  );
}

function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryKey = searchParams.toString();
  const filters = filtersFromParams(searchParams);

  const [result, setResult] = useState<EventPage | null>(null);
  // Which query the shown result belongs to; differs while a new one loads.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraChoice[]>([]);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(
    (key: string) =>
      fetchEvents(filtersFromParams(new URLSearchParams(key)))
        .then((page) => {
          setResult(page);
          setError(null);
        })
        .catch((err) => {
          setError(describeError(err, "Erro ao carregar o histórico."));
        })
        .finally(() => setLoadedKey(key)),
    [],
  );

  useEffect(() => {
    void load(queryKey);
  }, [queryKey, load]);

  // `GET /cameras` is manager-only; the dashboard lists cameras for any role.
  useEffect(() => {
    fetchDashboard()
      .then((dashboard) => setCameras(dashboard.cameras.items))
      .catch(() => setCameras([]));
  }, []);

  function apply(next: EventFilters) {
    setSearchParams(paramsFromFilters(next));
  }

  function goToPage(page: number) {
    apply({ ...filters, page });
    window.scrollTo({ top: 0 });
  }

  async function changeEventStatus(eventId: string, status: EventStatus) {
    setBusyEventId(eventId);
    try {
      await updateEventStatus(eventId, status);
      await load(queryKey);
    } catch (err) {
      setError(describeError(err, "Erro ao atualizar o status do evento."));
    } finally {
      setBusyEventId(null);
    }
  }

  const loading = loadedKey !== queryKey;
  const page = result?.page ?? 1;
  const firstShown = result ? (page - 1) * result.pageSize + 1 : 0;
  const lastShown = result ? firstShown + result.items.length - 1 : 0;
  const hasNext = result ? page * result.pageSize < result.total : false;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          Histórico de eventos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte e filtre todos os eventos já detectados. O período se refere
          ao dia da gravação.
        </p>
      </div>

      <FilterBar
        key={queryKey}
        applied={filters}
        cameras={cameras}
        onApply={apply}
      />

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!result ? (
        <p className="text-sm text-slate-500">
          {loading ? "Carregando…" : null}
        </p>
      ) : result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {searchParams.size > 0
            ? "Nenhum evento encontrado com esses filtros."
            : "Nenhum evento detectado ainda."}
        </p>
      ) : (
        <>
          <div
            className={`relative overflow-x-auto rounded-lg border border-slate-200 bg-white ${
              loading ? "opacity-60" : ""
            }`}
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Tipo de evento</th>
                  <th className="px-4 py-3">Câmera</th>
                  <th className="hidden px-4 py-3 md:table-cell">Duração</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-900">
                      {formatShortDateTime(event.occurredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <EventTypeBadge type={event.type} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{event.camera.name}</p>
                      <p className="text-xs text-slate-500">
                        {event.camera.location}
                      </p>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-slate-700 md:table-cell">
                      {event.durationSec !== null
                        ? formatDuration(event.durationSec)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <EventStatusBadge status={event.status} />
                        <EventStatusSelect
                          label={`Status de ${EVENT_TYPE_INFO[event.type].label}`}
                          value={event.status}
                          disabled={busyEventId === event.id}
                          onChange={(status) =>
                            void changeEventStatus(event.id, status)
                          }
                        />
                      </div>
                    </td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailId(event.id)}
                        className="cursor-pointer text-sm font-semibold text-slate-900 underline"
                      >
                        Detalhes
                      </button>
                      {event.recordingDay && (
                        <Link
                          to={`/recordings/${event.recordingDay.id}`}
                          className="text-sm font-semibold text-slate-900 underline"
                        >
                          Ver no lote
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Mostrando {firstShown}–{lastShown} de {result.total} evento
              {result.total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => goToPage(page + 1)}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}

      {detailId && (
        <EventDetailDialog
          eventId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

export default HistoryPage;

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Baby,
  Briefcase,
  Car,
  CircleAlert,
  Clock,
  DoorOpen,
  PawPrint,
  type LucideIcon,
} from "lucide-react";
import {
  fetchDashboard,
  fetchEvents,
  updateEventStatus,
} from "../lib/dashboard-api";
import { EVENT_TYPES, EVENT_TYPE_INFO } from "../lib/eventTypes";
import {
  dayToInputDate,
  formatLongDay,
  formatRelative,
  formatTime,
  todayLocalDate,
} from "../lib/format";
import { describeError } from "../lib/messages";
import type {
  DashboardData,
  EventListItem,
  EventStatus,
  EventType,
} from "../lib/types";
import { usePolling } from "../hooks/usePolling";
import DaySummaryCard, { DaySummaryHeading } from "../components/DaySummaryCard";
import {
  DayStatusBadge,
  EventStatusBadge,
  EventTypeBadge,
} from "../components/StatusBadge";
import EventStatusSelect from "../components/EventStatusSelect";
import SegmentProgress from "../components/SegmentProgress";

const EVENT_ICON: Record<EventType, LucideIcon> = {
  gateOpen: DoorOpen,
  occupancy: Clock,
  restrictedArea: AlertTriangle,
  abandonedObject: Briefcase,
  illegalParking: Car,
  childRunning: Baby,
  petWaste: PawPrint,
  other: CircleAlert,
};

// Open events stand out; resolved ones fade into the list.
const EVENT_CARD_TONE: Record<EventStatus, string> = {
  pending: "border-red-200 bg-red-50",
  inProgress: "border-amber-200 bg-amber-50",
  resolved: "border-slate-200 bg-white",
};

const CARD = "rounded-lg border border-slate-200 bg-white p-5";
const CARD_LABEL = "text-xs font-bold uppercase tracking-wide text-slate-500";

function hourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function comparedToYesterday(today: number, yesterday: number) {
  const diff = today - yesterday;
  if (diff === 0) return { text: "Igual ao dia anterior", tone: "text-slate-500" };
  return diff > 0
    ? { text: `+${diff} em relação ao dia anterior`, tone: "text-orange-700" }
    : { text: `${diff} em relação ao dia anterior`, tone: "text-emerald-700" };
}

function StatCard({
  label,
  value,
  hint,
  hintTone = "text-slate-500",
}: {
  label: string;
  value: string;
  hint: string;
  hintTone?: string;
}) {
  return (
    <div className={CARD}>
      <p className={CARD_LABEL}>{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-slate-900">
        {value}
      </p>
      <p className={`mt-1 text-xs font-semibold ${hintTone}`}>{hint}</p>
    </div>
  );
}

function EventCard({
  event,
  isToday,
  busy,
  onStatusChange,
}: {
  event: EventListItem;
  isToday: boolean;
  busy: boolean;
  onStatusChange: (status: EventStatus) => void;
}) {
  const Icon = EVENT_ICON[event.type];
  const label = EVENT_TYPE_INFO[event.type].label;

  return (
    <li className={`rounded-lg border p-4 ${EVENT_CARD_TONE[event.status]}`}>
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="font-semibold text-slate-900">{label}</p>
            <p
              className="text-xs text-slate-500"
              title={new Date(event.occurredAt).toLocaleString("pt-BR")}
            >
              {isToday
                ? formatRelative(event.occurredAt)
                : hourMinute(event.occurredAt)}
            </p>
          </div>
          <p className="text-sm text-slate-600">
            {event.camera.name}
            {event.technicalDescription && ` — ${event.technicalDescription}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <EventStatusSelect
              label={`Status de ${label}`}
              value={event.status}
              disabled={busy}
              onChange={onStatusChange}
            />
            {event.recordingDay && (
              <Link
                to={`/recordings/${event.recordingDay.id}`}
                className="text-xs font-semibold text-slate-700 underline hover:text-slate-900"
              >
                Ver lote
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DashboardPage() {
  const today = todayLocalDate();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<DashboardData | null>(null);
  const [latestDay, setLatestDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const showData = useCallback((dashboard: DashboardData) => {
    setData(dashboard);
    setError(null);
    setUpdatedAt(new Date());
  }, []);
  const showError = useCallback((err: unknown) => {
    setError(describeError(err, "Erro ao carregar o painel."));
  }, []);

  // Initial load and reload on date change; `changeDate` turns loading on.
  useEffect(() => {
    let cancelled = false;
    fetchDashboard(date)
      .then((dashboard) => {
        if (!cancelled) showData(dashboard);
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
  }, [date, showData, showError]);

  // Recordings arrive after the fact, so "today" is often still empty: the most
  // recent event tells which batch day has something to show.
  useEffect(() => {
    fetchEvents({ pageSize: 1 })
      .then((page) => {
        const day = page.items[0]?.recordingDay?.date;
        setLatestDay(day ? dayToInputDate(day) : null);
      })
      .catch(() => setLatestDay(null));
  }, []);

  const refresh = useCallback(
    () => fetchDashboard(date).then(showData).catch(showError),
    [date, showData, showError],
  );

  const processing = Boolean(
    data?.recordingDays.some(
      (day) =>
        day.status === "processing" ||
        (day.status === "pending" && day.progress.total > 0),
    ),
  );
  usePolling(refresh, 30_000, processing);

  function changeDate(next: string) {
    if (!next || next === date) return;
    setDate(next);
    setLoading(true);
  }

  async function changeEventStatus(eventId: string, status: EventStatus) {
    setBusyEventId(eventId);
    try {
      await updateEventStatus(eventId, status);
      await refresh();
    } catch (err) {
      setError(describeError(err, "Erro ao atualizar o status do evento."));
    } finally {
      setBusyEventId(null);
    }
  }

  const isToday = date === today;
  const comparison = data
    ? comparedToYesterday(data.totals.events, data.totals.previousDayEvents)
    : null;
  const inactiveCameras =
    data?.cameras.items.filter((camera) => !camera.active) ?? [];
  const summaryDays =
    data?.recordingDays.filter(
      (day) => day.status === "completed" || day.status === "partial",
    ) ?? [];
  const typeCounts = data
    ? EVENT_TYPES.filter((type) => data.totals.byType[type] > 0)
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 first-letter:uppercase">
            {formatLongDay(`${date}T00:00:00.000Z`)}
            {isToday && " · hoje"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {latestDay && latestDay !== date && (
            <button
              type="button"
              onClick={() => changeDate(latestDay)}
              className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Último dia processado
            </button>
          )}
          {!isToday && (
            <button
              type="button"
              onClick={() => changeDate(today)}
              className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hoje
            </button>
          )}
          <input
            type="date"
            aria-label="Dia"
            value={date}
            max={today}
            onChange={(ev) => changeDate(ev.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!data ? (
        <p className="py-12 text-center text-sm text-slate-500">
          {loading ? "Carregando…" : "Não foi possível carregar o painel."}
        </p>
      ) : (
        <div className={loading ? "opacity-60" : undefined}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Eventos do dia"
              value={String(data.totals.events)}
              hint={comparison!.text}
              hintTone={comparison!.tone}
            />
            <StatCard
              label="Alertas abertos"
              value={String(data.openEvents)}
              hint={
                data.openEvents > 0
                  ? "Pendentes ou em andamento, todos os dias"
                  : "Nada pendente"
              }
              hintTone={
                data.openEvents > 0 ? "text-red-700" : "text-emerald-700"
              }
            />
            <StatCard
              label="Câmeras ativas"
              value={`${data.cameras.active}/${data.cameras.total}`}
              hint={
                inactiveCameras.length === 0
                  ? "Todas ativas"
                  : inactiveCameras.length === 1
                    ? `${inactiveCameras[0].name} inativa`
                    : `${inactiveCameras.length} inativas`
              }
              hintTone={
                inactiveCameras.length === 0
                  ? "text-emerald-700"
                  : "text-orange-700"
              }
            />
            <StatCard
              label="Lotes do dia"
              value={String(data.recordingDays.length)}
              hint={
                processing
                  ? "Processando — atualiza sozinho"
                  : data.recordingDays.length === 0
                    ? "Nenhuma gravação enviada"
                    : "Processamento concluído"
              }
              hintTone={processing ? "text-amber-700" : "text-slate-500"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className={`${CARD} lg:col-span-2`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Eventos do dia
                </h2>
                {updatedAt && (
                  <p className="text-xs text-slate-500">
                    Atualizado às {formatTime(updatedAt)}
                  </p>
                )}
              </div>

              {data.latestEvents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {data.recordingDays.length === 0
                    ? "Nenhuma gravação deste dia foi enviada ainda."
                    : processing
                      ? "Nenhum evento até agora — as gravações ainda estão sendo processadas."
                      : "Nenhum evento detectado neste dia."}
                </p>
              ) : (
                <>
                  <ul className="space-y-3">
                    {data.latestEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isToday={isToday}
                        busy={busyEventId === event.id}
                        onStatusChange={(status) =>
                          void changeEventStatus(event.id, status)
                        }
                      />
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p>
                      {data.totals.events > data.latestEvents.length &&
                        `Mostrando os ${data.latestEvents.length} mais recentes de ${data.totals.events} eventos.`}
                    </p>
                    <Link
                      to={`/history?from=${date}&to=${date}`}
                      className="font-semibold text-slate-700 underline hover:text-slate-900"
                    >
                      Ver todos no histórico
                    </Link>
                  </div>
                </>
              )}
            </section>

            <div className="space-y-6">
              <section className={CARD}>
                <DaySummaryHeading />
                {summaryDays.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    O resumo em linguagem natural é gerado localmente quando as
                    gravações do dia terminam de processar.
                  </p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {summaryDays.map((day) => (
                      <DaySummaryCard
                        key={day.id}
                        recordingDayId={day.id}
                        label={
                          summaryDays.length > 1 ? day.cameraName : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {typeCounts.length > 0 && (
                <section className={CARD}>
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Por tipo
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {typeCounts.map((type) => (
                      <li
                        key={type}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <EventTypeBadge type={type} />
                        <span className="font-semibold text-slate-900">
                          {data.totals.byType[type]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={CARD}>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Gravações do dia
                </h2>
                {data.recordingDays.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Nenhum lote para este dia.{" "}
                    <Link
                      to="/recordings"
                      className="font-semibold text-slate-700 underline"
                    >
                      Ver gravações
                    </Link>
                  </p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {data.recordingDays.map((day) => (
                      <li key={day.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <Link
                            to={`/recordings/${day.id}`}
                            className="truncate text-sm font-medium text-slate-900 hover:underline"
                          >
                            {day.cameraName}
                          </Link>
                          <DayStatusBadge status={day.status} />
                        </div>
                        <SegmentProgress progress={day.progress} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={CARD}>
                <h2 className="font-serif text-lg font-bold text-slate-900">
                  Câmeras
                </h2>
                {data.cameras.items.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Nenhuma câmera cadastrada.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data.cameras.items.map((camera) => (
                      <li
                        key={camera.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate text-slate-700">
                          {camera.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            camera.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {camera.active ? "Ativa" : "Inativa"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;

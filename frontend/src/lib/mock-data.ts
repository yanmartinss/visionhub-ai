import { EVENT_TYPES } from "./eventTypes";
import type {
  DashboardData,
  EventFilters,
  EventListItem,
  EventPage,
  EventStatus,
  EventType,
  RecordingDayStatus,
} from "./types";

// In-memory stand-in for the Fatia D endpoints, used while the backend is not
// ready (`VITE_MOCK_API=true`). Same shapes as docs/agentes/README.md (3.3).

const MOCK_DAYS = 30;

const CAMERAS = [
  { id: "cam-portaria", name: "Portaria Principal", location: "Entrada", active: true },
  { id: "cam-garagem", name: "Garagem — Subsolo", location: "Subsolo", active: true },
  { id: "cam-lazer", name: "Área de Lazer", location: "Térreo", active: true },
  { id: "cam-portaria-b", name: "Portaria B", location: "Rua lateral", active: false },
];

const AUTO_TYPES: EventType[] = EVENT_TYPES.filter((type) => type !== "other");

const DESCRIPTIONS: Record<EventType, string> = {
  gateOpen: "Portão aberto por mais tempo que o limite.",
  occupancy: "Pessoa parada na área sensível por mais tempo que o limite.",
  restrictedArea: "Pessoa detectada dentro da área restrita.",
  abandonedObject: "Objeto parado sem dono aparente.",
  illegalParking: "Carro parado em área de proibido estacionar.",
  childRunning: "Criança em movimento rápido no estacionamento.",
  petWaste: "Dejeto de animal detectado fora da lixeira.",
  other: "Evento sem regra específica.",
};

// Deterministic PRNG so the mock looks the same on every reload.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function saoPauloToday(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

type MockDay = {
  id: string;
  cameraId: string;
  date: string;
  status: RecordingDayStatus;
  segments: number;
};

function buildData() {
  const random = seeded(42);
  const today = saoPauloToday();
  const days: MockDay[] = [];
  const events: EventListItem[] = [];

  for (let back = MOCK_DAYS - 1; back >= 0; back--) {
    const date = shiftDay(today, -back);
    for (const camera of CAMERAS) {
      // The inactive camera stopped sending recordings a week ago.
      if (!camera.active && back < 7) continue;
      if (random() < 0.15) continue;

      const dayId = `day-${camera.id}-${date}`;
      const segments = 2 + Math.floor(random() * 4);
      const status: RecordingDayStatus =
        back === 0 ? "processing" : random() < 0.1 ? "partial" : "completed";
      days.push({ id: dayId, cameraId: camera.id, date, status, segments });

      const count = Math.floor(random() * (back === 0 ? 3 : 5));
      for (let i = 0; i < count; i++) {
        const type = AUTO_TYPES[Math.floor(random() * AUTO_TYPES.length)];
        const hour = String(6 + Math.floor(random() * 16)).padStart(2, "0");
        const minute = String(Math.floor(random() * 60)).padStart(2, "0");
        const occurredAt = new Date(
          `${date}T${hour}:${minute}:00-03:00`,
        ).toISOString();
        const durationSec = 30 + Math.floor(random() * 900);
        const status: EventStatus =
          back > 2
            ? "resolved"
            : (["pending", "inProgress", "resolved"] as const)[
                Math.floor(random() * 3)
              ];
        events.push({
          id: `evt-${dayId}-${i}`,
          type,
          status,
          occurredAt,
          startedAt: occurredAt,
          endedAt: new Date(
            Date.parse(occurredAt) + durationSec * 1000,
          ).toISOString(),
          durationSec,
          confidence: Math.round((0.55 + random() * 0.44) * 100) / 100,
          technicalDescription: DESCRIPTIONS[type],
          hasThumbnail: false,
          hasClip: false,
          camera: { id: camera.id, name: camera.name, location: camera.location },
          recordingDay: { id: dayId, date: `${date}T00:00:00.000Z` },
        });
      }
    }
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return { days, events };
}

const data = buildData();

function dayOf(event: EventListItem): string | null {
  return event.recordingDay ? event.recordingDay.date.slice(0, 10) : null;
}

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(value)), 250),
  );
}

export function mockFetchEvents(filters: EventFilters): Promise<EventPage> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const matches = data.events.filter((event) => {
    const day = dayOf(event);
    if ((filters.from || filters.to) && !day) return false;
    if (filters.from && day! < filters.from) return false;
    if (filters.to && day! > filters.to) return false;
    if (filters.type && event.type !== filters.type) return false;
    if (filters.cameraId && event.camera.id !== filters.cameraId) return false;
    if (filters.status && event.status !== filters.status) return false;
    return true;
  });
  return wait({
    items: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length,
    page,
    pageSize,
  });
}

export function mockFetchDashboard(date?: string): Promise<DashboardData> {
  const day = date ?? saoPauloToday();
  const dayEvents = data.events.filter((event) => dayOf(event) === day);
  const previousDay = shiftDay(day, -1);

  const byType = Object.fromEntries(
    EVENT_TYPES.map((type) => [type, 0]),
  ) as Record<EventType, number>;
  const byStatus: Record<EventStatus, number> = {
    pending: 0,
    inProgress: 0,
    resolved: 0,
  };
  for (const event of dayEvents) {
    byType[event.type] += 1;
    byStatus[event.status] += 1;
  }

  return wait({
    date: `${day}T00:00:00.000Z`,
    totals: {
      events: dayEvents.length,
      previousDayEvents: data.events.filter(
        (event) => dayOf(event) === previousDay,
      ).length,
      byType,
      byStatus,
    },
    openEvents: data.events.filter((event) => event.status !== "resolved")
      .length,
    cameras: {
      active: CAMERAS.filter((camera) => camera.active).length,
      total: CAMERAS.length,
      items: CAMERAS,
    },
    recordingDays: data.days
      .filter((recordingDay) => recordingDay.date === day)
      .map((recordingDay) => {
        const processing = recordingDay.status === "processing";
        const failed = recordingDay.status === "partial" ? 1 : 0;
        return {
          id: recordingDay.id,
          cameraId: recordingDay.cameraId,
          cameraName: CAMERAS.find((c) => c.id === recordingDay.cameraId)!
            .name,
          status: recordingDay.status,
          progress: {
            total: recordingDay.segments,
            received: processing ? 1 : 0,
            processing: processing ? 1 : 0,
            completed: recordingDay.segments - failed - (processing ? 2 : 0),
            failed,
          },
        };
      }),
    latestEvents: dayEvents.slice(0, 10),
  });
}

export function mockUpdateEventStatus(
  id: string,
  status: EventStatus,
): Promise<void> {
  const event = data.events.find((item) => item.id === id);
  if (event) event.status = status;
  return wait(undefined);
}

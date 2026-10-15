import { EVENT_TYPES, type EventTypeValue } from "../lib/event-types.ts";
import { prisma } from "../lib/prisma.ts";
import type {
  EventStatus,
  Prisma,
} from "../../generated/prisma/client.ts";
import { eventListSelect, toEventListItem } from "./event.service.ts";
import { listRecordingDays } from "./recording-day.service.ts";

const DASHBOARD_TIME_ZONE = "America/Sao_Paulo";
const LATEST_EVENTS_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's calendar date in the condominium's time zone, as the midnight-UTC
// `Date` used for `RecordingDay.date` ("en-CA" formats as YYYY-MM-DD).
const todayRecordingDate = () => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(new Date());
  return new Date(`${today}T00:00:00.000Z`);
};

// Events belong to a day through their segment's recording day (see the API
// contract in docs/agentes/README.md §3.3), not through their own timestamp.
const eventsOfDay = (date: Date): Prisma.EventWhereInput => ({
  segment: { recordingDay: { date } },
});

export const getDashboard = async (requestedDate?: Date) => {
  const date = requestedDate ?? todayRecordingDate();
  const previousDate = new Date(date.getTime() - DAY_MS);
  const dayWhere = eventsOfDay(date);

  const [
    byTypeRows,
    byStatusRows,
    previousDayEvents,
    openEvents,
    cameras,
    recordingDays,
    latestEvents,
  ] = await Promise.all([
    prisma.event.groupBy({
      by: ["type"],
      where: dayWhere,
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["status"],
      where: dayWhere,
      _count: { _all: true },
    }),
    prisma.event.count({ where: eventsOfDay(previousDate) }),
    prisma.event.count({
      where: { status: { in: ["pending", "inProgress"] } },
    }),
    prisma.camera.findMany({
      select: { id: true, name: true, location: true, active: true },
      orderBy: { name: "asc" },
    }),
    listRecordingDays({ date }),
    prisma.event.findMany({
      where: dayWhere,
      select: eventListSelect,
      orderBy: [{ startedAt: "desc" }, { id: "asc" }],
      take: LATEST_EVENTS_LIMIT,
    }),
  ]);

  const byType = Object.fromEntries(
    EVENT_TYPES.map((type) => [type, 0]),
  ) as Record<EventTypeValue, number>;
  for (const row of byTypeRows) byType[row.type] = row._count._all;

  const byStatus: Record<EventStatus, number> = {
    pending: 0,
    inProgress: 0,
    resolved: 0,
    falsePositive: 0,
  };
  for (const row of byStatusRows) byStatus[row.status] = row._count._all;

  return {
    date,
    totals: {
      events: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
      previousDayEvents,
      byType,
      byStatus,
    },
    openEvents,
    cameras: {
      active: cameras.filter((camera) => camera.active).length,
      total: cameras.length,
      items: cameras,
    },
    recordingDays: recordingDays.map((day) => ({
      id: day.id,
      cameraId: day.cameraId,
      cameraName: day.camera.name,
      status: day.status,
      progress: day.progress,
    })),
    latestEvents: latestEvents.map(toEventListItem),
  };
};

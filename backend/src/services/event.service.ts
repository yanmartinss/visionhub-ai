import { AppError } from "../lib/app-error.ts";
import { prisma } from "../lib/prisma.ts";
import type { ListEventsFilters } from "../schemas/list-events-schema.ts";
import type {
  EventStatus,
  Prisma,
} from "../../generated/prisma/client.ts";

// Raw event row, as returned by `PATCH /events/:id` and
// `GET /recording-days/:id/events`.
export const eventSelect = {
  id: true,
  cameraId: true,
  type: true,
  status: true,
  technicalDescription: true,
  startedAt: true,
  endedAt: true,
  segmentId: true,
  occurredAt: true,
  confidence: true,
  thumbnailPath: true,
  clipPath: true,
  createdAt: true,
} as const;

// Fields behind `EventListItem` (history, detail, dashboard — see
// docs/agentes/README.md §3.3). Storage paths are read only to derive
// `hasThumbnail`/`hasClip`; they never leave the API.
export const eventListSelect = {
  id: true,
  type: true,
  status: true,
  occurredAt: true,
  startedAt: true,
  endedAt: true,
  confidence: true,
  technicalDescription: true,
  thumbnailPath: true,
  clipPath: true,
  camera: { select: { id: true, name: true, location: true } },
  segment: {
    select: { recordingDay: { select: { id: true, date: true } } },
  },
} as const satisfies Prisma.EventSelect;

type EventListRow = Prisma.EventGetPayload<{ select: typeof eventListSelect }>;

export const toEventListItem = (event: EventListRow) => {
  const { thumbnailPath, clipPath, segment, ...rest } = event;
  return {
    ...rest,
    occurredAt: event.occurredAt ?? event.startedAt,
    durationSec: event.endedAt
      ? Math.round((event.endedAt.getTime() - event.startedAt.getTime()) / 1000)
      : null,
    hasThumbnail: thumbnailPath !== null,
    hasClip: clipPath !== null,
    recordingDay: segment?.recordingDay ?? null,
  };
};

// Date filters go through the event's segment, so events without one are
// excluded whenever `from`/`to` is set (documented in the API contract).
const buildListWhere = (filters: ListEventsFilters): Prisma.EventWhereInput => {
  const where: Prisma.EventWhereInput = {
    type: filters.type,
    cameraId: filters.cameraId,
    status: filters.status,
  };
  if (filters.from || filters.to) {
    where.segment = {
      recordingDay: { date: { gte: filters.from, lte: filters.to } },
    };
  }
  return where;
};

export const listEvents = async (filters: ListEventsFilters) => {
  const where = buildListWhere(filters);
  const [total, events] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      select: eventListSelect,
      // `startedAt === occurredAt` on automatic events, and unlike
      // `occurredAt` it is never null.
      orderBy: [{ startedAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return {
    items: events.map(toEventListItem),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
};

export const updateEventStatus = async (
  eventId: string,
  status: EventStatus,
) => {
  const updated = await prisma.event.updateMany({
    where: { id: eventId },
    data: { status },
  });
  if (updated.count === 0) throw new AppError(404, "Event not found");

  return await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    select: eventSelect,
  });
};

import { EVENT_TYPES, type EventTypeValue } from "../lib/event-types.ts";
import { prisma } from "../lib/prisma.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type { AccuracyFilters } from "../schemas/accuracy-query-schema.ts";

type AccuracyCounts = {
  total: number;
  resolved: number;
  falsePositive: number;
  unreviewed: number; // pending + inProgress: nobody judged them yet
  // resolved / (resolved + falsePositive); null while nothing was judged
  precision: number | null;
};

const emptyCounts = (): AccuracyCounts => ({
  total: 0,
  resolved: 0,
  falsePositive: 0,
  unreviewed: 0,
  precision: null,
});

const withPrecision = (counts: AccuracyCounts): AccuracyCounts => {
  const judged = counts.resolved + counts.falsePositive;
  return {
    ...counts,
    precision: judged === 0 ? null : counts.resolved / judged,
  };
};

// Precision of the automatic detection per event type (US34), measured by the
// triage: "resolved" confirms the event, "falsePositive" rejects it. Events
// still pending/inProgress are counted apart and never enter the ratio.
export const getAccuracy = async (filters: AccuracyFilters) => {
  const where: Prisma.EventWhereInput = { cameraId: filters.cameraId };
  if (filters.from || filters.to) {
    where.segment = {
      recordingDay: { date: { gte: filters.from, lte: filters.to } },
    };
  }

  const rows = await prisma.event.groupBy({
    by: ["type", "status"],
    where,
    _count: { _all: true },
  });

  const byType = Object.fromEntries(
    EVENT_TYPES.map((type) => [type, emptyCounts()]),
  ) as Record<EventTypeValue, AccuracyCounts>;
  const overall = emptyCounts();

  for (const row of rows) {
    const n = row._count._all;
    for (const counts of [byType[row.type], overall]) {
      counts.total += n;
      if (row.status === "resolved") counts.resolved += n;
      else if (row.status === "falsePositive") counts.falsePositive += n;
      else counts.unreviewed += n;
    }
  }

  return {
    overall: withPrecision(overall),
    items: EVENT_TYPES.map((type) => ({
      type,
      ...withPrecision(byType[type]),
    })),
  };
};

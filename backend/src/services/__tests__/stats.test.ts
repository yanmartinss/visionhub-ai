import { beforeEach, describe, expect, it, vi } from "vitest";

const groupBy = vi.fn();

vi.mock("../../lib/prisma.ts", () => ({
  prisma: { event: { groupBy } },
}));

const { getAccuracy } = await import("../stats.service.ts");

beforeEach(() => vi.clearAllMocks());

const row = (type: string, status: string, n: number) => ({
  type,
  status,
  _count: { _all: n },
});

describe("getAccuracy", () => {
  it("computes precision from resolved vs falsePositive only", async () => {
    groupBy.mockResolvedValue([
      row("gateOpen", "resolved", 3),
      row("gateOpen", "falsePositive", 1),
      row("gateOpen", "pending", 6),
      row("illegalParking", "pending", 2),
    ]);

    const result = await getAccuracy({});
    const gate = result.items.find((i) => i.type === "gateOpen");
    expect(gate).toMatchObject({
      total: 10,
      resolved: 3,
      falsePositive: 1,
      unreviewed: 6,
      precision: 0.75,
    });
    // Nothing judged yet: no ratio, instead of a misleading 0%.
    expect(result.items.find((i) => i.type === "illegalParking")?.precision)
      .toBeNull();
    expect(result.overall).toMatchObject({ total: 12, precision: 0.75 });
  });

  it("lists every event type, with zeros when there are no events", async () => {
    groupBy.mockResolvedValue([]);
    const result = await getAccuracy({});
    expect(result.items.length).toBeGreaterThan(1);
    expect(result.items.every((i) => i.total === 0 && i.precision === null))
      .toBe(true);
  });
});

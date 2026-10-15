import { describe, expect, it } from "vitest";
import { computeCoverage, segmentsAreContiguous } from "../compute-coverage.ts";

const d = (ms: number) => new Date(ms);

describe("computeCoverage", () => {
  it("no issues for contiguous", () => {
    const segs = [
      { id: "a", startedAt: d(0), durationSec: 60 },
      { id: "b", startedAt: d(60_000), durationSec: 60 },
    ];
    expect(computeCoverage(segs).issues).toHaveLength(0);
  });

  it("detects gap", () => {
    const segs = [
      { id: "a", startedAt: d(0), durationSec: 60 },
      { id: "b", startedAt: d(120_000), durationSec: 60 },
    ];
    const issues = computeCoverage(segs).issues;
    expect(issues[0]?.type).toBe("gap");
  });

  it("detects overlap", () => {
    const segs = [
      { id: "a", startedAt: d(0), durationSec: 60 },
      { id: "b", startedAt: d(30_000), durationSec: 60 },
    ];
    const issues = computeCoverage(segs).issues;
    expect(issues[0]?.type).toBe("overlap");
  });

  it("unknown when duration null", () => {
    const segs = [
      { id: "a", startedAt: d(0), durationSec: null },
      { id: "b", startedAt: d(60_000), durationSec: 60 },
    ];
    const issues = computeCoverage(segs).issues;
    expect(issues[0]?.type).toBe("unknown");
  });
});

describe("segmentsAreContiguous", () => {
  it("within tolerance", () => {
    const a = { id: "a", startedAt: d(0), durationSec: 60 };
    const b = { id: "b", startedAt: d(62_000), durationSec: 60 };
    expect(segmentsAreContiguous(a, b, 5)).toBe(true);
  });
  it("false when null duration", () => {
    const a = { id: "a", startedAt: d(0), durationSec: null };
    const b = { id: "b", startedAt: d(60_000), durationSec: 60 };
    expect(segmentsAreContiguous(a, b)).toBe(false);
  });
});

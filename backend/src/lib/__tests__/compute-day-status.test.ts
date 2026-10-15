import { describe, expect, it } from "vitest";
import { computeDayStatus } from "../compute-day-status.ts";

describe("computeDayStatus", () => {
  it("pending when no segments", () => {
    expect(computeDayStatus([])).toBe("pending");
  });
  it("processing when received or processing", () => {
    expect(computeDayStatus(["received", "completed"] as never)).toBe("processing");
    expect(computeDayStatus(["processing"] as never)).toBe("processing");
  });
  it("completed when all completed", () => {
    expect(computeDayStatus(["completed", "completed"] as never)).toBe("completed");
  });
  it("failed when all failed", () => {
    expect(computeDayStatus(["failed", "failed"] as never)).toBe("failed");
  });
  it("partial otherwise", () => {
    expect(computeDayStatus(["completed", "failed"] as never)).toBe("partial");
  });
});

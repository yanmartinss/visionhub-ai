import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDay,
  formatDuration,
  dayToInputDate,
  todayLocalDate,
  toApiDateTime,
} from "../format";

describe("format", () => {
  it("formatDay keeps UTC calendar day", () => {
    expect(formatDay("2026-09-20T00:00:00.000Z")).toBe("20/09/2026");
  });

  it("formatBytes formats magnitudes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0 MB");
  });

  it("formatDuration chooses sensible units", () => {
    expect(formatDuration(0)).toBe("0 s");
    expect(formatDuration(30)).toBe("30 s");
    expect(formatDuration(59)).toBe("59 s");
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(3599)).toBe("1 h");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(3660)).toBe("1 h 1 min");
    expect(formatDuration(-120)).toBe("2 min");
  });

  it("dayToInputDate slices the ISO date", () => {
    expect(dayToInputDate("2026-09-20T00:00:00.000Z")).toBe("2026-09-20");
  });

  it("todayLocalDate returns ISO YYYY-MM-DD", () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("toApiDateTime round-trips through Date", () => {
    const input = new Date().toISOString().slice(0, 16);
    const value = toApiDateTime(input);
    expect(new Date(value).toISOString()).toBe(new Date(input).toISOString());
  });
});
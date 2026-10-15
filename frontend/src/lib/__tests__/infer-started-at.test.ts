import { describe, expect, it } from "vitest";
import { inferStartedAt } from "../infer-started-at";

describe("inferStartedAt", () => {
  it("reads YYYYMMDDHHMMSS from a DVR filename", () => {
    expect(inferStartedAt("ch01_20260920080000.mp4")).toEqual({
      date: "2026-09-20",
      time: "08:00",
    });
  });

  it("reads split YYYYMMDD_HHMMSS", () => {
    expect(inferStartedAt("ch01_20260920_080000.mp4")).toEqual({
      date: "2026-09-20",
      time: "08:00",
    });
  });

  it("reads ISO-like filename with dashes", () => {
    expect(inferStartedAt("2026-09-20_08-00-00.mp4")).toEqual({
      date: "2026-09-20",
      time: "08:00",
    });
  });

  it("reads filename with spaces and dots", () => {
    expect(inferStartedAt("2026-09-20 08.00.00.mp4")).toEqual({
      date: "2026-09-20",
      time: "08:00",
    });
  });

  it("keeps minutes and not seconds in time", () => {
    expect(inferStartedAt("ch01_20260920081530.mp4")?.time).toBe("08:15");
  });

  it("returns null for names without a timestamp", () => {
    expect(inferStartedAt("recording.mp4")).toBeNull();
    expect(inferStartedAt("camera1 footage final.mp4")).toBeNull();
  });

  it("rejects invalid months", () => {
    expect(inferStartedAt("rec_20261320080000.mp4")).toBeNull();
  });

  it("rejects invalid hours", () => {
    expect(inferStartedAt("rec_20260920240000.mp4")).toBeNull();
  });

  it("rejects impossible calendar days", () => {
    expect(inferStartedAt("rec_20260230080000.mp4")).toBeNull();
  });
});
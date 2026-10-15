import { describe, expect, it } from "vitest";
import { buildFacts } from "../daily-summary.service.ts";

describe("daily-summary buildFacts", () => {
  it("formats a day with one event", () => {
    const day: any = {
      camera: { name: "Cam 1", location: "Portaria" },
      date: new Date("2026-09-20T00:00:00.000Z"),
      segments: [
        { id: "s1", status: "completed", startedAt: new Date("2026-09-20T11:00:00.000Z"), durationSec: 300 },
      ],
    };
    const events: any[] = [
      {
        type: "gateOpen",
        status: "pending",
        startedAt: new Date("2026-09-20T11:01:00.000Z"),
        endedAt: new Date("2026-09-20T11:02:00.000Z"),
        occurredAt: new Date("2026-09-20T11:01:00.000Z"),
        confidence: 0.9,
      },
    ];
    const facts = buildFacts(day, events);
    expect(facts).toContain("Cam 1");
    expect(facts).toContain("Total de eventos: 1");
    expect(facts).toContain("Portão aberto");
  });

  it("empty facts still returns header", () => {
    const day: any = {
      camera: { name: "Cam 1", location: "Portaria" },
      date: new Date("2026-09-20T00:00:00.000Z"),
      segments: [],
    };
    const facts = buildFacts(day, []);
    expect(facts).toContain("Total de eventos: 0");
  });
});

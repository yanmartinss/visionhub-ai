import { describe, expect, it } from "vitest";
import { explainEvent } from "../explain-event";
import type { EventDetail } from "../types";

const base: EventDetail = {
  id: "e1",
  type: "illegalParking",
  status: "pending",
  occurredAt: "2026-10-15T10:00:00Z",
  startedAt: "2026-10-15T10:00:00Z",
  endedAt: "2026-10-15T10:12:00Z",
  durationSec: 720,
  confidence: 0.87,
  technicalDescription: null,
  hasThumbnail: false,
  hasClip: false,
  camera: { id: "c1", name: "Garagem", location: "Bloco A" },
  recordingDay: null,
  detectionLabel: "car",
  containment: "inside",
  rule: { timeLimitSeconds: 300, active: true },
  areas: [],
  segment: null,
  offsetSec: 10,
};

describe("explainEvent", () => {
  it("explains detection, area and rule", () => {
    const text = explainEvent(base).join(" ");
    expect(text).toContain("um carro com 87% de confiança");
    expect(text).toContain("dentro de uma área «Proibido estacionar»");
    expect(text).toContain("mais de 5 min");
    expect(text).toContain("durou 12 min");
  });

  it("handles outside containment (pet waste)", () => {
    const text = explainEvent({
      ...base,
      type: "petWaste",
      detectionLabel: "pet_waste",
      containment: "outside",
      rule: { timeLimitSeconds: null, active: true },
    }).join(" ");
    expect(text).toContain("fora de todas as áreas «Lixeira»");
    expect(text).toContain("assim que a situação é detectada");
  });

  it("warns when the rule is gone or disabled", () => {
    expect(explainEvent({ ...base, rule: null }).join(" ")).toContain(
      "não tem mais uma regra",
    );
    expect(
      explainEvent({
        ...base,
        rule: { timeLimitSeconds: 60, active: false },
      }).join(" "),
    ).toContain("desativada");
  });
});

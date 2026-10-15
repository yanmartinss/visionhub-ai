import { describe, expect, it } from "vitest";
import {
  AREA_TYPE_INFO,
  describeRule,
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  WIZARD_EVENT_TYPES,
} from "../eventTypes";

describe("eventTypes", () => {
  it("lists eight event types", () => {
    expect(EVENT_TYPES).toHaveLength(8);
    expect(EVENT_TYPES).toContain("other");
  });

  it("wizard excludes other", () => {
    expect(WIZARD_EVENT_TYPES).not.toContain("other");
    expect(WIZARD_EVENT_TYPES).toHaveLength(7);
  });

  it("has metadata for every type", () => {
    for (const type of EVENT_TYPES) {
      expect(EVENT_TYPE_INFO[type]).toBeDefined();
      expect(EVENT_TYPE_INFO[type].label.length).toBeGreaterThan(0);
    }
  });

  it("area type colors are valid hex", () => {
    for (const type of Object.keys(AREA_TYPE_INFO) as (keyof typeof AREA_TYPE_INFO)[]) {
      expect(AREA_TYPE_INFO[type].color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("describeRule uses duration for time-limited types", () => {
    expect(describeRule("gateOpen", 180)).toBe(
      "Avisar quando o portão ficar aberto por mais de 3 min.",
    );
  });

  it("describeRule has no duration placeholder for instant types", () => {
    expect(describeRule("restrictedArea", null)).toBe(
      "Avisar quando alguém entrar na área restrita.",
    );
    expect(describeRule("childRunning", 60)).toBe(
      "Avisar quando uma criança correr no estacionamento.",
    );
  });
});
import { describe, expect, it } from "vitest";
import { pointInPolygon } from "../point-in-polygon.ts";

describe("pointInPolygon", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  it("inside square", () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
  });

  it("outside square", () => {
    expect(pointInPolygon({ x: 2, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, square)).toBe(false);
  });

  it("triangle", () => {
    const tri = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.2, y: 0.2 }, tri)).toBe(true);
    expect(pointInPolygon({ x: 0.8, y: 0.8 }, tri)).toBe(false);
  });
});

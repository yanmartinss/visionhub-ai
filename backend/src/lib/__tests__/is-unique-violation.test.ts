import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "../is-unique-violation.ts";

describe("isUniqueViolation", () => {
  it("true for prisma P2002", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });
  it("false otherwise", () => {
    expect(isUniqueViolation({ code: "P2003" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});

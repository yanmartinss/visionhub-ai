import { describe, expect, it } from "vitest";
import { AppError } from "../app-error.ts";

describe("AppError", () => {
  it("carries status and message", () => {
    const err = new AppError(404, "missing");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("missing");
    expect(err.name).toBe("AppError");
  });
});

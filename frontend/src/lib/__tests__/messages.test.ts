import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { describeError, describeSegmentError } from "../messages";

describe("messages", () => {
  it("describeError returns fallback for unknown errors", () => {
    expect(describeError(new Error("boom"), "fallback")).toBe("fallback");
  });

  it("describeError maps known API messages", () => {
    expect(describeError(new ApiError(400, "File is empty"), "fallback")).toBe(
      "O arquivo está vazio.",
    );
  });

  it("describeError falls back to raw message when unmapped", () => {
    expect(describeError(new ApiError(400, "Unknown reason"), "fallback")).toBe(
      "Unknown reason",
    );
  });

  it("describeSegmentError translates known segment errors", () => {
    expect(describeSegmentError("Download failed (HTTP 404)")).toBe(
      "O servidor do link respondeu erro 404.",
    );
    expect(describeSegmentError("Link must use https")).toBe(
      "O link precisa usar https.",
    );
  });

  it("describeSegmentError returns original for unknown", () => {
    expect(describeSegmentError("something else")).toBe("something else");
  });
});
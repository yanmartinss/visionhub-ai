import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "../app-error.ts";
import { validateLinkUrl } from "../validate-link-url.ts";

describe("validateLinkUrl", () => {
  const original = process.env.ALLOWED_LINK_DOMAINS;

  afterEach(() => {
    process.env.ALLOWED_LINK_DOMAINS = original;
  });

  it("requires https", () => {
    process.env.ALLOWED_LINK_DOMAINS = "example.com";
    expect(() => validateLinkUrl("http://example.com/file")).toThrow(AppError);
  });

  it("valid allowed domain", () => {
    process.env.ALLOWED_LINK_DOMAINS = "example.com";
    const url = validateLinkUrl("https://example.com/file.mp4");
    expect(url.hostname).toBe("example.com");
  });

  it("allows subdomain", () => {
    process.env.ALLOWED_LINK_DOMAINS = "example.com";
    const url = validateLinkUrl("https://cdn.example.com/file.mp4");
    expect(url.hostname).toBe("cdn.example.com");
  });

  it("rejects disallowed domain", () => {
    process.env.ALLOWED_LINK_DOMAINS = "example.com";
    expect(() => validateLinkUrl("https://other.com/file.mp4")).toThrow(AppError);
  });

  it("rejects credentials", () => {
    process.env.ALLOWED_LINK_DOMAINS = "example.com";
    expect(() => validateLinkUrl("https://user:pass@example.com/file")).toThrow(AppError);
  });
});

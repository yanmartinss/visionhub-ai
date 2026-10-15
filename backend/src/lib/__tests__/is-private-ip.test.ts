import { describe, expect, it } from "vitest";
import { isPrivateIp } from "../is-private-ip.ts";

describe("isPrivateIp", () => {
  it("private IPv4", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
  });
  it("public IPv4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
  it("invalid treated as private", () => {
    expect(isPrivateIp("not-ip")).toBe(true);
  });
  it("IPv6 loopback private", () => {
    expect(isPrivateIp("::1")).toBe(true);
  });
});

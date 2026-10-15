import { describe, expect, it } from "vitest";
import { canManageUser } from "../can-manage-user.ts";

describe("canManageUser", () => {
  const mk = (id: string, role: "admin" | "manager" | "employee", isMaster = false) => ({
    id,
    role,
    isMaster,
  });

  it("prevents managing itself", () => {
    const u = mk("1", "admin");
    expect(canManageUser(u, u)).toBe(false);
  });

  it("admin manages anyone else", () => {
    const a = mk("a", "admin");
    expect(canManageUser(a, mk("m", "manager"))).toBe(true);
    expect(canManageUser(a, mk("e", "employee"))).toBe(true);
  });

  it("manager manages employees", () => {
    expect(canManageUser(mk("m", "manager"), mk("e", "employee"))).toBe(true);
  });

  it("manager manages non-master managers when master", () => {
    expect(canManageUser(mk("m", "manager", true), mk("m2", "manager", false))).toBe(true);
  });

  it("denies other manager cases", () => {
    expect(canManageUser(mk("m", "manager"), mk("m2", "manager"))).toBe(false);
    expect(canManageUser(mk("m", "manager", false), mk("m2", "manager", false))).toBe(false);
    expect(canManageUser(mk("m", "manager"), mk("e2", "admin"))).toBe(false);
  });
});

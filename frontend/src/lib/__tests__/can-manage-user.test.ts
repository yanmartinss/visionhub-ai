import { describe, expect, it } from "vitest";
import { canManageUser } from "../can-manage-user";

const base = {
  id: "a",
  role: "employee" as const,
  isMaster: false,
};

describe("canManageUser", () => {
  it("never lets a user manage themselves", () => {
    expect(
      canManageUser({ ...base, id: "x", role: "admin" }, { ...base, id: "x" }),
    ).toBe(false);
  });

  it("admin manages everyone else", () => {
    const admin = { id: "admin", role: "admin" as const, isMaster: false };
    expect(canManageUser(admin, { ...base, id: "1" })).toBe(true);
    expect(canManageUser(admin, { ...base, id: "2", role: "manager" })).toBe(true);
    expect(canManageUser(admin, { ...base, id: "3", role: "admin" })).toBe(true);
  });

  it("manager manages employees", () => {
    const manager = { id: "m", role: "manager" as const, isMaster: false };
    expect(canManageUser(manager, { ...base, id: "e" })).toBe(true);
  });

  it("manager cannot manage admins or other managers by default", () => {
    const manager = { id: "m", role: "manager" as const, isMaster: false };
    expect(canManageUser(manager, { ...base, id: "a", role: "admin" })).toBe(false);
    expect(
      canManageUser(manager, { ...base, id: "m2", role: "manager" }),
    ).toBe(false);
  });

  it("master manager can manage non-master managers", () => {
    const master = { id: "m", role: "manager" as const, isMaster: true };
    expect(
      canManageUser(master, { ...base, id: "m2", role: "manager", isMaster: false }),
    ).toBe(true);
  });

  it("non-master manager cannot manage another manager", () => {
    const manager = { id: "m", role: "manager" as const, isMaster: false };
    expect(
      canManageUser(manager, { ...base, id: "m2", role: "manager", isMaster: true }),
    ).toBe(false);
  });
});
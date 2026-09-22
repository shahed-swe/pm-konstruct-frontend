/**
 * The client's copy of the access rules, checked against the server's.
 *
 * These assertions are the same ones `pmk-domain`'s `access` tests make, in
 * the same order, because the whole point of this module is that the two
 * agree. A divergence here means a button that fails when pressed, or a page
 * hidden from someone entitled to it.
 */
import { describe, expect, it } from "vitest";
import type { PermissionDto, UserDto } from "@/lib/api/types";
import { canAccess, canEdit, entitlementAllows, hasPermission, isManagerOrSupervisor } from "./permissions";

const user = (role: string): Pick<UserDto, "role"> => ({ role });
const perms = (...pairs: string[]): PermissionDto[] =>
  pairs.map((p) => {
    const [resource = "", action = ""] = p.split(":");
    return { resource, action };
  });

describe("hasPermission", () => {
  it("lets a manager through without consulting the rows", () => {
    // Matches `Role::bypasses_permission_checks` on the server, which is why
    // a manager with no permission rows at all still edits everything.
    expect(hasPermission(user("MANAGER"), [], "jobs", "write")).toBe(true);
    expect(hasPermission(user("MANAGER"), [], "anything", "at-all")).toBe(true);
  });

  it("requires an exact row for everyone else", () => {
    expect(hasPermission(user("SUPERVISOR"), perms("jobs:read"), "jobs", "read")).toBe(true);
    expect(hasPermission(user("SUPERVISOR"), perms("jobs:read"), "jobs", "write")).toBe(false);
  });

  it("denies when nobody is signed in", () => {
    expect(hasPermission(null, perms("jobs:read"), "jobs", "read")).toBe(false);
  });
});

describe("canAccess", () => {
  it("opens the dashboard and settings to any signed-in user", () => {
    expect(canAccess(user("OFFICE"), [], "dashboard")).toBe(true);
    expect(canAccess(user("OFFICE"), [], "settings")).toBe(true);
  });

  it("keeps users and billing to managers", () => {
    expect(canAccess(user("SUPERVISOR"), perms("users:read"), "users")).toBe(false);
    expect(canAccess(user("MANAGER"), [], "users")).toBe(true);
  });

  it("gates progress on jobs:read, as the legacy did", () => {
    // Preserved deliberately -- see docs/audit/preserved-quirks.md. A
    // `progress` resource would be correct and would also take the page away
    // from every supervisor who has it today.
    expect(canAccess(user("SUPERVISOR"), perms("jobs:read"), "progress")).toBe(true);
    expect(canAccess(user("SUPERVISOR"), perms("progress:read"), "progress")).toBe(false);
  });

  it("denies an area it has never heard of", () => {
    expect(canAccess(user("SUPERVISOR"), perms("whatever:read"), "whatever")).toBe(false);
    expect(canAccess(user("MANAGER"), [], "whatever")).toBe(true);
  });
});

describe("canEdit", () => {
  it("needs an explicit write grant below manager", () => {
    expect(canEdit(user("SUPERVISOR"), perms("site-diary:read"), "site-diary")).toBe(false);
    expect(canEdit(user("SUPERVISOR"), perms("site-diary:write"), "site-diary")).toBe(true);
  });

  it("has nothing to say about areas without a write gate", () => {
    expect(canEdit(user("SUPERVISOR"), perms("reports:write"), "reports")).toBe(false);
  });
});

describe("isManagerOrSupervisor", () => {
  it("is what the forms pages are gated on", () => {
    expect(isManagerOrSupervisor(user("MANAGER"))).toBe(true);
    expect(isManagerOrSupervisor(user("SUPERVISOR"))).toBe(true);
    expect(isManagerOrSupervisor(user("OFFICE"))).toBe(false);
    expect(isManagerOrSupervisor(null)).toBe(false);
  });
});

describe("entitlementAllows", () => {
  const paid = { accessAllowed: true, onboardingComplete: true };

  it("requires onboarding for the application", () => {
    expect(entitlementAllows(paid, "app")).toBe(true);
    expect(entitlementAllows({ accessAllowed: true, onboardingComplete: false }, "app")).toBe(false);
  });

  it("lets a half-onboarded manager reach settings to finish", () => {
    // Otherwise the only page that can fix the subscription is behind the
    // subscription.
    expect(entitlementAllows({ accessAllowed: true, onboardingComplete: false }, "settings")).toBe(true);
  });

  it("denies when there is no entitlement at all", () => {
    expect(entitlementAllows(null, "app")).toBe(false);
    expect(entitlementAllows(null, "settings")).toBe(false);
  });
});

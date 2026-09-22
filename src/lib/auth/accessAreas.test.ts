import { describe, expect, it } from "vitest";
import { levelOf, toPermissions, withLevel } from "./accessAreas";

describe("levelOf", () => {
  it("reads write as edit, read as view, neither as none", () => {
    expect(levelOf("jobs", new Set(["jobs:read", "jobs:write"]))).toBe("edit");
    expect(levelOf("jobs", new Set(["jobs:read"]))).toBe("view");
    expect(levelOf("jobs", new Set())).toBe("none");
  });

  it("treats a stray write without read as edit", () => {
    // Data from before the UI enforced the pairing. Showing "none" would
    // invite a manager to re-grant something already granted.
    expect(levelOf("jobs", new Set(["jobs:write"]))).toBe("edit");
  });
});

describe("withLevel", () => {
  it("grants read alongside write", () => {
    const next = withLevel("jobs", "edit", new Set());
    expect([...next].sort()).toEqual(["jobs:read", "jobs:write"]);
  });

  it("drops write when moving down to view", () => {
    const next = withLevel("jobs", "view", new Set(["jobs:read", "jobs:write"]));
    expect([...next]).toEqual(["jobs:read"]);
  });

  it("removes both at none", () => {
    expect(withLevel("jobs", "none", new Set(["jobs:read", "jobs:write"])).size).toBe(0);
  });

  it("leaves other areas alone", () => {
    const next = withLevel("jobs", "none", new Set(["jobs:read", "reports:read"]));
    expect([...next]).toEqual(["reports:read"]);
  });
});

describe("toPermissions", () => {
  it("splits the keys back into rows", () => {
    expect(toPermissions(new Set(["jobs:read"]))).toEqual([{ resource: "jobs", action: "read" }]);
  });

  it("drops anything that is not a pair", () => {
    // Defensive: a malformed key would otherwise become a row with an
    // undefined action and be rejected by the API with no explanation.
    expect(toPermissions(new Set(["nonsense"]))).toEqual([]);
  });
});

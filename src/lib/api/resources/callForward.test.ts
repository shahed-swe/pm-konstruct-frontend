import { describe, expect, it } from "vitest";
import { buildTree, flattenTree } from "./callForward";
import type { CallForwardDto } from "@/lib/api/types";

function item(
  id: number,
  parentId: number | null,
  sortOrder: number,
  title = `item ${id}`,
): CallForwardDto {
  return {
    id,
    jobId: 1,
    title,
    itemType: "TRADE",
    supplierTrade: null,
    estStart: null,
    estFinish: null,
    actualStart: null,
    actualFinish: null,
    status: "not_started",
    notes: null,
    sortOrder,
    parentId,
    delayStatus: "on_track",
    delayDays: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("buildTree", () => {
  it("nests children under their parent, in sort order", () => {
    const tree = buildTree([
      item(3, 1, 2, "second child"),
      item(1, null, 1, "stage"),
      item(2, 1, 1, "first child"),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.title).toBe("stage");
    expect(tree[0]?.children.map((c) => c.title)).toEqual(["first child", "second child"]);
  });

  it("records the depth each item draws at", () => {
    const tree = buildTree([item(1, null, 1), item(2, 1, 1), item(3, 2, 1)]);
    expect(flattenTree(tree).map((n) => n.depth)).toEqual([0, 1, 2]);
  });

  it("treats an item whose parent is missing as a root", () => {
    // A filtered list, or a parent deleted from under it. Dropping the item
    // would make it vanish from the board with no explanation.
    const tree = buildTree([item(2, 99, 1, "orphan")]);
    expect(tree.map((n) => n.title)).toEqual(["orphan"]);
  });

  it("falls back to the id when two siblings share a sort order", () => {
    // Bulk imports and template applications can produce ties, and a board
    // that reshuffles itself between loads looks broken.
    const tree = buildTree([item(5, null, 1), item(4, null, 1)]);
    expect(tree.map((n) => n.id)).toEqual([4, 5]);
  });

  it("returns nothing for an empty programme", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("flattenTree", () => {
  it("walks depth first, which is the order the board draws", () => {
    const tree = buildTree([
      item(1, null, 1, "a"),
      item(2, 1, 1, "a.1"),
      item(3, null, 2, "b"),
      item(4, 1, 2, "a.2"),
    ]);
    expect(flattenTree(tree).map((n) => n.title)).toEqual(["a", "a.1", "a.2", "b"]);
  });
});

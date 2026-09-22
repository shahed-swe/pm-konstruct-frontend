import { describe, expect, it } from "vitest";
import { addMonths, eventsByDay, monthGrid, monthKey, parseMonthKey } from "./month";

describe("monthGrid", () => {
  it("always returns six weeks, so the grid does not change height", () => {
    for (const key of ["2026-02", "2026-08", "2027-01"]) {
      expect(monthGrid(key, "2026-09-22")).toHaveLength(42);
    }
  });

  it("starts the week on Monday", () => {
    // 1 September 2026 is a Tuesday, so the grid opens on Monday the 31st.
    const grid = monthGrid("2026-09", "2026-09-22");
    expect(grid[0]?.key).toBe("2026-08-31");
    expect(grid[1]?.key).toBe("2026-09-01");
  });

  it("marks which days belong to the month", () => {
    const grid = monthGrid("2026-09", "2026-09-22");
    expect(grid[0]?.inMonth).toBe(false);
    expect(grid[1]?.inMonth).toBe(true);
  });

  it("marks today", () => {
    const grid = monthGrid("2026-09", "2026-09-22");
    expect(grid.filter((d) => d.isToday).map((d) => d.key)).toEqual(["2026-09-22"]);
  });

  it("handles a leap February", () => {
    const grid = monthGrid("2028-02", "2026-09-22");
    expect(grid.some((d) => d.key === "2028-02-29")).toBe(true);
  });

  it("returns nothing for a key it cannot read", () => {
    expect(monthGrid("nonsense", "2026-09-22")).toEqual([]);
  });
});

describe("addMonths", () => {
  it("steps forwards and backwards across a year boundary", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("steps by more than a year", () => {
    expect(addMonths("2026-09", 14)).toBe("2027-11");
    expect(addMonths("2026-09", -14)).toBe("2025-07");
  });

  it("leaves an unreadable key alone rather than inventing one", () => {
    expect(addMonths("rubbish", 1)).toBe("rubbish");
  });
});

describe("parseMonthKey and monthKey", () => {
  it("round-trip", () => {
    expect(parseMonthKey(monthKey(2026, 8))).toEqual({ year: 2026, month: 8 });
  });

  it("rejects a month outside the year", () => {
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-00")).toBeNull();
  });
});

describe("eventsByDay", () => {
  it("puts a multi-day event on every day it covers", () => {
    // A trade booked Monday to Thursday has to be visible on the Wednesday
    // somebody is looking at.
    const map = eventsByDay([{ start: "2026-09-21", end: "2026-09-24" }]);
    expect([...map.keys()].sort()).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]);
  });

  it("does not shift a day across a timezone", () => {
    // Parsed as a local `Date`, an ISO date in Australia lands on the
    // previous day in UTC -- which is how a Monday inspection gets drawn on
    // the Sunday.
    const map = eventsByDay([{ start: "2026-09-21T00:00:00+10:00", end: "" }]);
    expect([...map.keys()]).toEqual(["2026-09-21"]);
  });

  it("treats an end before the start as a single day", () => {
    const map = eventsByDay([{ start: "2026-09-21", end: "2026-09-01" }]);
    expect([...map.keys()]).toEqual(["2026-09-21"]);
  });

  it("skips a row it cannot read rather than throwing", () => {
    expect(eventsByDay([{ start: "", end: "" }]).size).toBe(0);
    expect(eventsByDay([{ start: "not-a-date", end: "also-not" }]).size).toBe(0);
  });
});

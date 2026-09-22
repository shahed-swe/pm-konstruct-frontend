import { describe, expect, it } from "vitest";
import { addDays, coversDay, weekDays, weekStart } from "./week";

describe("weekStart", () => {
  it("finds the Monday of the week", () => {
    // 22 September 2026 is a Tuesday.
    expect(weekStart("2026-09-22")).toBe("2026-09-21");
  });

  it("leaves a Monday alone", () => {
    expect(weekStart("2026-09-21")).toBe("2026-09-21");
  });

  it("treats Sunday as the end of its week, not the start of the next", () => {
    expect(weekStart("2026-09-27")).toBe("2026-09-21");
  });

  it("crosses a month boundary", () => {
    expect(weekStart("2026-10-01")).toBe("2026-09-28");
  });

  it("returns the input it cannot read rather than inventing a date", () => {
    expect(weekStart("rubbish")).toBe("rubbish");
  });
});

describe("addDays", () => {
  it("steps across a month and a year", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("steps across a daylight-saving change without losing a day", () => {
    // Australia moves its clocks on the first Sunday in October. Arithmetic
    // on local `Date`s drops or repeats a day here; UTC midnights do not.
    expect(addDays("2026-10-03", 1)).toBe("2026-10-04");
    expect(addDays("2026-10-04", 1)).toBe("2026-10-05");
  });
});

describe("weekDays", () => {
  it("returns Monday to Sunday", () => {
    const days = weekDays("2026-09-21", "2026-09-22");
    expect(days).toHaveLength(7);
    expect(days[0]?.key).toBe("2026-09-21");
    expect(days[6]?.key).toBe("2026-09-27");
  });

  it("marks the weekend and today", () => {
    const days = weekDays("2026-09-21", "2026-09-22");
    expect(days.filter((d) => d.isWeekend).map((d) => d.key)).toEqual([
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(days.filter((d) => d.isToday).map((d) => d.key)).toEqual(["2026-09-22"]);
  });
});

describe("coversDay", () => {
  const absence = { startDate: "2026-09-21", endDate: "2026-09-23" };

  it("includes both ends", () => {
    expect(coversDay(absence, "2026-09-21")).toBe(true);
    expect(coversDay(absence, "2026-09-23")).toBe(true);
  });

  it("excludes the days either side", () => {
    expect(coversDay(absence, "2026-09-20")).toBe(false);
    expect(coversDay(absence, "2026-09-24")).toBe(false);
  });

  it("handles a single-day absence", () => {
    expect(coversDay({ startDate: "2026-09-22", endDate: "2026-09-22" }, "2026-09-22")).toBe(true);
  });
});

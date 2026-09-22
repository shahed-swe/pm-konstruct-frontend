/**
 * The grid a month calendar draws.
 *
 * Weeks start on Monday, as they do everywhere else in this product: this is
 * an Australian building company and a Sunday-first grid splits the weekend.
 *
 * Everything here works on `YYYY-MM-DD` strings rather than `Date` objects.
 * A calendar day on a building site is a day, not an instant, and parsing
 * one into a `Date` shifts it across a timezone boundary -- which is how a
 * Monday inspection ends up drawn on the Sunday.
 */

export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  key: string;
  dayOfMonth: number;
  /** False for the days either side that fill the first and last weeks. */
  inMonth: boolean;
  isToday: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** `2026-09` for a month, which is what the API's `month` parameter takes. */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (match === null) return null;
  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10) - 1;
  if (!Number.isFinite(year) || month < 0 || month > 11) return null;
  return { year, month };
}

export function addMonths(key: string, delta: number): string {
  const parsed = parseMonthKey(key);
  if (parsed === null) return key;
  const total = parsed.year * 12 + parsed.month + delta;
  return monthKey(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

/**
 * Six weeks of days, Monday first.
 *
 * Always six, so the grid does not change height between months -- a
 * calendar that jumps when you page through it is unpleasant to use.
 */
export function monthGrid(key: string, todayKey: string): CalendarDay[] {
  const parsed = parseMonthKey(key);
  if (parsed === null) return [];
  const { year, month } = parsed;

  const first = new Date(Date.UTC(year, month, 1));
  // `getUTCDay` is 0 for Sunday; shift so Monday is 0.
  const leading = (first.getUTCDay() + 6) % 7;

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(Date.UTC(year, month, 1 - leading + i));
    const dayKeyValue = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    days.push({
      key: dayKeyValue,
      dayOfMonth: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: dayKeyValue === todayKey,
    });
  }
  return days;
}

/**
 * Groups events onto the days they cover.
 *
 * An event spanning several days appears on each of them, which is what a
 * month grid needs -- a trade booked Monday to Thursday should be visible on
 * the Wednesday somebody is looking at.
 */
export function eventsByDay<T extends { start: string; end: string }>(
  events: T[],
): Map<string, T[]> {
  const out = new Map<string, T[]>();

  for (const event of events) {
    const start = event.start.slice(0, 10);
    const end = (event.end === "" ? event.start : event.end).slice(0, 10);
    if (start === "") continue;

    // Walked as UTC dates but keyed as strings, so no timezone is involved.
    const from = new Date(`${start}T00:00:00Z`);
    const to = new Date(`${end < start ? start : end}T00:00:00Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) continue;

    // A guard against a bad row spanning years and building a huge map.
    const maxDays = 400;
    for (let i = 0; i <= maxDays; i++) {
      const at = new Date(from.getTime() + i * 86_400_000);
      if (at > to) break;
      const key = `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
      out.set(key, [...(out.get(key) ?? []), event]);
    }
  }

  return out;
}

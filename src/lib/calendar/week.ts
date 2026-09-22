/**
 * The week the trade scheduler shows.
 *
 * Monday to Sunday, in `YYYY-MM-DD` strings for the same reason as the
 * month grid: a day on site is a calendar day, not an instant.
 */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function keyOf(at: Date): string {
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

/** The Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const at = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(at.getTime())) return day;
  // `getUTCDay` is 0 for Sunday; shift so Monday is 0.
  const offset = (at.getUTCDay() + 6) % 7;
  return keyOf(new Date(at.getTime() - offset * 86_400_000));
}

export function addDays(day: string, delta: number): string {
  const at = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(at.getTime())) return day;
  return keyOf(new Date(at.getTime() + delta * 86_400_000));
}

export interface WeekDay {
  key: string;
  label: string;
  isWeekend: boolean;
  isToday: boolean;
}

export function weekDays(start: string, todayKey: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const at = new Date(`${key}T00:00:00Z`);
    return {
      key,
      label: at.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      isWeekend: at.getUTCDay() === 0 || at.getUTCDay() === 6,
      isToday: key === todayKey,
    };
  });
}

/** Whether a worker's absence covers a day. Both ends inclusive. */
export function coversDay(
  absence: { startDate: string; endDate: string },
  day: string,
): boolean {
  return absence.startDate <= day && day <= absence.endDate;
}

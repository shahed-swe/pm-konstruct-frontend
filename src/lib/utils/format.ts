/**
 * Dates and numbers, formatted the way the current app formats them.
 *
 * `dd MMM yyyy` throughout, because the client is Australian and `MM/dd` is
 * ambiguous to them. Times are what the API sends -- a diary entry's time is
 * a wall clock on site, not an instant, so it is never converted.
 */
import { format, isValid, parseISO } from "date-fns";

/** A date-only string (`2026-09-22`) or an instant, as `22 Sep 2026`. */
export function formatDate(value: string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : fallback;
}

export function formatDateTime(value: string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy, h:mm a") : fallback;
}

/** `2026-09-22`, for a date input or a query parameter. */
export function toDateInput(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "";
}

export function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** `on_hold` as `On hold`. Statuses arrive from the API in snake case. */
export function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

"use client";

/**
 * The programme as a bar chart across time.
 *
 * Only the estimated window is drawn as the bar; the actual dates are a
 * second, thinner bar beneath it, so a slip reads as two bars that do not
 * line up rather than as a colour somebody has to remember the meaning of.
 *
 * Laid out in days from the earliest date in the set. Everything is
 * `YYYY-MM-DD` arithmetic on UTC midnights, for the same reason as the
 * calendar: a site day is a day, not an instant.
 */
import Link from "next/link";
import { useMemo } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type { CalendarEventDto } from "@/lib/api/types";

const DAY_MS = 86_400_000;

function toUtc(day: string | null): number | null {
  if (day === null || day === "") return null;
  const at = Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(at) ? null : at;
}

interface Bar {
  event: CalendarEventDto;
  estFromDay: number;
  estDays: number;
  actualFromDay: number | null;
  actualDays: number;
  late: boolean;
}

export function GanttChart({
  events,
  isLoading,
}: {
  events: CalendarEventDto[] | undefined;
  isLoading: boolean;
}) {
  const { bars, totalDays, origin } = useMemo(() => {
    const rows = (events ?? []).filter(
      (e) => toUtc(e.estStart) !== null || toUtc(e.actualStart) !== null,
    );

    const stamps = rows.flatMap((e) =>
      [toUtc(e.estStart), toUtc(e.estFinish), toUtc(e.actualStart), toUtc(e.actualFinish)].filter(
        (v): v is number => v !== null,
      ),
    );
    if (stamps.length === 0) return { bars: [] as Bar[], totalDays: 0, origin: 0 };

    const first = Math.min(...stamps);
    const last = Math.max(...stamps);
    const span = Math.max(1, Math.round((last - first) / DAY_MS) + 1);

    const built: Bar[] = rows.map((event) => {
      const estStart = toUtc(event.estStart);
      const estFinish = toUtc(event.estFinish) ?? estStart;
      const actualStart = toUtc(event.actualStart);
      const actualFinish = toUtc(event.actualFinish) ?? actualStart;

      // A single-day item still needs a bar wide enough to see.
      const estDays =
        estStart === null || estFinish === null
          ? 1
          : Math.max(1, Math.round((estFinish - estStart) / DAY_MS) + 1);

      return {
        event,
        estFromDay: estStart === null ? 0 : Math.round((estStart - first) / DAY_MS),
        estDays,
        actualFromDay: actualStart === null ? null : Math.round((actualStart - first) / DAY_MS),
        actualDays:
          actualStart === null || actualFinish === null
            ? 1
            : Math.max(1, Math.round((actualFinish - actualStart) / DAY_MS) + 1),
        late:
          estFinish !== null && actualFinish !== null
            ? actualFinish > estFinish
            : estFinish !== null && actualStart === null
              ? estFinish < Date.now()
              : false,
      };
    });

    return { bars: built, totalDays: span, origin: first };
  }, [events]);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <EmptyState
        title="Nothing to chart"
        description="Programme items need an estimated start before they can be drawn."
      />
    );
  }

  const pct = (days: number) => `${(days / totalDays) * 100}%`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] text-sm">
        <caption className="sr-only">
          The programme from {formatDate(new Date(origin).toISOString())}, estimated dates above
          actual
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-64 pb-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Item
            </th>
            <th scope="col" className="pb-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Timeline
            </th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.event.id} className="border-t">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                <Link href={bar.event.url} className="block truncate hover:text-primary">
                  {bar.event.title}
                </Link>
                <span className="block truncate text-xs text-muted-foreground">
                  {bar.event.jobNumber}
                  {bar.event.supplierTrade !== null && ` · ${bar.event.supplierTrade}`}
                </span>
              </th>
              <td className="py-2">
                <div className="relative h-8">
                  <div
                    className={cn(
                      "absolute top-0 h-3 rounded-sm",
                      bar.late ? "bg-red-500/70" : "bg-primary/70",
                    )}
                    style={{ left: pct(bar.estFromDay), width: pct(bar.estDays) }}
                    title={`Planned ${formatDate(bar.event.estStart)} – ${formatDate(bar.event.estFinish)}`}
                  />
                  {bar.actualFromDay !== null && (
                    <div
                      className="absolute top-4 h-2 rounded-sm bg-emerald-500/70"
                      style={{ left: pct(bar.actualFromDay), width: pct(bar.actualDays) }}
                      title={`Actual ${formatDate(bar.event.actualStart)} – ${formatDate(bar.event.actualFinish)}`}
                    />
                  )}
                </div>
                <span className="sr-only">
                  Planned {formatDate(bar.event.estStart)} to {formatDate(bar.event.estFinish)}
                  {bar.actualFromDay !== null &&
                    `, actual ${formatDate(bar.event.actualStart)} to ${formatDate(bar.event.actualFinish)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-primary/70" aria-hidden="true" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-emerald-500/70" aria-hidden="true" /> Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-red-500/70" aria-hidden="true" /> Late
        </span>
      </p>
    </div>
  );
}

"use client";

/**
 * The calendar: what is happening on every site, by month.
 *
 * Everything is keyed on `YYYY-MM-DD` strings rather than `Date` objects. A
 * day on a building site is a calendar day, not an instant, and parsing one
 * into a `Date` shifts it across a timezone boundary -- which is how a
 * Monday inspection gets drawn on the Sunday.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { useCalendar, useCalendarFilters } from "@/lib/api/resources/dashboard";
import { addMonths, eventsByDay, monthGrid, monthKey } from "@/lib/calendar/month";
import { cn } from "@/lib/utils/cn";
import { today } from "@/lib/utils/format";
import type { CalendarEventDto } from "@/lib/api/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const TYPE_STYLE: Record<string, string> = {
  stage_claim: "bg-primary/15 text-primary",
  task: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  header: "bg-secondary text-secondary-foreground",
  diary: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  inspection: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function monthName(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function DashboardCalendar() {
  const now = today();
  const [month, setMonth] = useState(() => monthKey(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1));
  const [jobId, setJobId] = useState<string>("all");
  const [supervisorId, setSupervisorId] = useState<string>("all");

  const { data: filters } = useCalendarFilters();
  const { data: events, isLoading } = useCalendar({
    month,
    ...(jobId === "all" ? {} : { jobId: Number.parseInt(jobId, 10) }),
    ...(supervisorId === "all" ? {} : { supervisorId: Number.parseInt(supervisorId, 10) }),
  });

  const grid = useMemo(() => monthGrid(month, now), [month, now]);
  const byDay = useMemo(() => eventsByDay(events ?? []), [events]);

  return (
    <section aria-labelledby="calendar-heading" className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b p-3">
        <h2 id="calendar-heading" className="text-sm font-semibold">
          {monthName(month)}
        </h2>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Previous month"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => setMonth(monthKey(Number(now.slice(0, 4)), Number(now.slice(5, 7)) - 1))}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger className="h-8 w-44 text-xs" aria-label="Filter the calendar by job">
            <SelectValue placeholder="All jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {(filters?.jobs ?? []).map((job) => (
              <SelectItem key={job.id} value={String(job.id)}>
                {job.jobNumber} — {job.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supervisorId} onValueChange={setSupervisorId}>
          <SelectTrigger className="h-8 w-40 text-xs" aria-label="Filter the calendar by supervisor">
            <SelectValue placeholder="All supervisors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All supervisors</SelectItem>
            {(filters?.supervisors ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {isLoading ? (
        <div className="p-3">
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[44rem] p-3">
            <div className="grid grid-cols-7 gap-px" role="grid" aria-label={monthName(month)}>
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  role="columnheader"
                  className="pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {grid.map((day) => {
                const items = byDay.get(day.key) ?? [];
                return (
                  <div
                    key={day.key}
                    role="gridcell"
                    className={cn(
                      "min-h-24 rounded-md border p-1",
                      !day.inMonth && "bg-muted/30 text-muted-foreground",
                      day.isToday && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <p className={cn("mb-1 text-xs", day.isToday && "font-bold text-primary")}>
                      {day.dayOfMonth}
                    </p>

                    <ul className="space-y-0.5">
                      {items.slice(0, 3).map((event: CalendarEventDto) => (
                        <li key={`${event.id}-${day.key}`}>
                          <Link
                            href={event.url}
                            title={`${event.jobNumber} — ${event.title}`}
                            className={cn(
                              "block truncate rounded px-1 py-0.5 text-[11px] hover:underline",
                              TYPE_STYLE[event.type] ?? "bg-muted",
                            )}
                          >
                            {event.title}
                          </Link>
                        </li>
                      ))}
                      {items.length > 3 && (
                        <li className="px-1 text-[10px] text-muted-foreground">
                          +{items.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

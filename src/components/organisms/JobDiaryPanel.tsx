"use client";

/**
 * The job's recent diary entries.
 *
 * The last seven days by default, with everything behind a toggle: a
 * long-running job has hundreds of entries and the panel is a glance, not
 * the diary screen.
 */
import { BookOpen, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { useDiaryEntries } from "@/lib/api/resources/diary";
import { formatDate } from "@/lib/utils/format";

const WINDOW_DAYS = 7;

export function JobDiaryPanel({ jobId }: { jobId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: entries, isLoading } = useDiaryEntries({ jobId });

  const { recent, all } = useMemo(() => {
    const sorted = [...(entries ?? [])].sort(
      (a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? ""),
    );
    // A plain string comparison on the ISO date, not a parsed one: the date
    // is a calendar day on site, and parsing it into an instant shifts it
    // across a timezone boundary.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return { recent: sorted.filter((e) => e.date >= cutoffKey), all: sorted };
  }, [entries]);

  const shown = expanded ? all : recent;

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            {expanded ? "Site diary" : "Recent site diary"}
            {!isLoading && !expanded && recent.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                {recent.length} this week
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7" asChild>
            <Link href={`/site-diary?jobId=${jobId}`}>
              <ExternalLink className="h-3 w-3" /> Open diary
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0" aria-busy={isLoading}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-4/5" />
          </div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <BookOpen className="mx-auto mb-2 h-7 w-7 opacity-30" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No diary entries in the last {WINDOW_DAYS} days.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href={`/site-diary/new?jobId=${jobId}`}>
                <Plus className="h-3.5 w-3.5" /> Add an entry
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {shown.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/site-diary/${entry.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatDate(entry.date)}
                      {entry.time !== null && (
                        <span className="ml-2 text-xs text-muted-foreground">{entry.time}</span>
                      )}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {entry.workCompleted}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && all.length > recent.length && (
          <div className="border-t p-2 text-center">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show only this week" : `Show all ${all.length} entries`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * The dashboard.
 *
 * Four things, in the order a manager wants them: the counts, what needs
 * doing, what is coming up, and the calendar. The Gantt view lives behind
 * the same tab strip as the calendar because they answer the same question
 * at different zoom levels.
 */
import { AlertTriangle, CalendarDays, GanttChartSquare } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/Tabs";
import { ActionBoard } from "@/components/organisms/ActionBoard";
import { DashboardCalendar } from "@/components/organisms/DashboardCalendar";
import { DashboardStats } from "@/components/organisms/DashboardStats";
import { GanttChart } from "@/components/organisms/GanttChart";
import { useCalendar, useDelaySeverity, useUpcomingClaims } from "@/lib/api/resources/dashboard";
import { useJobLabel } from "@/lib/jobs/useJobLabel";
import { formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";

/**
 * The dashboard's delay buckets are 7/14/28 days.
 *
 * The reports use 3/7/14. Both are kept: managers read both screens and have
 * calibrated to them, and aligning the numbers would silently reclassify
 * historical delays on one of the two. See `docs/audit/preserved-quirks.md`.
 */
function DelaySeverity() {
  const { data, isLoading } = useDelaySeverity();

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if ((data ?? []).length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" /> How late things are
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(data ?? []).map((band) => (
            <div key={band.label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{band.label}</dt>
              <dd className="text-lg font-semibold">{band.count}</dd>
              {band.count > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {band.avgDays} days on average, {band.maxDays} at worst
                </p>
              )}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function UpcomingClaims() {
  const { data, isLoading } = useUpcomingClaims();
  const labelJob = useJobLabel();

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card>
      <CardHeader className="border-b px-4 py-2.5">
        <CardTitle className="text-sm">Stage claims coming up</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {(data ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No stage claims due.
          </p>
        ) : (
          <ul className="divide-y">
            {(data ?? []).slice(0, 8).map((claim) => (
              <li key={claim.id}>
                <Link
                  href={`/jobs/${claim.jobId}/call-forward`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-muted/30"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{claim.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {labelJob({
                      jobNumber: claim.jobNumber,
                      jobName: claim.jobName,
                      jobAddress: claim.jobAddress,
                    })}
                  </span>
                  <Badge variant="outline">{formatDate(claim.estFinish)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GanttPanel() {
  // The Gantt spans everything rather than one month; the API's parameter is
  // still called `gantt`, which is what the legacy named it.
  const { data, isLoading } = useCalendar({ gantt: true });
  return <GanttChart events={data} isLoading={isLoading} />;
}

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <PageHeader
        title={firstName === "" ? "Dashboard" : `Good to see you, ${firstName}`}
        description="What needs doing, and what is coming."
      />

      <DashboardStats />

      <section aria-labelledby="actions-heading" className="mb-6">
        <h2 id="actions-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Needs attention
        </h2>
        <ActionBoard />
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DelaySeverity />
        <UpcomingClaims />
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="mb-3">
          <TabsTrigger value="calendar">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="gantt">
            <GanttChartSquare className="h-3.5 w-3.5" aria-hidden="true" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <DashboardCalendar />
        </TabsContent>

        <TabsContent value="gantt">
          <div className="rounded-xl border bg-card p-4">
            <GanttPanel />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

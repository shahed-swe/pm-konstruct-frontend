"use client";

/**
 * The row of counts at the top of the dashboard.
 *
 * Each one opens the list behind it rather than being a dead number: "12
 * overdue" is only useful if you can see which twelve. The list is fetched
 * when it is opened, not with the count.
 */
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  PhoneForwarded,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import {
  useCallForwardList,
  useDashboardList,
  useDashboardStats,
  useRecentDiaryList,
} from "@/lib/api/resources/dashboard";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type StatKey =
  | "total"
  | "active"
  | "completed"
  | "openCf"
  | "overdueCf"
  | "diary"
  | "users";

interface Stat {
  key: StatKey;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  value: number | null;
  tone?: string;
  /** Manager-only stats have no list of their own. */
  openable: boolean;
}

function StatList({ statKey, onClose }: { statKey: StatKey; onClose: () => void }) {
  const jobsKind =
    statKey === "total" ? "jobs-list" : statKey === "active" ? "active-jobs-list" : "completed-jobs-list";
  const isJobs = statKey === "total" || statKey === "active" || statKey === "completed";
  const isCf = statKey === "openCf" || statKey === "overdueCf";

  const jobs = useDashboardList(jobsKind, isJobs);
  const cf = useCallForwardList(statKey === "overdueCf" ? "overdue-list" : "open-cf-list", isCf);
  const diary = useRecentDiaryList(statKey === "diary");

  const loading = jobs.isLoading || cf.isLoading || diary.isLoading;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isJobs ? "Jobs" : isCf ? "Call forward items" : "Recent diary entries"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {isJobs &&
              (jobs.data ?? []).map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="block px-1 py-2.5 hover:bg-muted/40">
                    <p className="text-sm font-medium">
                      {job.address ?? job.name ?? `Job #${job.id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.jobNumber ?? ""} · {job.status.replace(/_/g, " ")}
                    </p>
                  </Link>
                </li>
              ))}

            {isCf &&
              (cf.data ?? []).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/jobs/${item.jobId}/call-forward`}
                    className="block px-1 py-2.5 hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.jobNumber ?? ""} · due {formatDate(item.estFinish)}
                    </p>
                  </Link>
                </li>
              ))}

            {statKey === "diary" &&
              (diary.data ?? []).map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/site-diary/${entry.id}`}
                    className="block px-1 py-2.5 hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{formatDate(entry.date)}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {entry.jobNumber ?? ""} · {entry.workCompleted ?? ""}
                    </p>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DashboardStats() {
  const { data, isLoading } = useDashboardStats();
  const [open, setOpen] = useState<StatKey | null>(null);

  const stats: Stat[] = [
    { key: "active", label: "Active jobs", Icon: Briefcase, value: data?.activeJobs ?? null, openable: true },
    {
      key: "openCf",
      label: "Open call forwards",
      Icon: PhoneForwarded,
      value: data?.openCallForwards ?? null,
      openable: true,
    },
    {
      key: "overdueCf",
      label: "Overdue",
      Icon: AlertTriangle,
      value: data?.overdueCallForwards ?? null,
      tone: "text-red-600 dark:text-red-400",
      openable: true,
    },
    {
      key: "diary",
      label: "Diary entries this week",
      Icon: BookOpen,
      value: data?.recentDiaryEntries ?? null,
      openable: true,
    },
    {
      key: "completed",
      label: "Completed jobs",
      Icon: CheckCircle2,
      value: data?.completedJobs ?? null,
      openable: true,
    },
    // Null for everyone but a manager, and simply not shown for the rest.
    { key: "users", label: "People", Icon: Users, value: data?.totalUsers ?? null, openable: false },
  ];

  const shown = stats.filter((s) => s.key !== "users" || s.value !== null);

  return (
    <>
      <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {shown.map((stat) => {
          const content = (
            <>
              <stat.Icon
                className={cn("h-4 w-4 shrink-0 text-muted-foreground", stat.tone)}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className={cn("text-2xl font-semibold leading-none", stat.tone)}>
                  {isLoading ? "—" : (stat.value ?? 0)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </>
          );

          return (
            <li key={stat.key}>
              {stat.openable ? (
                <button
                  type="button"
                  onClick={() => setOpen(stat.key)}
                  className="flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border bg-card p-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {open !== null && <StatList statKey={open} onClose={() => setOpen(null)} />}
    </>
  );
}

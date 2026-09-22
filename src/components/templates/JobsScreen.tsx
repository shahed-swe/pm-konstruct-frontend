"use client";

/**
 * The job list.
 *
 * Filtering happens in the browser, as it did before: the API accepts
 * `status`, `supervisorId` and `search`, but the page shows a count against
 * every status tab, and those counts have to come from the unfiltered list.
 * Fetching once and filtering here is one request instead of seven.
 *
 * A table on a desktop and cards on a phone -- the same split the current
 * app makes, because seven columns on a 390px screen is unreadable.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { HardHat, Plus, Search } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent } from "@/components/molecules/Card";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/Select";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import { SupervisorStack } from "@/components/molecules/SupervisorStack";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/molecules/Table";
import { useJobs } from "@/lib/api/resources/jobs";
import { useUsers } from "@/lib/api/resources/users";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth.store";
import { canEdit } from "@/lib/auth/permissions";
import type { JobDto } from "@/lib/api/types";

/** The tabs, in the order the current app lists them. */
const STATUS_TABS = [
  { value: "active", label: "Active", dot: "bg-primary" },
  { value: "on_hold", label: "On hold", dot: "bg-amber-400" },
  { value: "completed", label: "Completed", dot: "bg-emerald-400" },
  { value: "cancelled", label: "Cancelled", dot: "bg-destructive" },
  { value: "archived", label: "Archived", dot: "bg-muted-foreground/40" },
  { value: "all", label: "All jobs", dot: "bg-blue-400" },
] as const;

function matchesSearch(job: JobDto, query: string): boolean {
  if (query === "") return true;
  const q = query.toLowerCase();
  return (
    job.name.toLowerCase().includes(q) ||
    job.address.toLowerCase().includes(q) ||
    job.jobNumber.toLowerCase().includes(q) ||
    job.client.toLowerCase().includes(q)
  );
}

function matchesSupervisor(job: JobDto, filter: string): boolean {
  if (filter === "all") return true;
  const assigned = job.supervisors ?? [];
  if (assigned.length > 0) return assigned.some((s) => String(s.id) === filter);
  // Falls back to the denormalised column, as the legacy did, so a job whose
  // supervisor was set directly rather than through an assignment still
  // matches.
  return String(job.supervisorId) === filter;
}

export function JobsScreen() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const mayEdit = canEdit(user, permissions, "jobs");
  const isManager = user?.role === "MANAGER";
  const isSupervisor = user?.role === "SUPERVISOR";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [supervisorFilter, setSupervisorFilter] = useState("all");

  const { data: jobs, isLoading, isError } = useJobs();
  const { data: users } = useUsers({ enabled: isManager });

  const supervisors = useMemo(
    () => (users ?? []).filter((u) => u.role === "SUPERVISOR"),
    [users],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const job of jobs ?? []) {
      out[job.status] = (out[job.status] ?? 0) + 1;
      out.all = (out.all ?? 0) + 1;
    }
    return out;
  }, [jobs]);

  const filtered = useMemo(
    () =>
      (jobs ?? []).filter(
        (job) =>
          matchesSearch(job, search) &&
          (statusFilter === "all" || job.status === statusFilter) &&
          matchesSupervisor(job, supervisorFilter),
      ),
    [jobs, search, statusFilter, supervisorFilter],
  );

  return (
    <>
      <PageHeader
        title={isSupervisor ? "My assigned sites" : "Project directory"}
        description={
          isSupervisor
            ? "Construction sites assigned to you."
            : "Manage active and historical construction projects."
        }
        actions={
          mayEdit ? (
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="h-4 w-4" /> New job
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_TABS.map(({ value, label, dot }) => {
          const count = counts[value] ?? 0;
          const active = statusFilter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 shrink-0 rounded-full", active ? "bg-primary-foreground/70" : dot)}
              />
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search jobs"
            placeholder="Search by name, number, address or client…"
            className="bg-card pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isManager && supervisors.length > 0 && (
          <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
            <SelectTrigger className="w-full bg-card sm:w-52" aria-label="Filter by supervisor">
              <SelectValue placeholder="All supervisors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All supervisors</SelectItem>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isError ? (
        <EmptyState
          title="The job list could not be loaded"
          description="Check your connection and try again."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableCaption className="sr-only">
                Jobs, filtered by {statusFilter === "all" ? "no status" : statusFilter}
              </TableCaption>
              <TableHeader className="bg-secondary/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4 text-xs uppercase tracking-wider">Project</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Supervisors</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Start date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-busy={isLoading}>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4">
                        <Skeleton className="h-10 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-10 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                      <HardHat className="mx-auto mb-3 h-10 w-10 opacity-30" aria-hidden="true" />
                      <p className="font-medium">No jobs match these filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="pl-4">
                        {/* The link is on the title rather than the row: a
                            whole clickable `<tr>` cannot be reached by
                            keyboard and cannot be opened in a new tab. */}
                        <Link href={`/jobs/${job.id}`} className="font-semibold hover:text-primary">
                          {job.address === "" ? job.name : job.address}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{job.jobNumber}</p>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                        {job.address}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium leading-tight">{job.client}</p>
                        {job.clientNumber !== null && (
                          <p className="text-xs text-muted-foreground">{job.clientNumber}</p>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <SupervisorStack supervisors={job.supervisors ?? []} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(job.startDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden" aria-busy={isLoading}>
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<HardHat className="h-10 w-10" />}
                title="No jobs match these filters"
                description={mayEdit ? "Create one to get started." : undefined}
                action={
                  mayEdit ? (
                    <Button asChild size="sm">
                      <Link href="/jobs/new">New job</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              filtered.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/jobs/${job.id}`} className="block truncate font-semibold">
                          {job.address === "" ? job.name : job.address}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{job.jobNumber}</p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                    <dl className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex gap-2">
                        <dt className="sr-only">Client</dt>
                        <dd className="truncate">{job.client}</dd>
                      </div>
                      <div>
                        <dt className="sr-only">Supervisors</dt>
                        <dd>
                          <SupervisorStack supervisors={job.supervisors ?? []} />
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="sr-only">Start date</dt>
                        <dd>{formatDate(job.startDate)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!isLoading && filtered.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing {filtered.length} of {jobs?.length ?? 0} {jobs?.length === 1 ? "job" : "jobs"}
            </p>
          )}
        </>
      )}
    </>
  );
}

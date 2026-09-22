"use client";

/**
 * Everything about one job, on one page.
 *
 * Two columns on a desktop: the record and its paperwork on the left, the
 * people on the right. One column on a phone, with the people last -- a
 * supervisor opening a job on site wants the address and the diary, not the
 * assignment list.
 */
import {
  Archive,
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  PhoneForwarded,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { initialsOf } from "@/components/atoms/Avatar";
import { Skeleton } from "@/components/atoms/Skeleton";
import { BackLink } from "@/components/molecules/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/molecules/Card";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { EmptyState } from "@/components/molecules/EmptyState";
import { StatusBadge } from "@/components/molecules/StatusBadge";
import { JobDiaryPanel } from "@/components/organisms/JobDiaryPanel";
import { JobEtosPanel } from "@/components/organisms/JobEtosPanel";
import { JobFilesPanel } from "@/components/organisms/JobFilesPanel";
import { JobLinksPanel } from "@/components/organisms/JobLinksPanel";
import { JobNotesPanel } from "@/components/organisms/JobNotesPanel";
import { JobSupervisorsPanel } from "@/components/organisms/JobSupervisorsPanel";
import { useJob, useUpdateJob } from "@/lib/api/resources/jobs";
import { canEdit } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center gap-2 border-b py-1.5 last:border-0">
      <span className="shrink-0 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

const QUICK_LINKS = [
  { href: (id: number) => `/site-diary?jobId=${id}`, label: "Site diary", Icon: BookOpen },
  { href: (id: number) => `/jobs/${id}/call-forward`, label: "Call forward", Icon: PhoneForwarded },
  { href: (id: number) => `/progress?jobId=${id}`, label: "Progress", Icon: TrendingUp },
  { href: (id: number) => `/reports?jobId=${id}`, label: "Reports", Icon: BarChart2 },
  { href: (id: number) => `/jobs/${id}/photos`, label: "Photos", Icon: Camera },
];

export function JobDetailScreen({ jobId }: { jobId: number }) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const toast = useUiStore((s) => s.toast);
  const isManager = user?.role === "MANAGER";
  const mayEditJob = canEdit(user, permissions, "jobs");
  const mayEditFiles = canEdit(user, permissions, "site-diary");

  const { data: job, isLoading, isError } = useJob(jobId);
  const update = useUpdateJob(jobId);
  const [archiving, setArchiving] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-busy="true">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || job === undefined) {
    return (
      <>
        <BackLink href="/jobs" label="All jobs" />
        <EmptyState
          title="That job could not be opened"
          description="It may have been deleted, or you may no longer be assigned to it."
        />
      </>
    );
  }

  const hasSecondContact =
    job.contact2Name !== null || job.contact2Phone !== null || job.contact2Email !== null;

  return (
    <>
      <BackLink href="/jobs" label="All jobs" />

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-chakra)] text-2xl font-bold tracking-tight md:text-3xl">
              {job.address === "" ? job.name : job.address}
            </h1>
            <StatusBadge status={job.status} className="text-sm" />
          </div>
          <p className="font-mono text-sm text-muted-foreground">{job.jobNumber}</p>
        </div>

        {mayEditJob && (
          <div className="flex shrink-0 items-center gap-2">
            {isManager && job.status !== "archived" && (
              <Button variant="outline" size="sm" onClick={() => setArchiving(true)} disabled={update.isPending}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href={`/jobs/${job.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit job
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" /> Project details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-1">
              <dl>
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Job number" value={job.jobNumber} />
                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Client" value={job.client} />
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Client number" value={job.clientNumber} />
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Client email" value={job.clientEmail} />

                {hasSecondContact && (
                  <>
                    <div className="my-1 border-t" />
                    <p className="py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Second contact
                    </p>
                    <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Name" value={job.contact2Name} />
                    <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={job.contact2Phone} />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={job.contact2Email} />
                  </>
                )}

                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Site address" value={job.address} />
                <InfoRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Start date"
                  value={job.startDate === null ? null : formatDate(job.startDate)}
                />
                <InfoRow
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  label="Completion date"
                  value={job.endDate === null ? null : formatDate(job.endDate)}
                />
              </dl>
            </CardContent>
          </Card>

          <JobNotesPanel jobId={job.id} notes={job.description} editable={mayEditJob} />
          <JobFilesPanel jobId={job.id} editable={mayEditFiles} />

          <Card>
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" /> Quick links
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2.5">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {QUICK_LINKS.map(({ href, label, Icon }) => (
                  <Button key={label} variant="outline" size="sm" className="h-8 justify-start text-xs" asChild>
                    <Link href={href(job.id)}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {label}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <JobLinksPanel jobId={job.id} legacyPath={job.dropboxPath} editable={mayEditJob} />
          <JobDiaryPanel jobId={job.id} />
          <JobEtosPanel jobId={job.id} />
        </div>

        <div className="space-y-5">
          {job.managerName !== null && job.managerName !== undefined && (
            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Project manager
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                  >
                    {initialsOf(job.managerName)}
                  </span>
                  <span className="text-sm font-medium">{job.managerName}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <JobSupervisorsPanel jobId={job.id} isManager={isManager} />
        </div>
      </div>

      {archiving && (
        <ConfirmDialog
          open
          onOpenChange={setArchiving}
          title="Archive this job?"
          // Says what archiving does, because it is not deletion and people
          // hesitate over the word.
          description="It drops out of the active list and stops appearing in pickers. Nothing is deleted, and you can set it back to active at any time."
          confirmLabel="Archive job"
          onConfirm={() => {
            update.mutate(
              { status: "archived" },
              {
                onSuccess: () => toast({ title: "Job archived", variant: "success" }),
                onError: () => toast({ title: "The job could not be archived", variant: "destructive" }),
              },
            );
            setArchiving(false);
          }}
        />
      )}
    </>
  );
}

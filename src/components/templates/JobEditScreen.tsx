"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useJob, useUpdateJob } from "@/lib/api/resources/jobs";
import { useUsers } from "@/lib/api/resources/users";
import { Skeleton } from "@/components/atoms/Skeleton";
import { BackLink } from "@/components/molecules/BackLink";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { JobForm, fromJob, toRequest, type JobFormValues } from "@/components/organisms/JobForm";
import { useUiStore } from "@/stores/ui.store";

export function JobEditScreen({ jobId }: { jobId: number }) {
  const router = useRouter();
  const toast = useUiStore((s) => s.toast);
  const { data: job, isLoading, isError } = useJob(jobId);
  const { data: users } = useUsers();
  const update = useUpdateJob(jobId);
  const [error, setError] = useState<{ message: string; field?: string } | undefined>(undefined);

  const supervisors = useMemo(() => (users ?? []).filter((u) => u.role === "SUPERVISOR"), [users]);
  const managers = useMemo(() => (users ?? []).filter((u) => u.role === "MANAGER"), [users]);

  function onSubmit(values: JobFormValues) {
    setError(undefined);
    update.mutate(toRequest(values), {
      onSuccess: () => {
        toast({ title: "Job saved", variant: "success" });
        router.push(`/jobs/${jobId}`);
      },
      onError: (cause) => {
        setError(
          cause instanceof ApiError
            ? { message: cause.message, ...(cause.field === undefined ? {} : { field: cause.field }) }
            : { message: "The job could not be saved. Check the fields and try again." },
        );
      },
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || job === undefined) {
    return (
      <EmptyState
        title="That job could not be opened"
        description="It may have been deleted, or you may no longer be assigned to it."
      />
    );
  }

  return (
    <>
      <BackLink href={`/jobs/${jobId}`} label="Back to the job" />
      <PageHeader title="Edit job" description={job.jobNumber} />
      <div className="max-w-2xl">
        <JobForm
          defaultValues={fromJob(job)}
          supervisors={supervisors}
          managers={managers}
          onSubmit={onSubmit}
          isSubmitting={update.isPending}
          submitLabel="Save changes"
          error={error}
        />
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useCreateJob } from "@/lib/api/resources/jobs";
import { useUsers } from "@/lib/api/resources/users";
import { BackLink } from "@/components/molecules/BackLink";
import { PageHeader } from "@/components/molecules/PageHeader";
import { JobForm, toRequest, type JobFormValues } from "@/components/organisms/JobForm";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

export function JobCreateScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const { data: users } = useUsers();
  const create = useCreateJob();
  const [error, setError] = useState<{ message: string; field?: string } | undefined>(undefined);

  const supervisors = useMemo(() => (users ?? []).filter((u) => u.role === "SUPERVISOR"), [users]);
  const managers = useMemo(() => (users ?? []).filter((u) => u.role === "MANAGER"), [users]);

  function onSubmit(values: JobFormValues) {
    setError(undefined);
    create.mutate(toRequest(values), {
      onSuccess: (job) => {
        toast({ title: "Job created", description: job.jobNumber, variant: "success" });
        router.push(`/jobs/${job.id}`);
      },
      onError: (cause) => {
        // Shown in the form rather than only as a toast: a duplicate job
        // number is something to fix in the field above, and a toast that
        // has faded leaves the user staring at a form with no explanation.
        setError(
          cause instanceof ApiError
            ? { message: cause.message, ...(cause.field === undefined ? {} : { field: cause.field }) }
            : { message: "The job could not be created. Check the fields and try again." },
        );
      },
    });
  }

  return (
    <>
      <BackLink href="/jobs" label="Back to jobs" />
      <PageHeader
        title="Create a job"
        description="Register a new construction site."
      />
      <div className="max-w-2xl">
        <JobForm
          // The manager creating the job is the obvious default, and it was
          // the legacy's too.
          defaultValues={{ status: "active", managerId: user === null ? "" : String(user.id) }}
          supervisors={supervisors}
          managers={managers}
          onSubmit={onSubmit}
          isSubmitting={create.isPending}
          submitLabel="Create job"
          error={error}
        />
      </div>
    </>
  );
}

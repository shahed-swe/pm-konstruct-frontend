import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobCreateScreen } from "@/components/templates/JobCreateScreen";

export const metadata: Metadata = { title: "New job" };

export default function JobCreatePage() {
  return (
    // `write`, not `read`: the legacy let anyone with jobs access open this
    // page and only failed at save.
    <RequireAccess module="jobs" write>
      <JobCreateScreen />
    </RequireAccess>
  );
}

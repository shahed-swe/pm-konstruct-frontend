import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobsScreen } from "@/components/templates/JobsScreen";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <RequireAccess module="jobs">
      <JobsScreen />
    </RequireAccess>
  );
}

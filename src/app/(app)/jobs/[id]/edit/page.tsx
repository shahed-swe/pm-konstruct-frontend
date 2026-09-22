import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobEditScreen } from "@/components/templates/JobEditScreen";

export const metadata: Metadata = { title: "Edit job" };

export default async function JobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAccess module="jobs" write>
      <JobEditScreen jobId={Number.parseInt(id, 10)} />
    </RequireAccess>
  );
}

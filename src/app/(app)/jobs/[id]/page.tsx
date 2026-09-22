import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobDetailScreen } from "@/components/templates/JobDetailScreen";

export const metadata: Metadata = { title: "Job" };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAccess module="jobs">
      <JobDetailScreen jobId={Number.parseInt(id, 10)} />
    </RequireAccess>
  );
}

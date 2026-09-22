import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobPhotosScreen } from "@/components/templates/JobPhotosScreen";

export const metadata: Metadata = { title: "Photos" };

export default async function JobPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAccess module="jobs">
      <JobPhotosScreen jobId={Number.parseInt(id, 10)} />
    </RequireAccess>
  );
}

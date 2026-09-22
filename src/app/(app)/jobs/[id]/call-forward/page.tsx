import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { JobCallForwardScreen } from "@/components/templates/JobCallForwardScreen";

export const metadata: Metadata = { title: "Call forward" };

export default async function JobCallForwardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RequireAccess module="call-forward">
      <JobCallForwardScreen jobId={Number.parseInt(id, 10)} />
    </RequireAccess>
  );
}

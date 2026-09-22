import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { DiaryDetailScreen } from "@/components/templates/DiaryDetailScreen";

export const metadata: Metadata = { title: "Diary entry" };

export default async function DiaryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAccess module="site-diary">
      <DiaryDetailScreen entryId={Number.parseInt(id, 10)} />
    </RequireAccess>
  );
}

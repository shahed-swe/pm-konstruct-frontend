import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { DiaryNewScreen } from "@/components/templates/DiaryNewScreen";

export const metadata: Metadata = { title: "New diary entry" };

export default function NewDiaryEntryPage() {
  return (
    <RequireAccess module="site-diary" write>
      {/* `?jobId=` preselects the job when arriving from a job page. */}
      <Suspense fallback={null}>
        <DiaryNewScreen />
      </Suspense>
    </RequireAccess>
  );
}

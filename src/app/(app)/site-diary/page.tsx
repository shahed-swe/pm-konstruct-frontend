import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { DiaryListScreen } from "@/components/templates/DiaryListScreen";

export const metadata: Metadata = { title: "Site diary" };

export default function SiteDiaryPage() {
  return (
    <RequireAccess module="site-diary">
      {/* The job filter lives in the query string. */}
      <Suspense fallback={null}>
        <DiaryListScreen />
      </Suspense>
    </RequireAccess>
  );
}

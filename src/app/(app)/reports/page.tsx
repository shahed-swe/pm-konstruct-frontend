import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { ReportsScreen } from "@/components/templates/ReportsScreen";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <RequireAccess module="reports">
      {/* The open tab lives in the query string, so a link opens on it. */}
      <Suspense fallback={null}>
        <ReportsScreen />
      </Suspense>
    </RequireAccess>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { ProgressScreen } from "@/components/templates/ProgressScreen";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    // Gated on the `progress` area, which reads `jobs:read` -- see
    // docs/audit/preserved-quirks.md for why it is not its own permission.
    <RequireAccess module="progress">
      <Suspense fallback={null}>
        <ProgressScreen />
      </Suspense>
    </RequireAccess>
  );
}

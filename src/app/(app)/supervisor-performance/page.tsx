import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { SupervisorPerformanceScreen } from "@/components/templates/SupervisorPerformanceScreen";

export const metadata: Metadata = { title: "Supervisor performance" };

export default function SupervisorPerformancePage() {
  return (
    // Manager-only: it grades named people.
    <RequireAccess managerOnly>
      <SupervisorPerformanceScreen />
    </RequireAccess>
  );
}

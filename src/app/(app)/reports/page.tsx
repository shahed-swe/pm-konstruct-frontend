import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { ReportsScreen } from "@/components/templates/ReportsScreen";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <RequireAccess module="reports">
      <ReportsScreen />
    </RequireAccess>
  );
}

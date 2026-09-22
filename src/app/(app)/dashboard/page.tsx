import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { DashboardScreen } from "@/components/templates/DashboardScreen";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <RequireAccess module="dashboard">
      <DashboardScreen />
    </RequireAccess>
  );
}

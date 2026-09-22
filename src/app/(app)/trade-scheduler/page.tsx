import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { TradeSchedulerScreen } from "@/components/templates/TradeSchedulerScreen";

export const metadata: Metadata = { title: "Trade scheduler" };

export default function TradeSchedulerPage() {
  return (
    <RequireAccess module="trade-scheduler">
      <TradeSchedulerScreen />
    </RequireAccess>
  );
}

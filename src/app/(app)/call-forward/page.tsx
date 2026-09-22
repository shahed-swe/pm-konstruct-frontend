import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { CallForwardScreen } from "@/components/templates/CallForwardScreen";

export const metadata: Metadata = { title: "Call forward" };

export default function CallForwardPage() {
  return (
    <RequireAccess module="call-forward">
      <CallForwardScreen />
    </RequireAccess>
  );
}

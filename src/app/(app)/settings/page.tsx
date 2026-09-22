import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { SettingsScreen } from "@/components/templates/SettingsScreen";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    // `area="settings"` relaxes the onboarding requirement: a manager sorting
    // out a half-finished subscription still needs to reach their account.
    <RequireAccess module="settings" area="settings">
      <SettingsScreen />
    </RequireAccess>
  );
}

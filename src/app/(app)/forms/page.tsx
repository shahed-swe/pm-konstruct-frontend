import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { FormsScreen } from "@/components/templates/FormsScreen";

export const metadata: Metadata = { title: "Forms" };

export default function FormsPage() {
  return (
    // Both senior roles, which is how the legacy gated the forms -- by role
    // rather than by a permission of their own.
    <RequireAccess seniorOnly>
      <FormsScreen />
    </RequireAccess>
  );
}

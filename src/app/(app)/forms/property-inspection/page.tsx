import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { InspectionFormScreen } from "@/components/templates/InspectionFormScreen";

export const metadata: Metadata = { title: "Site inspection" };

export default function InspectionFormPage() {
  return (
    <RequireAccess seniorOnly>
      <InspectionFormScreen />
    </RequireAccess>
  );
}

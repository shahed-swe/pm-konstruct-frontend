import type { Metadata } from "next";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { EtoFormScreen } from "@/components/templates/EtoFormScreen";

export const metadata: Metadata = { title: "Extra to order" };

export default function EtoFormPage() {
  return (
    <RequireAccess seniorOnly>
      <EtoFormScreen />
    </RequireAccess>
  );
}

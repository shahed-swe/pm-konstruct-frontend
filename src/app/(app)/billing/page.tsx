import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/guards/RequireAccess";
import { BillingScreen } from "@/components/templates/BillingScreen";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    // The one application page that skips the entitlement check: it is the
    // page that fixes a lapsed subscription, so requiring one would lock the
    // company out of paying.
    <RequireAccess managerOnly skipEntitlement>
      {/* Stripe returns with `?session_id=`. */}
      <Suspense fallback={null}>
        <BillingScreen />
      </Suspense>
    </RequireAccess>
  );
}

import type { Metadata } from "next";
import { getBranding } from "@/lib/auth/session";
import { serverGet } from "@/lib/api/server";
import { MarketingFooter, MarketingHeader } from "@/components/organisms/MarketingChrome";
import { PricingPlans } from "@/components/templates/PricingPlans";
import type { PlansDto } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Per-person monthly pricing, with a free trial to start.",
};

export default async function PricingPage() {
  const branding = await getBranding();
  // Rendered on the server: a pricing page that arrives blank and fills in
  // afterwards is the worst possible first impression, and it is public
  // data anyway.
  const plans = await serverGet<PlansDto>("/billing/plans").catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MarketingHeader branding={branding} />
      <main className="flex-grow pb-24 pt-32">
        <PricingPlans plans={plans} />
      </main>
      <MarketingFooter branding={branding} />
    </div>
  );
}

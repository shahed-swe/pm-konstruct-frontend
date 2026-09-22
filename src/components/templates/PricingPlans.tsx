import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/molecules/Card";
import { cn } from "@/lib/utils/cn";
import type { PlansDto } from "@/lib/api/types";

/** Cents to the whole dollars the page shows. */
function dollars(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function PricingPlans({ plans }: { plans: PlansDto | null }) {
  const trialDays = plans?.trialDays ?? 30;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-16 max-w-3xl text-center">
        <h1 className="mb-6 font-[family-name:var(--font-chakra)] text-4xl font-bold tracking-tight md:text-5xl">
          Straightforward pricing. No surprises.
        </h1>
        <p className="text-lg text-muted-foreground">
          Equip your whole team with the tools they need to run the build. Start today with a{" "}
          {trialDays}-day free trial.
        </p>
      </div>

      {plans === null ? (
        <p className="py-24 text-center text-muted-foreground">
          Pricing is unavailable at the moment. Please try again shortly.
        </p>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.plans.map((plan) => {
            // The middle plan is the recommendation, as it is today.
            const highlighted = plan.key === "team";

            return (
              <Card
                key={plan.key}
                className={cn(
                  "relative flex flex-col shadow-lg transition-all hover:shadow-xl",
                  highlighted && "z-10 border-primary md:scale-105",
                )}
              >
                {highlighted && (
                  <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 justify-center">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                      Most popular
                    </span>
                  </div>
                )}

                <CardHeader className="pb-2 pt-8 text-center">
                  <CardTitle className="font-[family-name:var(--font-chakra)] text-2xl uppercase tracking-wide">
                    {plan.label}
                  </CardTitle>
                  <p className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {dollars(plan.unitAmount, plans.currency)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {plans.currency.toUpperCase()} / person / month
                    </span>
                  </p>
                </CardHeader>

                <CardContent className="flex-grow pt-4">
                  <ul className="mt-4 space-y-4 text-sm">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="leading-snug">Everything in the product</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="leading-snug">
                        {plan.minSeats === 1
                          ? "Starts at one person"
                          : `From ${plan.minSeats} people`}
                      </span>
                    </li>
                    {plan.maxSeats !== null && (
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="leading-snug">Up to {plan.maxSeats} people</span>
                      </li>
                    )}
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="leading-snug">Pricing steps down as you grow</span>
                    </li>
                  </ul>
                </CardContent>

                <CardFooter className="pb-8">
                  <Link
                    href="/register"
                    className={cn(
                      "inline-flex h-12 w-full items-center justify-center rounded-md px-4 text-base font-semibold shadow transition-colors",
                      highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    Get started
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <section className="mx-auto mt-24 max-w-4xl rounded-3xl border bg-muted/30 p-8 text-center shadow-sm md:p-12">
        <h2 className="mb-4 font-[family-name:var(--font-chakra)] text-2xl font-bold md:text-3xl">
          Start your trial risk-free
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Create your company account, choose a plan and finish the secure Stripe checkout to begin
          your {trialDays}-day free trial. Your card is only charged when the trial ends, unless you
          cancel before then.
        </p>
        <Link
          href="/register"
          className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
        >
          Create your company account
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

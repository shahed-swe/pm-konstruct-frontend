"use client";

/**
 * The subscription.
 *
 * Reachable while the subscription is lapsed -- it is the page that fixes
 * that -- so it is the one application page that skips the entitlement
 * check.
 *
 * Checkout and the card-management portal are both hosted by Stripe. The
 * card never touches this application, which is the whole reason for the
 * redirect rather than a form.
 */
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/molecules/Card";
import { Field } from "@/components/molecules/Field";
import { PageHeader } from "@/components/molecules/PageHeader";
import {
  useBillingStatus,
  useConfirmCheckout,
  useOpenBillingPortal,
  usePlans,
  useStartCheckout,
} from "@/lib/api/resources/billing";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui.store";

/** Cents to the price a person reads. */
function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "On trial",
  past_due: "Payment overdue",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Not finished",
  none: "No subscription",
};

export function BillingScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useUiStore((s) => s.toast);

  const { data: status, isLoading } = useBillingStatus();
  const { data: plans } = usePlans();
  const startCheckout = useStartCheckout();
  const confirmCheckout = useConfirmCheckout();
  const openPortal = useOpenBillingPortal();

  const [planKey, setPlanKey] = useState<string | null>(null);
  const [seats, setSeats] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  // Coming back from Stripe's hosted checkout. Confirming here makes the
  // page show the new state at once rather than waiting for the webhook.
  const sessionId = params.get("session_id");
  const outcome = params.get("checkout");

  useEffect(() => {
    if (outcome !== "cancelled") return;
    toast({
      title: "Checkout cancelled",
      description: "Nothing was charged. The plan is still here when you want it.",
    });
    router.replace("/billing");
    // Once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  useEffect(() => {
    if (sessionId === null) return;
    confirmCheckout.mutate(sessionId, {
      onSuccess: () => {
        toast({ title: "Subscription active", variant: "success" });
        router.replace("/billing");
      },
      onError: () =>
        toast({
          title: "We could not confirm that payment yet",
          description: "It may still be going through. Refresh in a moment.",
          variant: "destructive",
        }),
    });
    // Runs once per session id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (status === undefined || plans === undefined) return;
    setPlanKey((current) => current ?? status.planKey ?? plans.plans[0]?.key ?? null);
    setSeats((current) =>
      current === "" ? String(Math.max(status.activeUsers, status.seatLimit, 1)) : current,
    );
  }, [status, plans]);

  if (isLoading || status === undefined) {
    return (
      <div className="max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const chosen = plans?.plans.find((p) => p.key === planKey);
  const seatCount = Number.parseInt(seats, 10);
  const seatsValid = Number.isFinite(seatCount) && seatCount > 0;

  function checkout() {
    if (planKey === null || !seatsValid) {
      setError("Choose a plan and how many people need access.");
      return;
    }
    if (chosen !== undefined && seatCount < chosen.minSeats) {
      setError(`The ${chosen.label} plan starts at ${chosen.minSeats} people.`);
      return;
    }
    if (chosen?.maxSeats != null && seatCount > chosen.maxSeats) {
      setError(`The ${chosen.label} plan covers up to ${chosen.maxSeats} people.`);
      return;
    }
    setError(undefined);

    startCheckout.mutate(
      { planKey, seatQuantity: seatCount },
      {
        // A full navigation, not a router push: this leaves the application
        // for Stripe's own domain.
        onSuccess: (session) => {
          window.location.href = session.url;
        },
        onError: (cause) =>
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Checkout could not be started. Try again in a moment.",
          ),
      },
    );
  }

  return (
    <>
      <PageHeader title="Billing" description="Your subscription and the people it covers." />

      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader className="border-b px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" /> Subscription
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  status.hasAccess
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {STATUS_LABEL[status.status] ?? status.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 p-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">People with access</dt>
                <dd className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {status.activeUsers} of {status.seatLimit}
                </dd>
              </div>
              {status.trialEndsAt !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Trial ends</dt>
                  <dd className="text-sm font-medium">{formatDate(status.trialEndsAt)}</dd>
                </div>
              )}
              {status.currentPeriodEnd !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {status.cancelAtPeriodEnd ? "Access ends" : "Renews"}
                  </dt>
                  <dd className="text-sm font-medium">{formatDate(status.currentPeriodEnd)}</dd>
                </div>
              )}
            </dl>

            {status.activeUsers > status.seatLimit && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                You have more active people than seats. Add seats, or turn off sign-in for the ones
                who no longer need it.
              </p>
            )}

            {status.cancelAtPeriodEnd && (
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                This subscription is set to end. Everyone keeps access until then.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                disabled={openPortal.isPending}
                onClick={() =>
                  openPortal.mutate(undefined, {
                    onSuccess: (session) => {
                      window.location.href = session.url;
                    },
                    onError: () =>
                      toast({
                        title: "The billing portal could not be opened",
                        variant: "destructive",
                      }),
                  })
                }
              >
                {openPortal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                )}
                Cards, invoices and cancelling
              </Button>
            </div>
          </CardContent>
        </Card>

        {plans !== undefined && (
          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">
                {status.hasAccess ? "Change your plan" : "Choose a plan"}
              </CardTitle>
              <CardDescription>
                {plans.trialDays > 0 && !status.hasAccess
                  ? `${plans.trialDays} days free, then billed monthly per person.`
                  : "Billed monthly, per person with access."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {error !== undefined && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {plans.plans.map((plan) => {
                  const selected = planKey === plan.key;
                  return (
                    <li key={plan.key}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setPlanKey(plan.key)}
                        className={cn(
                          "w-full rounded-lg border p-4 text-left transition-colors",
                          selected ? "border-primary bg-primary/5" : "hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{plan.label}</span>
                          {selected && (
                            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                          )}
                        </div>
                        <p className="mt-1 text-lg font-semibold">
                          {money(plan.unitAmount, plans.currency)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {" "}
                            per person / month
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.maxSeats === null
                            ? `${plan.minSeats} people or more`
                            : `${plan.minSeats}–${plan.maxSeats} people`}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-end gap-3">
                <Field
                  label="People who need access"
                  className="w-48"
                  hint={
                    status.activeUsers > 0
                      ? `${status.activeUsers} can sign in today.`
                      : undefined
                  }
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                    />
                  )}
                </Field>

                {chosen !== undefined && seatsValid && (
                  <p className="pb-2 text-sm text-muted-foreground">
                    {money(chosen.unitAmount * seatCount, plans.currency)} per month
                  </p>
                )}

                <div className="flex-1" />

                <Button onClick={checkout} disabled={startCheckout.isPending}>
                  {startCheckout.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {status.hasAccess ? "Update the subscription" : "Continue to payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

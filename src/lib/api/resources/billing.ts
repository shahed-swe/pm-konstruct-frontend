"use client";

/**
 * The subscription.
 *
 * Checkout and the customer portal are both hosted by Stripe: the card never
 * touches this application, which is the whole reason for the redirect.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  BillingStatusDto,
  CheckoutRequestDto,
  HostedSessionDto,
  PlansDto,
} from "@/lib/api/types";

export function useBillingStatus() {
  return useQuery({
    queryKey: keys.billing.status(),
    queryFn: ({ signal }) => api.get<BillingStatusDto>("/billing/status", signal),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: keys.billing.plans(),
    queryFn: ({ signal }) => api.get<PlansDto>("/billing/plans", signal),
    // The price list changes when someone edits it in Stripe, which is not
    // during a browsing session.
    staleTime: 60 * 60 * 1000,
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: (body: CheckoutRequestDto) =>
      api.post<HostedSessionDto>("/billing/checkout", body),
  });
}

/**
 * Confirms a checkout the customer has just come back from.
 *
 * Called with the session id Stripe puts in the return URL. The webhook is
 * what makes it true; this is what makes the page show it immediately rather
 * than after the webhook lands.
 */
export function useConfirmCheckout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post<BillingStatusDto>("/billing/checkout/confirm", { sessionId }),
    onSuccess: (status) => {
      client.setQueryData(keys.billing.status(), status);
      // Entitlement rides on the session, and it has just changed.
      void client.invalidateQueries({ queryKey: keys.session.all });
    },
  });
}

/** Stripe's own page for cards, invoices and cancelling. */
export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: () => api.post<HostedSessionDto>("/billing/portal"),
  });
}

export function useCompleteOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BillingStatusDto>("/billing/onboarding-complete"),
    onSuccess: (status) => {
      client.setQueryData(keys.billing.status(), status);
      void client.invalidateQueries({ queryKey: keys.session.all });
    },
  });
}

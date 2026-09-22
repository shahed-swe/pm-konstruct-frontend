import { redirect } from "next/navigation";

/**
 * Where the old application sent people back from Stripe.
 *
 * Kept as a redirect so a bookmark, or a receipt email with this link in it,
 * still lands somewhere sensible. The query string goes with it, which is
 * what carries the checkout session.
 */
export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.toString();
  redirect(suffix === "" ? "/billing" : `/billing?${suffix}`);
}

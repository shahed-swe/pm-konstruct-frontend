/**
 * The public pages: landing and pricing.
 *
 * No session required and no application chrome -- these are what a
 * prospective company sees before signing up.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}

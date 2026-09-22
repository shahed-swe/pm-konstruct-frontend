/**
 * The public pages: landing and pricing.
 *
 * No session and no application chrome -- these are what a prospective
 * company sees before signing up. Each page brings its own header and
 * footer, because the landing page's sits over the hero.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckSquare,
  ClipboardList,
  BookOpen,
  HardHat,
  PhoneForwarded,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/organisms/MarketingChrome";
import { getBranding } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "PM Konstruct",
  description:
    "Site diaries, trade scheduling, call forwards and progress tracking for residential builders.",
};

/** The six things the product does, in the words the current site uses. */
const FEATURES = [
  {
    Icon: BookOpen,
    title: "Site diaries",
    description:
      "Log the day's weather, workforce and activity. A permanent, searchable record of what happened on site.",
  },
  {
    Icon: Users,
    title: "Trade scheduling",
    description:
      "Coordinate trades without clashes. See who is where, week by week, and keep subcontractors accountable.",
  },
  {
    Icon: PhoneForwarded,
    title: "Call forwards",
    description:
      "Never miss a material order or an inspection booking. The programme says what is coming, and what has slipped.",
  },
  {
    Icon: Camera,
    title: "Photo documentation",
    description:
      "Capture site conditions as they are. Photos attach to the job and the day, and the whole team can see them.",
  },
  {
    Icon: TrendingUp,
    title: "Progress tracking",
    description:
      "Track stages against the programme. Spot a delay early and keep the client informed with real figures.",
  },
  {
    Icon: ClipboardList,
    title: "Forms and inspections",
    description:
      "Walk a house room by room. Standardise quality control across every supervisor, and file it into the diary.",
  },
] as const;

const AUDIENCE = [
  { Icon: Building2, label: "Residential builders" },
  { Icon: HardHat, label: "Site supervisors" },
  { Icon: ShieldCheck, label: "Project managers" },
  { Icon: ClipboardList, label: "Trade teams" },
] as const;

export default async function LandingPage() {
  const branding = await getBranding();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <MarketingHeader branding={branding} />

      <main className="flex-grow">
        {/* The hero sits on the sidebar colour, so a branded deployment
            carries through to the first thing anyone sees. */}
        <section className="relative bg-sidebar pb-24 pt-40 text-sidebar-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-6 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <span
                  aria-hidden="true"
                  className="mr-2 flex h-2 w-2 rounded-full bg-primary"
                />
                The standard for residential construction
              </p>

              <h1 className="mb-6 font-[family-name:var(--font-chakra)] text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
                The calm centre of your <span className="text-primary">construction site.</span>
              </h1>

              <p className="mb-10 max-w-2xl text-lg leading-relaxed opacity-80 sm:text-xl">
                Turn scattered site activity, trade scheduling, daily notes and team coordination
                into one focused workspace. Build with confidence, not chaos.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
                >
                  Start a free trial
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-14 items-center justify-center rounded-md border border-white/10 bg-white/5 px-8 text-base font-semibold backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>

              <ul className="mt-12 flex flex-wrap items-center gap-6 text-sm opacity-70">
                <li className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  No card to start
                </li>
                <li className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  Set up in two minutes
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Built for the people who keep the build moving
            </p>
            <ul className="flex flex-wrap justify-center gap-x-10 gap-y-5 text-muted-foreground md:gap-x-20">
              {AUDIENCE.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 font-[family-name:var(--font-chakra)] text-lg font-bold"
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="bg-background py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 text-center font-[family-name:var(--font-chakra)] text-3xl font-bold tracking-tight md:text-4xl">
              Everything the site needs, in one place
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">
              Written by supervisors on site, read by managers in the office.
            </p>

            <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, description }) => (
                <li key={title} className="rounded-xl border bg-card p-6 shadow-sm">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-muted/30 py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 font-[family-name:var(--font-chakra)] text-3xl font-bold tracking-tight md:text-4xl">
              Start with one site
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Create your company account and put one job in. If it does not make the week easier,
              nothing is lost.
            </p>
            <Link
              href="/register"
              className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
            >
              Create your company account
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter branding={branding} />
    </div>
  );
}

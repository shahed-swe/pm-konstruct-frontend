"use client";

/**
 * Every client-side provider, in one place and in the order they depend on
 * each other: the query client needs the router (for the 401 and 402
 * redirects), and the session store must be filled before anything reads it.
 */
import type { BrandingDto, MeResponse } from "@/lib/api/types";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/molecules/Toast";
import { TooltipProvider } from "@/components/molecules/Tooltip";
import { SessionProvider } from "./SessionProvider";

interface Props {
  session: MeResponse | null;
  branding: BrandingDto;
  children: React.ReactNode;
}

export function AppProviders({ session, branding, children }: Props) {
  return (
    <QueryProvider>
      <SessionProvider session={session} branding={branding}>
        {/* 200ms rather than the 700ms default: these tooltips carry the
            full job address behind a truncated label, and waiting most of a
            second to read it is what made people give up on them. */}
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </QueryProvider>
  );
}

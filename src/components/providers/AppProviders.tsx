"use client";

/**
 * Every client-side provider, in one place and in the order they depend on
 * each other: the query client needs the router (for the 401 and 402
 * redirects), and the session store must be filled before anything reads it.
 */
import type { BrandingDto, MeResponse } from "@/lib/api/types";
import { QueryProvider } from "@/lib/query/provider";
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
        {children}
      </SessionProvider>
    </QueryProvider>
  );
}

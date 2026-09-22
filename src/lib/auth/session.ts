import "server-only";

/**
 * The signed-in user, read on the server.
 *
 * Every page under `(app)` needs this before it can decide what to render,
 * and a client-side fetch would mean a flash of an empty shell first. React's
 * `cache` deduplicates it, so a layout and three nested components asking
 * independently still make one request.
 */
import { cache } from "react";
import type { BrandingDto, MeResponse } from "@/lib/api/types";
import { serverGet } from "@/lib/api/server";
import { DEFAULT_BRANDING } from "@/stores/branding.store";

export const getSession = cache(async (): Promise<MeResponse | null> => {
  return serverGet<MeResponse>("/auth/me");
});

/**
 * The company's branding, or the product default.
 *
 * Falls back rather than failing: the login page needs a logo before anyone
 * is signed in, and `/settings/branding` answers unauthenticated requests
 * with the default row for exactly that reason.
 */
export const getBranding = cache(async (): Promise<BrandingDto> => {
  try {
    return (await serverGet<BrandingDto>("/settings/branding")) ?? DEFAULT_BRANDING;
  } catch {
    // Branding is decoration. An API hiccup here must not take down a page
    // that would otherwise render perfectly well in the default colours.
    return DEFAULT_BRANDING;
  }
});

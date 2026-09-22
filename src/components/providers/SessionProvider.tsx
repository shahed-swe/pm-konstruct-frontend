"use client";

/**
 * Hands the server's answer to the client store.
 *
 * The layout has already read `/auth/me` server-side, so the client should
 * not fetch it again just to fill the same store -- that was one of the
 * legacy's two requests on every page load. Hydrating from props means the
 * first client render already knows who the user is, and `resolved` is true
 * immediately, so nothing flashes.
 *
 * `useState` rather than an effect for the first write: an effect runs after
 * paint, which is exactly the flash this avoids.
 */
import { useEffect, useState } from "react";
import type { BrandingDto, MeResponse } from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth.store";
import { useBrandingStore } from "@/stores/branding.store";

interface Props {
  session: MeResponse | null;
  branding: BrandingDto;
  children: React.ReactNode;
}

export function SessionProvider({ session, branding, children }: Props) {
  useState(() => {
    if (session) useAuthStore.getState().setSession(session);
    else useAuthStore.getState().clear();
    // Not `setBranding`: that also writes the CSS variables, and the server
    // has already put them in the document. Writing them again during render
    // would be a side effect in a render pass.
    useBrandingStore.setState({ branding });
  });

  // A navigation can bring a different answer -- a role change, or a company
  // that just finished onboarding. Keep the store in step with the server.
  useEffect(() => {
    if (session) useAuthStore.getState().setSession(session);
    else useAuthStore.getState().clear();
  }, [session]);

  useEffect(() => {
    useBrandingStore.setState({ branding });
  }, [branding]);

  return <>{children}</>;
}

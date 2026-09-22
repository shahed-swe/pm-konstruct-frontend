"use client";

/**
 * Wires the query client to the router.
 *
 * The client is created inside a `useState` initialiser rather than at module
 * scope: on the server a module-level client would be shared between requests,
 * and one tenant's cached job list would be served to the next.
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createQueryClient, setSessionFailureHandler } from "./client";
import { useAuthStore } from "@/stores/auth.store";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);
  const router = useRouter();

  useEffect(() => {
    setSessionFailureHandler((failure) => {
      if (failure === "unauthenticated") {
        useAuthStore.getState().clear();
        client.clear();
        // `replace`, not `push`: a signed-out user pressing Back should not
        // land on a page that will immediately bounce them again.
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      } else {
        router.replace("/billing");
      }
    });
    return () => setSessionFailureHandler(() => {});
  }, [client, router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

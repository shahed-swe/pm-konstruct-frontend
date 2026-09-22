"use client";

/**
 * Signing in, signing up, and getting back in when a password is lost.
 *
 * None of these hold a token: the session arrives as an HttpOnly cookie pair
 * the browser keeps for us. `useSession` exists so a client component can
 * refetch who the user is after something changes it -- the layout already
 * read it on the server for the first render.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  ForgotPasswordRequest,
  LoginResponse,
  MeResponse,
  MessageDto,
  RegisterRequest,
  ResetPasswordRequest,
  SetupRequest,
  SetupStatusDto,
} from "@/lib/api/types";

export function useSession(enabled = true) {
  return useQuery({
    queryKey: keys.session.me(),
    queryFn: ({ signal }) => api.get<MeResponse>("/auth/me", signal),
    enabled,
    // The session is the one thing worth refetching on focus: a user who
    // left a tab open overnight should find out they are signed out before
    // they type a diary entry into it.
    refetchOnWindowFocus: true,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) => api.post<LoginResponse>("/auth/register", body),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) =>
      api.post<MessageDto>("/auth/forgot-password", body),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => api.post<MessageDto>("/auth/reset-password", body),
  });
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ["setup", "status"],
    queryFn: ({ signal }) => api.get<SetupStatusDto>("/auth/setup", signal),
    // Asked once. Whether an installation has its first account does not
    // change while someone is filling in the form.
    staleTime: Infinity,
    retry: false,
  });
}

export function useCompleteSetup() {
  return useMutation({
    mutationFn: (body: SetupRequest) => api.post<LoginResponse>("/auth/setup", body),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSettled: () => {
      // Cleared whether or not the request succeeded: the user pressed sign
      // out, and leaving another tenant's cached data in memory because the
      // network hiccuped is the wrong failure.
      client.clear();
    },
  });
}

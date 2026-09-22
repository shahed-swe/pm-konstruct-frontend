"use client";

/**
 * Users, and the permission rows a manager grants them.
 *
 * `useUsers` is read by more than the users page -- the job form's supervisor
 * picker, the scheduler's worker list, the diary's author filter all need the
 * same list, so it shares one cache entry rather than each fetching its own.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  InviteDto,
  PermissionDto,
  RecoveryCodeDto,
  UserDto,
  UserRequest,
} from "@/lib/api/types";

export function useUsers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.users.list(),
    queryFn: ({ signal }) => api.get<UserDto[]>("/users", signal),
    enabled,
  });
}

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UserRequest) => api.post<UserDto>("/users", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.users.all }),
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UserRequest & { id: number }) =>
      api.put<UserDto>(`/users/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.users.all }),
  });
}

export function useDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/users/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.users.all }),
  });
}

export function useUserPermissions(id: number, enabled = true) {
  return useQuery({
    queryKey: keys.users.permissions(id),
    queryFn: ({ signal }) => api.get<PermissionDto[]>(`/users/${id}/permissions`, signal),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useSetUserPermissions(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (permissions: PermissionDto[]) =>
      api.put<PermissionDto[]>(`/users/${id}/permissions`, { permissions }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.users.permissions(id) });
      // The edited user may be the one signed in.
      void client.invalidateQueries({ queryKey: keys.session.all });
    },
  });
}

/**
 * Issues a one-time recovery code for a user who cannot sign in.
 *
 * Shown once and then unrecoverable -- only its hash is stored -- so the
 * screen that calls this must display the result rather than discarding it.
 */
export function useIssueRecoveryCode() {
  return useMutation({
    mutationFn: (id: number) => api.post<RecoveryCodeDto>(`/users/${id}/password-recovery-code`),
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: (id: number) => api.post<InviteDto>(`/users/${id}/resend-invite`),
  });
}

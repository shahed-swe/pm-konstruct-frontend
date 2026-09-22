"use client";

/**
 * The bell, and the preferences behind it.
 *
 * Push is optional: a deployment with no VAPID key simply does not offer it,
 * and the in-app bell works either way. That is why the key endpoint returns
 * an empty string rather than an error.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/query/keys";
import type {
  NotificationFeedDto,
  NotificationPrefsDto,
  OkDto,
  SubscribeRequest,
  UpdatePrefsRequest,
  VapidKeyDto,
} from "@/lib/api/types";

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications.list(),
    queryFn: ({ signal }) => api.get<NotificationFeedDto>("/notifications", signal),
    // The bell is the one thing that should notice something happening
    // while the page sits open.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch<OkDto>(`/notifications/${id}/read`),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.notifications.list() }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<OkDto>("/notifications/read-all"),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.notifications.list() }),
  });
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: keys.notifications.prefs(),
    queryFn: ({ signal }) => api.get<NotificationPrefsDto>("/notifications/prefs", signal),
  });
}

export function useSetNotificationPrefs() {
  const client = useQueryClient();
  return useMutation({
    // A partial update: the settings page toggles one switch without having
    // to know the state of the other.
    mutationFn: (body: UpdatePrefsRequest) =>
      api.put<NotificationPrefsDto>("/notifications/prefs", body),
    onSuccess: (prefs) => client.setQueryData(keys.notifications.prefs(), prefs),
  });
}

export function useVapidKey() {
  return useQuery({
    queryKey: keys.notifications.vapidKey(),
    queryFn: ({ signal }) => api.get<VapidKeyDto>("/notifications/vapid-public-key", signal),
    staleTime: Infinity,
    retry: false,
  });
}

export function useSubscribeToPush() {
  return useMutation({
    mutationFn: (body: SubscribeRequest) => api.post<OkDto>("/notifications/push-subscribe", body),
  });
}

export function useUnsubscribeFromPush() {
  return useMutation({
    mutationFn: (endpoint: string) =>
      api.delete<OkDto>("/notifications/push-subscribe", { endpoint }),
  });
}

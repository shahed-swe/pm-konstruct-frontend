"use client";

/**
 * The bell.
 *
 * Shows what other people have done that the user cares about -- a note
 * flagged on their job, a status changed, a reply. Clicking one takes them
 * to it and marks it read.
 *
 * Push is offered only when the deployment has a VAPID key and the browser
 * supports it. Neither is an error: the bell works either way, and a
 * permission prompt nobody asked for is the fastest way to have it refused
 * forever.
 */
import { Bell, BellOff, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/molecules/Popover";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useSubscribeToPush,
  useUnsubscribeFromPush,
  useVapidKey,
} from "@/lib/api/resources/notifications";
import { currentSubscription, pushSupported, subscribeToPush } from "@/lib/notifications/push";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui.store";

/** "3m ago", the way the current app words it. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  new_action_note: "📋",
  note_status_changed: "🔄",
  note_comment: "💬",
  call_forward_updated: "📞",
};

export function NotificationBell() {
  const router = useRouter();
  const toast = useUiStore((s) => s.toast);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { data: vapid } = useVapidKey();
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();

  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentSubscription().then((sub) => setPushOn(sub !== null));
  }, []);

  const canOfferPush =
    pushSupported() && vapid !== undefined && vapid.publicKey !== "";

  async function togglePush() {
    setBusy(true);
    try {
      if (pushOn) {
        const existing = await currentSubscription();
        if (existing !== null) {
          await unsubscribe.mutateAsync(existing.endpoint);
          await existing.unsubscribe();
        }
        setPushOn(false);
        toast({ title: "Push notifications off" });
        return;
      }

      const created = await subscribeToPush(vapid?.publicKey ?? "");
      if (created === null) {
        toast({
          title: "Push was not enabled",
          description: "Your browser refused, or the permission was declined.",
        });
        return;
      }

      const json = created.toJSON();
      await subscribe.mutateAsync({
        endpoint: created.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });
      setPushOn(true);
      toast({ title: "Push notifications on", variant: "success" });
    } catch {
      toast({ title: "Push could not be changed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const unread = data?.unread ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread === 0 ? "Notifications" : `Notifications, ${unread} unread`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            {canOfferPush && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={busy}
                aria-label={pushOn ? "Turn off push notifications" : "Turn on push notifications"}
                onClick={() => void togglePush()}
              >
                {pushOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              </Button>
            )}
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAll.mutate()}
              >
                <Check className="h-3 w-3" aria-hidden="true" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {(data?.notifications ?? []).length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nothing yet.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {(data?.notifications ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full gap-2 px-3 py-2.5 text-left hover:bg-muted/40",
                    item.readAt === null && "bg-primary/5",
                  )}
                  onClick={() => {
                    if (item.readAt === null) markRead.mutate(item.id);
                    if (item.link !== null) router.push(item.link);
                  }}
                >
                  <span aria-hidden="true" className="shrink-0">
                    {TYPE_ICON[item.type] ?? "🔔"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {item.body !== null && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                    )}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                  {item.readAt === null && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

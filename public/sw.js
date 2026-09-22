/*
 * The service worker, for push notifications only.
 *
 * Deliberately not a cache: an offline-capable build of this product is a
 * project of its own, and a half-implemented cache serving a stale diary
 * entry is worse than no cache at all.
 */

self.addEventListener("push", (event) => {
  if (event.data === null) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "PM Konstruct", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "PM Konstruct", {
      body: payload.body ?? "",
      // So a second notification about the same note replaces the first
      // rather than stacking three deep on a lock screen.
      tag: payload.tag ?? payload.link ?? undefined,
      data: { link: payload.link ?? "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Focus a tab that is already open rather than opening a second one.
      for (const client of windows) {
        if ("focus" in client) {
          void client.focus();
          if ("navigate" in client) return client.navigate(link);
          return undefined;
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});

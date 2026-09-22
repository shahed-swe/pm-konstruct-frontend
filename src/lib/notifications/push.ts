"use client";

/**
 * Browser push, when the deployment has keys for it.
 *
 * Everything here is best-effort. Push needs a service worker, a secure
 * context, a permission the user may refuse and a VAPID key the server may
 * not have -- and the product is perfectly usable without any of it, so none
 * of these is treated as an error.
 */

/** VAPID keys are base64url; `atob` wants plain base64 with padding. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const normal = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normal);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    // No service worker, no push. The bell still works.
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registered = await registration();
  if (registered === null) return null;
  return registered.pushManager.getSubscription();
}

export async function subscribeToPush(vapidKey: string): Promise<PushSubscription | null> {
  if (!pushSupported() || vapidKey === "") return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registered = await registration();
  if (registered === null) return null;

  return registered.pushManager.subscribe({
    // Chrome refuses a subscription that is not user-visible, and these all
    // are: they announce something somebody else did.
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
  });
}

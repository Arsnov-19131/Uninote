/*
  Browser side of reminders: the service worker and device (system) notifications.
  Device notifications need the user's permission, a secure page (https or localhost),
  and on iPhone the app must be added to the Home Screen first.
*/

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  // In development the worker is not used: it could serve stale code while you edit. Remove any
  // worker and cache left over from earlier runs. Notifications still work without it.
  if (process.env.NODE_ENV !== "production") {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("ast-runtime-")).map((n) => caches.delete(n)));
    } catch {
      // Cleanup is best effort.
    }
    return null;
  }
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<PushPermission> {
  if (getPermission() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") await registerServiceWorker();
  return result;
}

/** Shows a system notification. Returns false if it could not be shown. */
export async function showDeviceNotification(
  title: string,
  body: string,
  tag: string,
): Promise<boolean> {
  if (getPermission() !== "granted") return false;
  const options = {
    body,
    tag,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: "/dashboard/notifications" },
  };
  try {
    const reg =
      "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
    return true;
  } catch {
    return false;
  }
}

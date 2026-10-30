/*
  Service worker for AI Study Toolkit.

  Responsibilities:
  1. Device notifications — shows them and opens the app when one is clicked.
     Also understands server push messages ({ title, body, url }) for the
     later login/server task.
  2. Offline polish — caches pages and static assets as they're visited, so
     a page you've already opened still loads with no connection, and shows
     a plain offline notice for a page you haven't.

  What this does NOT do: the app's data (subjects, tasks, notes, etc.) lives
  in localStorage, which the browser already keeps offline on its own — this
  worker only caches the page shell (HTML/JS/CSS/images), not that data.
  Anything under /api/ (the Gemini calls) is deliberately left uncached: a
  stale cached AI answer would be worse than a clear "you're offline" error.
*/

const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `ast-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // A slow/offline first install shouldn't block the worker from taking over.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("ast-runtime-") && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache writes

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin requests alone
  if (url.pathname.startsWith("/api/")) return; // never cache the AI route

  if (req.mode === "navigate") {
    // Pages: prefer a fresh copy; fall back to whatever was last cached for
    // that exact page, then to the generic offline notice.
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          return cached || (await cache.match(OFFLINE_URL));
        }
      })(),
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): Next.js names build files with a
  // content hash, so a cached copy never goes stale — serve it immediately
  // when we have it, and cache whatever we fetch for next time.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "AI Study Toolkit";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/dashboard/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/notifications";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        try {
          if ("navigate" in client) await client.navigate(url);
        } catch (e) {
          // Navigation can be refused; focusing the window is still useful.
        }
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});

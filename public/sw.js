const CACHE_NAME = "praynote-static-v2";
const APP_SHELL = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(event.preloadResponse.then((preloaded) => preloaded || fetch(event.request)));
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const cacheable = url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/icons/")
    || url.pathname === "/manifest.webmanifest";
  if (!cacheable) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fresh = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached || Response.error());
      return cached || fresh;
    }),
  );
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "PrayNote",
    body: "새로운 기도 소식이 도착했어요.",
    url: "/notifications",
    notificationId: "praynote-notification",
  };

  let payload = fallback;
  try {
    payload = { ...fallback, ...event.data.json() };
  } catch {
    // Keep the privacy-safe fallback when a payload cannot be parsed.
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: payload.notificationId,
    data: { url: payload.url },
    renotify: false,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then(() => client.navigate(destination));
        }
      }
      return self.clients.openWindow(destination);
    }),
  );
});

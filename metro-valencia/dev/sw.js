const CACHE = "metro-valencia-dev-v11";
const SHELL = ["./index.html", "./app.js", "./walk.js", "./styles.css", "./plano.png", "./runer.svg", "./coffee.svg", "./no-time.webp", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isShell(url) {
  return SHELL.some((path) => url.pathname.endsWith(path.slice(1)));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  if (event.request.mode !== "navigate" && !isShell(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const copy = response.clone();
        if (event.request.mode === "navigate") await cache.put("./index.html", copy);
        else await cache.put(event.request, copy);
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") {
        const page = await cache.match("./index.html");
        if (page) return page;
      }
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw new Error("App is not available offline yet");
    }
  })());
});

async function stopRinging() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) client.postMessage({ type: "stop-ringing" });
  return windows;
}

self.addEventListener("notificationclose", (event) => {
  event.waitUntil(stopRinging());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await stopRinging();
    const open = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (open) return open.focus();
    return self.clients.openWindow("./");
  })());
});

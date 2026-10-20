const CACHE = "metro-valencia-dev-v4";
const SHELL = ["./index.html", "./app.js", "./walk.js", "./styles.css", "./plano.png", "./runer.svg", "./coffee.svg", "./no-time.webp"];

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

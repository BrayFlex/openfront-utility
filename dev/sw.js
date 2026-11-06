/*
 * Offline support for the OpenFront Pattern Utility.
 * This is a TEMPLATE: scripts/copy-static.js fills in the file list and a
 * content hash and writes the result to docs/sw.js on every build.
 */
const VERSION = "9f751a8648";

// Include the scope (e.g. "/" or "/openfront-utility/dev/") in the cache name so
// the production site and the dev preview never delete each other's caches.
const SCOPE_KEY =
  self.registration.scope
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "root";
const CACHE_PREFIX = `pattern-utility:${SCOPE_KEY}:`;
const CACHE = CACHE_PREFIX + VERSION;

// Needed to start the app: install fails (and nothing is cached) if one is missing.
const CORE = [
  "./",
  "app.js",
  "app/circleGeometry.js",
  "app/clipboard.js",
  "app/colorPresets.js",
  "app/copyText.js",
  "app/drawingTools.js",
  "app/exportOutputs.js",
  "app/fillStyles.js",
  "app/gridGuides.js",
  "app/gridManager.js",
  "app/historyShortcuts.js",
  "app/imageImportCanvas.js",
  "app/imageImportMarkup.js",
  "app/imageImportOverlay.js",
  "app/imagePatternConversion.js",
  "app/infoModal.js",
  "app/mapSimulation.js",
  "app/offlineSupport.js",
  "app/paneResizeControls.js",
  "app/patternEncoding.js",
  "app/patternLoader.js",
  "app/patternTransforms.js",
  "app/previewRenderer.js",
  "app/themeToggle.js",
  "app/tileGhostRenderer.js",
  "app/toast.js",
  "app/toolOptions.js",
  "app/toolState.js",
  "app/undoRedo.js",
  "app/workspaceControls.js",
  "color-presets.json",
  "data/maps.json",
  "favicon.ico",
  "favicon64.png",
  "fonts/dm-mono-latin-400-normal.woff2",
  "fonts/dm-mono-latin-500-normal.woff2",
  "fonts/dm-sans-latin-400-normal.woff2",
  "fonts/dm-sans-latin-500-normal.woff2",
  "fonts/dm-sans-latin-600-normal.woff2",
  "fonts/dm-sans-latin-700-normal.woff2",
  "fonts/space-grotesk-latin-400-normal.woff2",
  "fonts/space-grotesk-latin-500-normal.woff2",
  "fonts/space-grotesk-latin-600-normal.woff2",
  "fonts/space-grotesk-latin-700-normal.woff2",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "index.css",
  "index.html",
  "manifest.webmanifest",
  "nouislider/nouislider.min.css",
  "nouislider/nouislider.min.mjs",
  "preview.css",
  "preview.html",
  "preview.js",
  "styles/base.css",
  "styles/circle-tool.css",
  "styles/color-presets.css",
  "styles/editor-layout.css",
  "styles/fonts.css",
  "styles/horizontal-toolbar.css",
  "styles/image-import.css"
];
// Nice to have offline (map backgrounds); a failure here never blocks install.
const OPTIONAL = [
  "maps/alps-land.png",
  "maps/alps.png",
  "maps/arctic-land.png",
  "maps/arctic.png",
  "maps/australia-land.png",
  "maps/australia.png",
  "maps/baikal-land.png",
  "maps/baikal.png",
  "maps/gulfofstlawrence-land.png",
  "maps/gulfofstlawrence.png",
  "maps/marenostrum-land.png",
  "maps/marenostrum.png",
  "maps/southamerica-land.png",
  "maps/southamerica.png",
  "maps/twolakes-land.png",
  "maps/twolakes.png",
  "maps/world-land.png",
  "maps/world.png"
];

// On localhost (npm run dev) always try the network first, so rebuilt files show
// up immediately and development isn't confusing. Offline still works.
const DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

const toUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE.map((p) => new Request(toUrl(p), { cache: "reload" })));
      await Promise.all(
        OPTIONAL.map((p) =>
          cache.add(new Request(toUrl(p), { cache: "reload" })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      clients.forEach((client) =>
        client.postMessage({ type: "sw-activated", version: VERSION })
      );
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  // Never touch other sites (changelog on GitHub, analytics): the page handles
  // their failures itself.
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  // ignoreSearch so "favicon.ico?v=23" and "preview.html?x" find their cached file.
  const cached = () => cache.match(request, { ignoreSearch: true });

  if (DEV) {
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch {
      return (await cached()) || (await offlineFallback(request, cache));
    }
  }

  const hit = await cached();
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return offlineFallback(request, cache);
  }
}

async function offlineFallback(request, cache) {
  if (request.mode === "navigate") {
    const page = await cache.match(toUrl("index.html"));
    if (page) return page;
  }
  return Response.error();
}

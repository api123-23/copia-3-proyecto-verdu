const CACHE = "verdu-shell--CcHy2kQ2s0C7F7evSLfU";
const PRECACHE = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/_next/static/-CcHy2kQ2s0C7F7evSLfU/_buildManifest.js",
  "/_next/static/-CcHy2kQ2s0C7F7evSLfU/_clientMiddlewareManifest.js",
  "/_next/static/-CcHy2kQ2s0C7F7evSLfU/_ssgManifest.js",
  "/_next/static/chunks/02fh7_m5mrih8.js",
  "/_next/static/chunks/07nldpx3i6mc_.js",
  "/_next/static/chunks/0cz1d0mv5g_q7.js",
  "/_next/static/chunks/0j_6xx2zneltr.js",
  "/_next/static/chunks/0k16m1c57o-qb.js",
  "/_next/static/chunks/14etckihdkwts.js",
  "/_next/static/chunks/17xbaqp6-k__x.css",
  "/_next/static/chunks/1cwczo7gh-yho.js",
  "/_next/static/chunks/1kden681vlcis.js",
  "/_next/static/chunks/1vmuvg71dkxre.js",
  "/_next/static/chunks/2-cytfxc_rgaj.js",
  "/_next/static/chunks/2i51e627rllld.js",
  "/_next/static/chunks/3fntmmi971322.js",
  "/_next/static/chunks/3z6dwnwix_b-s.js",
  "/_next/static/chunks/40m3i2qlg9wx_.js",
  "/_next/static/chunks/turbopack-0uq7hdybijnu_.js",
  "/_next/static/media/1317291d1835f011-s.1ocfy-u58n01e.woff2",
  "/_next/static/media/1bffadaabf893a1e-s.3-6t-g6q0vh0a.woff2",
  "/_next/static/media/2bbe8d2671613f1f-s.0k62hbripvv8p.woff2",
  "/_next/static/media/2c55a0e60120577a-s.0-dom-5bn10r2.woff2",
  "/_next/static/media/3673b45bb7dd3324-s.2lz2vdkeqaz2g.woff2",
  "/_next/static/media/4656623e11daf2b7-s.3r4--ze9tqti8.woff2",
  "/_next/static/media/5476f68d60460930-s.2uwcyprjm3xu3.woff2",
  "/_next/static/media/606d931d1de1f041-s.05w992gizc866.woff2",
  "/_next/static/media/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2",
  "/_next/static/media/93ce1fb4a74b790b-s.1m9k836wuo8c7.woff2",
  "/_next/static/media/9c72aa0f40e4eef8-s.1y4-pdgsjb-pw.woff2",
  "/_next/static/media/ad66f9afd8947f86-s.3lvt2whj97whp.woff2",
  "/_next/static/media/e1750518007a189a-s.p.29e6ydd6osd72.woff2",
  "/_next/static/media/favicon.2vob68tjqpejf.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        PRECACHE.map(async (url) => {
          try {
            const req = new Request(url, { cache: "reload" });
            const res = await fetch(req);
            if (res && (res.ok || res.type === "opaque")) await cache.put(req, res);
          } catch {
            /* un asset que falle no debe romper la instalación */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() =>
          caches.match(req).then((match) => match || caches.match("/"))
        )
    );
    return;
  }

  const esStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (esStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const enCache = await cache.match(req);
        const pedirRed = fetch(req)
          .then((res) => {
            if (res.ok || res.type === "opaque") cache.put(req, res.clone());
            return res;
          })
          .catch(() => enCache);
        return enCache || pedirRed;
      })()
    );
  }
});

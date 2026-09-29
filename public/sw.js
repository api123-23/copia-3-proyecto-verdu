const CACHE = "verdu-shell-1tS5vgcMhc6fHdx8YxUZ3";
const PREFIJO = "verdu-shell-";
const PRECACHE = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/_next/static/1tS5vgcMhc6fHdx8YxUZ3/_buildManifest.js",
  "/_next/static/1tS5vgcMhc6fHdx8YxUZ3/_clientMiddlewareManifest.js",
  "/_next/static/1tS5vgcMhc6fHdx8YxUZ3/_ssgManifest.js",
  "/_next/static/chunks/07nldpx3i6mc_.js",
  "/_next/static/chunks/0cz1d0mv5g_q7.js",
  "/_next/static/chunks/0k16m1c57o-qb.js",
  "/_next/static/chunks/0pc_0m2y0bzma.js",
  "/_next/static/chunks/0pzy3do1unptj.js",
  "/_next/static/chunks/1-b2ubvwkmsdh.js",
  "/_next/static/chunks/14d_n26e-e1dg.js",
  "/_next/static/chunks/1cwczo7gh-yho.js",
  "/_next/static/chunks/1cx21u_-_94mi.css",
  "/_next/static/chunks/1kden681vlcis.js",
  "/_next/static/chunks/2aixyffv6iw_4.js",
  "/_next/static/chunks/2bfbkmb5pwdvf.js",
  "/_next/static/chunks/2h38j4f2oa0ld.js",
  "/_next/static/chunks/2i51e627rllld.js",
  "/_next/static/chunks/2mt2zk0dve3rc.js",
  "/_next/static/chunks/2q2xxe4pzckye.js",
  "/_next/static/chunks/39u3ld3zqxqqm.js",
  "/_next/static/chunks/3fntmmi971322.js",
  "/_next/static/chunks/3gti1qdk5epqn.js",
  "/_next/static/chunks/turbopack-21hbw67n-lqzd.js",
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
// Con señal débil no se espera eternamente a la red: pasado este tiempo se
// abre la versión guardada.
const TIMEOUT_NAVEGACION_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        PRECACHE.map(async (url) => {
          try {
            const req = new Request(url, { cache: "reload" });
            const res = await fetch(req);
            if (res && res.ok) await cache.put(req, res);
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
    (async () => {
      // Se conserva la versión anterior además de la actual: una pantalla que
      // quedó abierta puede seguir pidiendo sus archivos sin fallar.
      const claves = (await caches.keys()).filter((k) => k.startsWith(PREFIJO) && k !== CACHE);
      const anteriores = claves.slice(0, Math.max(0, claves.length - 1));
      await Promise.all(anteriores.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function conTimeout(promesa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promesa.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const red = fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copia = res.clone();
            event.waitUntil(cache.put(req, copia).catch(() => undefined));
          }
          return res;
        });
        try {
          return await conTimeout(red, TIMEOUT_NAVEGACION_MS);
        } catch {
          // Primero la versión actual; caches.match recorre las cachés de la más vieja a la más nueva.
          const guardada =
            (await cache.match(req, { ignoreSearch: true })) ||
            (await cache.match("/")) ||
            (await caches.match(req, { ignoreSearch: true })) ||
            (await caches.match("/"));
          if (guardada) return guardada;
          // Sin copia guardada: se espera a la red lo que haga falta.
          return red.catch(() => Response.error());
        }
      })()
    );
    return;
  }

  const esStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|svg|ico|woff2|css|js)$/.test(url.pathname);

  if (esStatic) {
    event.respondWith(
      (async () => {
        // Busca en todas las versiones guardadas (la actual y la anterior).
        const enCache = await caches.match(req);
        const red = fetch(req)
          .then(async (res) => {
            if (res.ok) {
              const cache = await caches.open(CACHE);
              await cache.put(req, res.clone());
            }
            return res;
          });
        if (enCache) {
          // Los archivos con hash nunca cambian: no hace falta revalidarlos.
          if (!url.pathname.startsWith("/_next/static/")) event.waitUntil(red.catch(() => undefined));
          return enCache;
        }
        return red.catch(() => Response.error());
      })()
    );
  }
});

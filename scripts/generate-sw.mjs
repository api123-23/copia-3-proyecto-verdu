import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const distDir = join(raiz, ".next");
const staticDir = join(distDir, "static");
const salida = join(raiz, "public", "sw.js");

function listar(dir) {
  const out = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) out.push(...listar(ruta));
    else out.push(ruta);
  }
  return out;
}

let assets = [];
if (existsSync(staticDir)) {
  assets = listar(staticDir)
    .map((ruta) => "/_next/static/" + relative(staticDir, ruta).split(sep).join("/"))
    .sort();
}

const shell = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
// Los archivos de la app NO se listan acá: Vercel los publica con otras rutas y
// nombres ("/_next/static/immutable/...") que no coinciden con el build local.
// El service worker los descubre al instalarse leyendo lo realmente publicado.
void assets;
const precache = [...new Set(shell)];

const buildIdPath = join(distDir, "BUILD_ID");
const buildId = existsSync(buildIdPath)
  ? readFileSync(buildIdPath, "utf8").trim()
  : Date.now().toString(36);

const sw = `const CACHE = "verdu-shell-${buildId}";
const PREFIJO = "verdu-shell-";
const PRECACHE = ${JSON.stringify(precache, null, 2)};
// Con señal débil no se espera eternamente a la red: pasado este tiempo se
// abre la versión guardada.
const TIMEOUT_NAVEGACION_MS = 4000;

// Rutas de archivos de la app dentro de HTML/JS/CSS publicados, con o sin
// el prefijo "/_next/" (en JS aparecen como "static/immutable/chunks/x.js").
const RE_ASSET = /(?:\\/_next\\/)?(static\\/(?:immutable|chunks|media|css)\\/[A-Za-z0-9_.\\/~-]+?\\.(?:js|css|woff2?|png|svg|jpg|webp))/g;
const MAX_ASSETS = 500;

async function guardar(cache, url) {
  const req = new Request(url, { cache: "reload" });
  const res = await fetch(req);
  if (!res || !res.ok) return null;
  await cache.put(req, res.clone());
  return res;
}

// Recorre lo publicado: HTML de las pantallas -> sus archivos -> los archivos
// que esos cargan bajo demanda (PDF, etc.). Así la caché siempre coincide con
// la versión desplegada, sin depender de nombres del build.
async function precargarApp(cache) {
  const vistos = new Set();
  const cola = [];
  const buscar = (texto) => {
    for (const m of texto.matchAll(RE_ASSET)) {
      const url = "/_next/" + m[1];
      if (!vistos.has(url) && vistos.size < MAX_ASSETS) {
        vistos.add(url);
        cola.push(url);
      }
    }
  };
  for (const pagina of ["/", "/login"]) {
    try {
      const res = await guardar(cache, pagina);
      if (res) buscar(await res.text());
    } catch {
      /* sin red: se reintenta en la próxima instalación */
    }
  }
  while (cola.length > 0) {
    const lote = cola.splice(0, 8);
    await Promise.allSettled(
      lote.map(async (url) => {
        const res = await guardar(cache, url);
        if (res && /\\.(js|css)$/.test(url)) buscar(await res.text());
      })
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        PRECACHE.map(async (url) => {
          try {
            await guardar(cache, url);
          } catch {
            /* un recurso que falle no debe romper la instalación */
          }
        })
      );
      await precargarApp(cache).catch(() => undefined);
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
    /\\.(png|svg|ico|woff2|css|js)$/.test(url.pathname);

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
`;

writeFileSync(salida, sw, "utf8");
console.log(`[sw] ${precache.length} recursos precacheados -> ${salida}`);
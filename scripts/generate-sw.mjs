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
const precache = [...new Set([...shell, ...assets])];

const buildIdPath = join(distDir, "BUILD_ID");
const buildId = existsSync(buildIdPath)
  ? readFileSync(buildIdPath, "utf8").trim()
  : Date.now().toString(36);

const sw = `const CACHE = "verdu-shell-${buildId}";
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
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
      caches.match(req).then(
        (match) =>
          match ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copia));
            return res;
          })
      )
    );
  }
});
`;

writeFileSync(salida, sw, "utf8");
console.log(`[sw] ${precache.length} recursos precacheados -> ${salida}`);
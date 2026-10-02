import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

// Tiempos máximos de espera. Son generosos a propósito: algunas consultas
// tardan bastante y con mala señal no conviene cortar antes de tiempo. Solo
// evitan que un pedido quede colgado para siempre (y con él la sincronización).
const TIMEOUT_MS = 60_000;
const TIMEOUT_STORAGE_MS = 180_000;

function urlDe(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * fetch con tiempo máximo. Si se agota, rechaza como un fetch cancelado
 * (DOMException "AbortError" con un mensaje claro): Supabase lo devuelve como
 * error de red común y los reintentos de sync.ts lo tratan igual que un corte.
 * Se usa AbortError (y no TypeError) para que postgrest no reintente por su
 * cuenta y un pedido colgado no se estire varios minutos más.
 * Respeta la señal que pase quien llama: se cancela si dispara cualquiera.
 */
const fetchConTimeout: typeof fetch = (input, init) => {
  if (typeof AbortController === "undefined") return fetch(input, init);
  const ms = urlDe(input).includes("/storage/v1/object") ? TIMEOUT_STORAGE_MS : TIMEOUT_MS;
  const externa =
    init?.signal ?? (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);

  const controlador = new AbortController();
  let agotado = false;
  const alAbortarExterna = () => controlador.abort(externa?.reason);
  if (externa) {
    if (externa.aborted) controlador.abort(externa.reason);
    else externa.addEventListener("abort", alAbortarExterna, { once: true });
  }
  // El temporizador NO se limpia al llegar la respuesta: así también corta una
  // descarga del cuerpo que quede trabada. Abortar después de haber leído el
  // cuerpo completo no tiene ningún efecto.
  const timer = setTimeout(() => {
    agotado = true;
    externa?.removeEventListener("abort", alAbortarExterna);
    controlador.abort();
  }, ms);

  return fetch(input, { ...init, signal: controlador.signal }).catch((e: unknown) => {
    clearTimeout(timer);
    externa?.removeEventListener("abort", alAbortarExterna);
    if (agotado) {
      const mensaje = `Tiempo de espera agotado (${Math.round(ms / 1000)} s); revisá la conexión.`;
      throw typeof DOMException === "function" ? new DOMException(mensaje, "AbortError") : new TypeError(mensaje);
    }
    throw e;
  });
};

export function supabase(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: fetchConTimeout } }
    );
  }
  return cliente;
}

// ---------- URLs firmadas de fotos/firmas (en lote y con caché) ----------

const BUCKET_ARCHIVOS = "informe-archivos";
const VIGENCIA_URL_S = 3600;
// Se renuevan 10 minutos antes de que venzan, para que no expiren en pantalla.
const VIGENCIA_CACHE_MS = (VIGENCIA_URL_S - 600) * 1000;

const cacheUrls = new Map<string, { url: string; vence: number }>();
let loteAbierto: { paths: Set<string>; promesa: Promise<void> } | null = null;

function urlEnCache(path: string): string | null {
  const c = cacheUrls.get(path);
  if (c && c.vence > Date.now()) return c.url;
  if (c) cacheUrls.delete(path);
  return null;
}

/** URL firmada ya disponible en caché (sin pedir nada a la red). */
export function urlFirmadaEnCache(path: string | null | undefined): string | null {
  return path ? urlEnCache(path) : null;
}

/**
 * Devuelve URLs firmadas de varios archivos del bucket con UN solo pedido
 * (createSignedUrls) en vez de uno por archivo. Los pedidos hechos en el mismo
 * ciclo (p. ej. las dos firmas) se juntan en un único lote. Las URLs quedan en
 * caché hasta poco antes de vencer. Lo que no se pudo firmar queda fuera del
 * mapa (nunca rechaza).
 */
export async function urlsFirmadas(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  const faltan: string[] = [];
  for (const p of new Set(paths)) {
    if (!p) continue;
    const url = urlEnCache(p);
    if (url) resultado.set(p, url);
    else faltan.push(p);
  }
  if (faltan.length === 0) return resultado;

  if (!loteAbierto) {
    const lote = { paths: new Set<string>(), promesa: Promise.resolve() };
    lote.promesa = new Promise<void>((r) => setTimeout(r, 0)).then(async () => {
      if (loteAbierto === lote) loteAbierto = null;
      const lista = Array.from(lote.paths);
      try {
        const { data, error } = await supabase().storage
          .from(BUCKET_ARCHIVOS)
          .createSignedUrls(lista, VIGENCIA_URL_S);
        if (error) {
          console.warn("[archivos] Error signed URLs:", error.message);
          return;
        }
        const vence = Date.now() + VIGENCIA_CACHE_MS;
        for (const item of data ?? []) {
          if (item.path && item.signedUrl && !item.error) cacheUrls.set(item.path, { url: item.signedUrl, vence });
        }
      } catch (e) {
        console.warn("[archivos] Error fetching signed URLs:", e);
      }
    });
    loteAbierto = lote;
  }
  const lote = loteAbierto;
  for (const p of faltan) lote.paths.add(p);
  await lote.promesa;
  for (const p of faltan) {
    const url = urlEnCache(p);
    if (url) resultado.set(p, url);
  }
  return resultado;
}

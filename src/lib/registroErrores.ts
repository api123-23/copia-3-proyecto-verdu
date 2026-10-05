// Registro de errores en la tabla errores_app (ver schema.sql). Nunca traba ni
// rompe nada: si no se puede registrar, se ignora. Sin señal se guarda en el
// celular (hasta 20) y se manda cuando vuelve la conexión.

type Origen = "app" | "sync" | "archivo";
type ErrorPendiente = {
  origen: Origen;
  mensaje: string;
  pantalla: string | null;
  informe_id: string | null;
  version: string | null;
  dispositivo: string | null;
  creado_en: string;
};

const CLAVE = "verdu-errores-pendientes";
const MAXIMO_GUARDADOS = 20;
const REPETICION_MS = 10 * 60 * 1000;
// Cortes de red y ruido de navegadores: son normales y llenarían la tabla.
const IGNORAR = /failed to fetch|networkerror|network request failed|load failed|sin conexi[oó]n|conexi[oó]n estable|timeout|tard[oó] demasiado|aborted|aborterror|resizeobserver|^script error\.?$/i;

const ultimaVez = new Map<string, number>();
let enviando = false;

function leer(): ErrorPendiente[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardar(lista: ErrorPendiente[]) {
  try {
    if (lista.length) localStorage.setItem(CLAVE, JSON.stringify(lista.slice(-MAXIMO_GUARDADOS)));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: se pierde el registro, nunca la app */
  }
}

/** Manda lo guardado. Lo que el servidor rechaza (p. ej. sin sesión) se descarta. */
export async function enviarErroresPendientes(): Promise<void> {
  if (enviando || typeof navigator === "undefined" || !navigator.onLine) return;
  const lista = leer();
  if (lista.length === 0) return;
  enviando = true;
  try {
    const { supabase } = await import("./supabase");
    const { data } = await supabase().auth.getSession();
    if (!data.session) return; // se manda cuando haya sesión
    const { error } = await supabase().from("errores_app").insert(lista);
    // Error de red: se reintenta después. Cualquier otro: se descarta (no se acumula).
    if (!error || !IGNORAR.test(error.message ?? "")) guardar(leer().slice(lista.length));
  } catch {
    /* sin red: queda guardado */
  } finally {
    enviando = false;
  }
}

export function registrarError(origen: Origen, error: unknown, informeId: string | null = null): void {
  try {
    const mensaje = (error instanceof Error ? error.message : String(error ?? "")).trim().slice(0, 500);
    if (!mensaje || IGNORAR.test(mensaje)) return;
    const clave = `${origen}|${mensaje}`;
    const ahora = Date.now();
    if (ahora - (ultimaVez.get(clave) ?? 0) < REPETICION_MS) return;
    ultimaVez.set(clave, ahora);
    guardar([
      ...leer(),
      {
        origen,
        mensaje,
        pantalla: (location.hash || location.pathname).slice(0, 200),
        informe_id: informeId,
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        dispositivo: navigator.userAgent.slice(0, 300),
        creado_en: new Date(ahora).toISOString(),
      },
    ]);
    void enviarErroresPendientes();
  } catch {
    /* el registro nunca rompe la app */
  }
}

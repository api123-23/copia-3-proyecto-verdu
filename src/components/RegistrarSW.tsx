"use client";

import { useEffect, useState } from "react";
import { recargarGuardando } from "@/lib/recarga";
import { enviarErroresPendientes, registrarError } from "@/lib/registroErrores";

const INTERVALO_BUSQUEDA_MS = 30 * 60 * 1000;
const RECARGA_MINIMA_MS = 60 * 1000;

export function RegistrarSW() {
  const [hayVersionNueva, setHayVersionNueva] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registro: ServiceWorkerRegistration | null = null;
    // Si la página ya estaba controlada por un service worker y cambia de
    // controlador, se instaló una versión nueva. (La primera instalación no avisa.)
    const habiaVersion = Boolean(navigator.serviceWorker.controller);
    const alCambiarVersion = () => {
      if (habiaVersion) setHayVersionNueva(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", alCambiarVersion);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void registro?.update().catch(() => undefined);
    }, INTERVALO_BUSQUEDA_MS);
    const registrar = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((r) => { registro = r; })
        .catch((e) => console.error(e));
    };
    // Si la página ya terminó de cargar, el evento "load" no vuelve a ocurrir.
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar);
    // La PWA puede quedar abierta días: al volver a primer plano se busca versión nueva.
    const buscarActualizacion = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void registro?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", buscarActualizacion);
    // Evita que el navegador borre los informes guardados si falta espacio.
    void navigator.storage?.persist?.().catch(() => false);

    // Solo cuando falta un archivo de la propia app (pasa tras publicar una
    // versión nueva). Un corte de red común ("Failed to fetch") NO recarga:
    // eso interrumpía al técnico en medio de una firma.
    const recargarSiFallaChunk = (mensaje: string, error?: unknown) => {
      if (!/ChunkLoadError|Failed to load chunk|Loading chunk|dynamically imported module|Importing a module script failed/i.test(mensaje)) {
        // Cualquier otro error inesperado queda registrado (ver registroErrores).
        registrarError("app", error ?? mensaje);
        return;
      }
      // Freno anti-bucle: como mucho una recarga por minuto. (Antes era una marca
      // que no siempre se borraba y dejaba de recargar en publicaciones siguientes.)
      let ultima = 0;
      try { ultima = Number(sessionStorage.getItem("verdu-recargando")) || 0; } catch { /* sin storage */ }
      if (Date.now() - ultima < RECARGA_MINIMA_MS) return;
      try { sessionStorage.setItem("verdu-recargando", String(Date.now())); } catch { /* sin storage */ }
      void recargarGuardando();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      recargarSiFallaChunk(String(e.reason?.message ?? e.reason ?? ""), e.reason);
    };
    const onError = (e: ErrorEvent) => recargarSiFallaChunk(e.message ?? "", e.error);
    // Errores guardados sin señal (o de una sesión anterior): se mandan ahora y al volver la conexión.
    void enviarErroresPendientes();
    window.addEventListener("online", enviarErroresPendientes);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", alCambiarVersion);
      window.clearInterval(intervalo);
      window.removeEventListener("load", registrar);
      document.removeEventListener("visibilitychange", buscarActualizacion);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("online", enviarErroresPendientes);
      window.removeEventListener("error", onError);
    };
  }, []);

  if (!hayVersionNueva) return null;
  // Bloquea toda la pantalla: la única salida es actualizar (los cambios se
  // publican fuera del horario de trabajo).
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="aviso-version-titulo"
      aria-describedby="aviso-version-texto"
    >
      <div className="aviso-version flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-primary px-6 py-8 text-center text-on-primary shadow-2xl shadow-black/40">
        <span className="relative flex h-4 w-4" aria-hidden="true">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-300/70" />
          <span className="relative h-4 w-4 rounded-full bg-sky-300" />
        </span>
        <h2 id="aviso-version-titulo" className="text-xl font-extrabold leading-tight [text-wrap:balance]">
          Hay una nueva versión de la app
        </h2>
        <p id="aviso-version-texto" className="text-sm leading-snug text-on-primary/85">
          Tocá Actualizar para seguir. Lo que estabas cargando queda guardado.
        </p>
        <button
          type="button"
          autoFocus
          disabled={actualizando}
          // Lo cargado en un informe se guarda antes de recargar.
          onClick={() => {
            setActualizando(true);
            void recargarGuardando();
          }}
          className="mt-2 w-full rounded-xl bg-white py-3.5 text-base font-extrabold uppercase tracking-wider text-primary shadow-md transition-transform active:scale-95 disabled:opacity-70"
        >
          {actualizando ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
    </div>
  );
}

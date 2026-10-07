"use client";

import { useEffect, useState } from "react";
import { recargarGuardando } from "@/lib/recarga";
import { enviarErroresPendientes, registrarError } from "@/lib/registroErrores";

const INTERVALO_BUSQUEDA_MS = 30 * 60 * 1000;
const RECARGA_MINIMA_MS = 60 * 1000;

export function RegistrarSW() {
  const [hayVersionNueva, setHayVersionNueva] = useState(false);

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
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.6rem)" }}
      role="status"
      aria-live="polite"
    >
      <div className="aviso-version pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-primary py-2 pl-3 pr-2 text-on-primary shadow-xl shadow-black/30">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-300/70" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-sky-300" />
        </span>
        <span className="text-[12.5px] font-bold leading-tight">Hay una nueva versión de la app</span>
        <button
          type="button"
          // Lo cargado en un informe se guarda antes de recargar.
          onClick={() => void recargarGuardando()}
          className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary shadow-sm transition-transform active:scale-95"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}

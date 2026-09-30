"use client";

import { useEffect, useState } from "react";

const INTERVALO_BUSQUEDA_MS = 30 * 60 * 1000;

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

    const recargarSiFallaChunk = (mensaje: string) => {
      if (!/dynamically imported module|failed to fetch|error loading|loading chunk/i.test(mensaje)) return;
      if (sessionStorage.getItem("verdu-recargando") === "1") return;
      sessionStorage.setItem("verdu-recargando", "1");
      window.location.reload();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      recargarSiFallaChunk(String(e.reason?.message ?? e.reason ?? ""));
    };
    const onError = (e: ErrorEvent) => recargarSiFallaChunk(e.message ?? "");
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    const limpiarMarca = () => sessionStorage.removeItem("verdu-recargando");
    window.addEventListener("load", limpiarMarca);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", alCambiarVersion);
      window.clearInterval(intervalo);
      window.removeEventListener("load", registrar);
      document.removeEventListener("visibilitychange", buscarActualizacion);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("load", limpiarMarca);
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
          // Lo cargado en un informe se guarda solo antes de recargar.
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary shadow-sm transition-transform active:scale-95"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}

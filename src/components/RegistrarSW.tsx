"use client";

import { useEffect } from "react";

export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registro: ServiceWorkerRegistration | null = null;
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
      window.removeEventListener("load", registrar);
      document.removeEventListener("visibilitychange", buscarActualizacion);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("load", limpiarMarca);
    };
  }, []);

  return null;
}

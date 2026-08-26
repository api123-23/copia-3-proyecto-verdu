"use client";

import { useEffect } from "react";

export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.error(e));
    };
    window.addEventListener("load", registrar);

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
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("load", limpiarMarca);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.error(e));
    };
    window.addEventListener("load", registrar);
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}

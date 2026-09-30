"use client";

import { useSyncExternalStore } from "react";

function suscribir(oyente: () => void) {
  window.addEventListener("online", oyente);
  window.addEventListener("offline", oyente);
  return () => {
    window.removeEventListener("online", oyente);
    window.removeEventListener("offline", oyente);
  };
}

/** true si el dispositivo tiene conexión (se actualiza al perderla/recuperarla). */
export function useEnLinea(): boolean {
  return useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
}

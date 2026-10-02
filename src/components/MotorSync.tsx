"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// El motor de sincronización (y con él Dexie) se carga recién cuando hace falta:
// así la pantalla de ingreso no descarga la base local que no usa.
function sincronizar(): void {
  void import("@/lib/sync")
    .then(({ intentarSync }) => intentarSync())
    .catch((e: unknown) => console.warn("[sync] no se pudo cargar el motor:", e));
}

// En /login no hay sesión: no tiene sentido sincronizar (se hace al ingresar).
function enLogin(): boolean {
  return window.location.pathname.startsWith("/login");
}

// Espera al azar (0–3 s) antes de sincronizar por volver la señal o la app al
// frente: evita que todos los celulares golpeen el servidor al mismo tiempo.
const ESPERA_MAX_MS = 3000;

// Sincronización inicial ya disparada (al abrir la app fuera de /login).
let sincronizoAlInicio = false;

export function MotorSync() {
  const ruta = usePathname();

  // Sincronización al abrir la app; si se abrió en /login, se hace al salir de ahí.
  useEffect(() => {
    if (sincronizoAlInicio || !ruta || ruta.startsWith("/login")) return;
    sincronizoAlInicio = true;
    sincronizar();
  }, [ruta]);

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | null = null;
    const sincronizarEspaciado = () => {
      if (enLogin() || espera) return;
      espera = setTimeout(() => {
        espera = null;
        sincronizar();
      }, Math.random() * ESPERA_MAX_MS);
    };
    const onOnline = () => sincronizarEspaciado();
    const onVisible = () => {
      if (document.visibilityState === "visible") sincronizarEspaciado();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const { data: sub } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN") sincronizar();
    });
    return () => {
      if (espera) clearTimeout(espera);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

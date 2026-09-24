"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const SESION_CACHE_KEY = "air-power-sesion-cache";

function leerSesionCache(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(SESION_CACHE_KEY) ?? "null") as Session | null;
  } catch {
    return null;
  }
}

export function limpiarSesionCache(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESION_CACHE_KEY);
}

export function useSesion(requiere: boolean) {
  const [sesion, setSesion] = useState<Session | null>(() => leerSesionCache());
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    void supabase().auth.getSession().then(({ data }) => {
      if (!activo) return;
      if (data.session) {
        window.localStorage.setItem(SESION_CACHE_KEY, JSON.stringify(data.session));
        setSesion(data.session);
      } else if (!navigator.onLine) {
        setSesion(leerSesionCache());
      } else {
        limpiarSesionCache();
        setSesion(null);
      }
      setCargando(false);
    }).catch(() => {
      if (!activo) return;
      setSesion(!navigator.onLine ? leerSesionCache() : null);
      setCargando(false);
    });
    const { data: sub } = supabase().auth.onAuthStateChange((_evento, s) => {
      if (!activo) return;
      if (s) {
        window.localStorage.setItem(SESION_CACHE_KEY, JSON.stringify(s));
        setSesion(s);
      } else if (navigator.onLine) {
        limpiarSesionCache();
        setSesion(null);
      } else {
        setSesion(leerSesionCache());
      }
      setCargando(false);
    });
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (requiere && !cargando && !sesion) router.replace("/login");
  }, [requiere, cargando, sesion, router]);

  return { sesion, cargando };
}

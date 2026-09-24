"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { supabase } from "@/lib/supabase";

function clavePerfil(uid: string): string {
  return `air-power-perfil-${uid}`;
}

function leerPerfilCache(uid: string): PerfilActual {
  if (typeof window === "undefined") return null;
  try {
    const cache = JSON.parse(window.localStorage.getItem(clavePerfil(uid)) ?? "null") as { uid?: string; perfil?: PerfilActual } | null;
    return cache?.uid === uid ? cache.perfil ?? null : null;
  } catch {
    return null;
  }
}

export type PerfilActual = {
  rol: "tecnico" | "admin";
  email: string | null;
  nombre: string | null;
  apellido: string | null;
} | null;

export function usePerfil(): {
  perfil: PerfilActual;
  cargando: boolean;
  esAdmin: boolean;
  refrescar: () => void;
} {
  const { sesion } = useSesion(false);
  const [perfil, setPerfil] = useState<PerfilActual>(null);
  const [cargando, setCargando] = useState<boolean>(() => !sesion?.user?.id);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!sesion?.user?.id) {
      const id = window.setTimeout(() => {
        setPerfil(null);
        setCargando(false);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const uid = sesion.user.id;
    const cache = leerPerfilCache(uid);
    if (cache) {
      queueMicrotask(() => {
        setPerfil(cache);
        setCargando(false);
      });
    }
    let activo = true;
    (async () => {
      try {
        const { data } = await supabase()
          .from("perfiles")
          .select("rol, email, nombre, apellido")
          .eq("id", sesion.user.id)
          .maybeSingle();
        if (!activo) return;
        if (data) {
          const nuevoPerfil = {
            rol: data.rol === "admin" ? "admin" : "tecnico",
            email: data.email || sesion.user.email || null,
            nombre: data.nombre ?? null,
            apellido: data.apellido ?? null,
          } satisfies NonNullable<PerfilActual>;
          window.localStorage.setItem(clavePerfil(uid), JSON.stringify({ uid, perfil: nuevoPerfil }));
          setPerfil(nuevoPerfil);
        } else if (!cache) {
          setPerfil(null);
        }
      } catch {
        if (!activo) return;
        if (cache) setPerfil(cache);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [sesion, intento]);

  return {
    perfil,
    cargando,
    esAdmin: perfil?.rol === "admin",
    refrescar: () => setIntento((i) => i + 1),
  };
}

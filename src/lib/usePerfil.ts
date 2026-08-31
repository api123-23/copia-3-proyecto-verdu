"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { supabase } from "@/lib/supabase";

export type PerfilActual = {
  rol: "tecnico" | "admin";
  email: string | null;
} | null;

export function usePerfil(): {
  perfil: PerfilActual;
  cargando: boolean;
  esAdmin: boolean;
} {
  const { sesion } = useSesion(false);
  const [perfil, setPerfil] = useState<PerfilActual>(null);
  const [cargando, setCargando] = useState<boolean>(() => !sesion?.user?.id);

  useEffect(() => {
    if (!sesion?.user?.id) {
      return;
    }
    let activo = true;
    (async () => {
      try {
        const { data } = await supabase()
          .from("perfiles")
          .select("rol, email")
          .eq("id", sesion.user.id)
          .maybeSingle();
        if (!activo) return;
        if (data) {
          setPerfil({
            rol: data.rol === "admin" ? "admin" : "tecnico",
            email: data.email || sesion.user.email || null,
          });
        } else {
          setPerfil({ rol: "tecnico", email: sesion.user.email || null });
        }
      } catch {
        if (!activo) return;
        setPerfil({ rol: "tecnico", email: sesion.user.email || null });
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [sesion]);

  return {
    perfil,
    cargando,
    esAdmin: perfil?.rol === "admin",
  };
}
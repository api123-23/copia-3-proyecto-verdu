"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { supabase } from "@/lib/supabase";

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
      return;
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
          setPerfil({
            rol: data.rol === "admin" ? "admin" : "tecnico",
            email: data.email || sesion.user.email || null,
            nombre: data.nombre ?? null,
            apellido: data.apellido ?? null,
          });
        } else {
          setPerfil({ rol: "tecnico", email: sesion.user.email || null, nombre: null, apellido: null });
        }
      } catch {
        if (!activo) return;
        setPerfil({ rol: "tecnico", email: sesion.user.email || null, nombre: null, apellido: null });
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
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function useSesion(requiere: boolean) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!activo) return;
        setSesion(data.session);
        setCargando(false);
      });
    const { data: sub } = supabase().auth.onAuthStateChange((_evento, s) => {
      if (!activo) return;
      setSesion(s);
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

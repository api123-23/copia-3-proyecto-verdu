"use client";

import { supabase } from "./supabase";
import { pedirVerificacionSesion } from "./reautenticacion";

async function tokenActual(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

function conToken(init: RequestInit | undefined, token: string | null): RequestInit {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  };
}

/**
 * fetch a las rutas /api con la sesión del usuario. Si el servidor rechaza la
 * credencial (401: vencida o desfasada), la renueva y reintenta una vez; si
 * aun así no sirve, pide la contraseña con el panel de re-ingreso.
 */
export async function fetchAutenticado(ruta: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(ruta, conToken(init, await tokenActual()));
  if (res.status !== 401) return res;
  const { data, error } = await supabase().auth.refreshSession();
  if (error || !data.session) {
    pedirVerificacionSesion();
    return res;
  }
  const reintento = await fetch(ruta, conToken(init, data.session.access_token));
  if (reintento.status === 401) pedirVerificacionSesion();
  return reintento;
}

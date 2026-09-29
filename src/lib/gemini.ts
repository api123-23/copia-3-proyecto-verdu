"use client";

import { supabase } from "./supabase";

export async function gemini(prompt: string): Promise<string> {
  const { data: sesion } = await supabase().auth.getSession();
  const token = sesion.session?.access_token;
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error("Tu sesión venció. Volvé a ingresar tu contraseña para usar la IA.");
  }
  if (!res.ok) {
    throw new Error(data?.error ?? "Error al contactar la IA.");
  }
  if (!data?.texto) {
    throw new Error("La IA no devolvió texto.");
  }
  return data.texto;
}

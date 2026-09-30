"use client";

import { fetchAutenticado } from "./fetchAutenticado";

export async function gemini(prompt: string): Promise<string> {
  const res = await fetchAutenticado("/api/gemini", {
    method: "POST",
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

"use client";

export async function gemini(prompt: string): Promise<string> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? "Error al contactar la IA.");
  }
  if (!data?.texto) {
    throw new Error("La IA no devolvió texto.");
  }
  return data.texto;
}
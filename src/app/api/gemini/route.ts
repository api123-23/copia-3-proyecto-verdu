import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generarConFallback, proveedoresConfigurados } from "@/lib/ai-service";

// Límite del texto a reformular: evita abusos y costos inesperados.
const MAX_PROMPT = 12_000;

/** Solo usuarios con sesión válida pueden usar las claves de IA. */
async function usuarioAutenticado(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!url || !anon || !token) return false;
  try {
    const cliente = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await cliente.auth.getUser(token);
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Health check: sirve para verificar en el deploy que el endpoint /api/gemini
// existe (si esto da 200, el problema está en la key/modelo de Google, no el route).
export async function GET(req: Request) {
  if (!(await usuarioAutenticado(req))) {
    return NextResponse.json({ ok: true });
  }
  const proveedores = proveedoresConfigurados();
  return NextResponse.json({
    ok: true,
    api_key: proveedores.gemini ? "configurada" : "FALTA",
    openrouter_api_key: proveedores.openrouter ? "configurada" : "FALTA",
  });
}

export async function POST(req: Request) {
  if (!(await usuarioAutenticado(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { prompt: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Falta el prompt." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT) {
    return NextResponse.json({ error: "El texto es demasiado largo para procesarlo con IA." }, { status: 413 });
  }

  try {
    const texto = await generarConFallback(prompt);
    return NextResponse.json({ texto });
  } catch (error) {
    console.error("[ai] request failed after provider cascade", error instanceof Error ? error.message : "error inesperado");
    return NextResponse.json(
      { error: "No se pudo completar la solicitud de IA. Verificá la configuración de Gemini u OpenRouter." },
      { status: 502 }
    );
  }
}

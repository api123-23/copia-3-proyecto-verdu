import { NextResponse } from "next/server";
import { generarConFallback, proveedoresConfigurados } from "@/lib/ai-service";

// Health check: sirve para verificar en el deploy que el endpoint /api/gemini
// existe (si esto da 200, el problema está en la key/modelo de Google, no el route).
export async function GET() {
  const proveedores = proveedoresConfigurados();
  return NextResponse.json({
    ok: true,
    api_key: proveedores.gemini ? "configurada" : "FALTA",
    openrouter_api_key: proveedores.openrouter ? "configurada" : "FALTA",
  });
}

export async function POST(req: Request) {
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

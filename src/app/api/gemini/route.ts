import { NextResponse } from "next/server";

// Modelos en orden: más barato/accesible primero. Se prueba en secuencia porque
// algunos modelos pueden estar descontinuados o no habilitados para la API key
// (p. ej. las keys gratuitas no siempre exponen todos los modelos).
const MODELOS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

// Health check: sirve para verificar en el deploy que el endpoint /api/gemini
// existe (si esto da 200, el problema está en la key/modelo de Google, no el route).
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ? "configurada" : "FALTA";
  return NextResponse.json({ ok: true, api_key: apiKey });
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY no está configurada en el servidor." },
      { status: 500 }
    );
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

  let ultimoStatus = 0;
  let ultimoDetalle = "";

  for (const modelo of MODELOS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        }
      );

      if (!res.ok) {
        const texto = await res.text();
        ultimoStatus = res.status;
        ultimoDetalle = texto;
        console.error(`[gemini] ${modelo} error ${res.status}:`, texto);
        // 404/400 de modelo → probar el siguiente; otros errores (429, 5xx) se cortan.
        if (res.status !== 404 && res.status !== 400) {
          return NextResponse.json(
            { error: `Error de Gemini (${res.status}).`, detalle: texto },
            { status: res.status }
          );
        }
        continue;
      }

      const data = await res.json();
      const texto =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
        "";
      if (!texto) {
        return NextResponse.json({ error: "Gemini no devolvió texto." }, { status: 502 });
      }
      return NextResponse.json({ texto });
    } catch (e) {
      console.error("[gemini] fetch error:", e);
      return NextResponse.json({ error: "No se pudo contactar a Gemini." }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      error: `Todos los modelos de Gemini devolvieron error (${ultimoStatus}). Verificá que la API key esté habilitada y tenga acceso a los modelos.`,
      detalle: ultimoDetalle,
    },
    { status: 502 }
  );
}
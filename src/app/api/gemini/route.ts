import { NextResponse } from "next/server";

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

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const texto = await res.text();
      console.error("[gemini] API error:", res.status, texto);
      return NextResponse.json(
        { error: `Error de Gemini (${res.status}).` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const texto =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
      "";
    return NextResponse.json({ texto });
  } catch (e) {
    console.error("[gemini] fetch error:", e);
    return NextResponse.json({ error: "No se pudo contactar a Gemini." }, { status: 500 });
  }
}
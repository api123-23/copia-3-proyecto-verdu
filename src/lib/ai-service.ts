const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

const OPENROUTER_MODEL = "openrouter/free";
const REQUEST_TIMEOUT_MS = 30_000;

class ProviderFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderFailure";
  }
}

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

function textoGemini(data: unknown): string {
  const candidatos = (data as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)?.candidates;
  const texto = candidatos?.[0]?.content?.parts?.map((parte) => typeof parte.text === "string" ? parte.text : "").join("") ?? "";
  if (!texto.trim()) throw new ProviderFailure("respuesta vacía de Gemini");
  return texto;
}

function textoOpenRouter(data: unknown): string {
  const contenido = (data as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  const texto = typeof contenido === "string"
    ? contenido
    : Array.isArray(contenido)
      ? contenido.map((parte) => typeof parte === "object" && parte !== null && "text" in parte && typeof parte.text === "string" ? parte.text : "").join("")
      : "";
  if (!texto.trim()) throw new ProviderFailure("respuesta vacía de OpenRouter");
  return texto;
}

async function llamarGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderFailure("GEMINI_API_KEY no configurada");

  let ultimoError = "error desconocido";
  for (const modelo of GEMINI_MODELS) {
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
          signal: timeoutSignal(),
        }
      );

      if (!res.ok) {
        ultimoError = `HTTP ${res.status} en ${modelo}`;
        if (res.status === 400 || res.status === 404) continue;
        throw new ProviderFailure(ultimoError);
      }
      return textoGemini(await res.json());
    } catch (error) {
      if (error instanceof ProviderFailure) throw error;
      ultimoError = error instanceof DOMException && error.name === "TimeoutError"
        ? `timeout en ${modelo}`
        : `fallo de conexión en ${modelo}`;
      throw new ProviderFailure(ultimoError);
    }
  }
  throw new ProviderFailure(ultimoError);
}

async function llamarOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ProviderFailure("OPENROUTER_API_KEY no configurada");

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 2048,
      }),
      signal: timeoutSignal(),
    });
  } catch (error) {
    const detalle = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "fallo de conexión";
    throw new ProviderFailure(detalle);
  }

  if (!res.ok) throw new ProviderFailure(`HTTP ${res.status} en OpenRouter`);
  return textoOpenRouter(await res.json());
}

export async function generarConFallback(prompt: string): Promise<string> {
  try {
    return await llamarGemini(prompt);
  } catch (geminiError) {
    const detalleGemini = geminiError instanceof ProviderFailure ? geminiError.message : "error inesperado";
    console.warn("[ai] AI provider Gemini failed -> attempting OpenRouter fallback", detalleGemini);
    try {
      return await llamarOpenRouter(prompt);
    } catch (openRouterError) {
      const detalleOpenRouter = openRouterError instanceof ProviderFailure ? openRouterError.message : "error inesperado";
      console.error("[ai] AI provider fallback failed -> Gemini + OpenRouter", {
        gemini: detalleGemini,
        openrouter: detalleOpenRouter,
      });
      throw new Error("Gemini y OpenRouter no pudieron completar la solicitud de IA.");
    }
  }
}

export function proveedoresConfigurados() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

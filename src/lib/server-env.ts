type PrivateEnvName = "GEMINI_API_KEY" | "OPENROUTER_API_KEY" | "SUPABASE_SERVICE_ROLE_KEY";

const PRIVATE_ENV_PARTS: Record<PrivateEnvName, string[]> = {
  GEMINI_API_KEY: ["GEMINI", "API", "KEY"],
  OPENROUTER_API_KEY: ["OPENROUTER", "API", "KEY"],
  SUPABASE_SERVICE_ROLE_KEY: ["SUPABASE", "SERVICE", "ROLE", "KEY"],
};

export function serverEnv(nombre: PrivateEnvName): string | undefined {
  return process.env[PRIVATE_ENV_PARTS[nombre].join("_")];
}

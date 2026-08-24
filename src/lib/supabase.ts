import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cliente;
}

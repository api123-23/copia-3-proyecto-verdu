import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Configuración incompleta." }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin: SupabaseClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data } = await admin.from("perfiles").select("id, nombre, apellido");
  const tecnicos = (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre ?? null,
    apellido: p.apellido ?? null,
  }));

  return NextResponse.json({ tecnicos });
}

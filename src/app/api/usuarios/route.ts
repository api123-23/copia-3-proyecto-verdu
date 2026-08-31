import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor." },
      { status: 500 }
    );
  }
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const perfiles = await admin.from("perfiles").select("id, rol, email, nombre, apellido");
  const perfilPorId = new Map<string, { rol: string; email: string | null; nombre: string | null; apellido: string | null }>();
  if (!perfiles.error) {
    for (const p of perfiles.data ?? []) {
      perfilPorId.set(p.id, p);
    }
  }
  const usuarios = data.users.map((u) => {
    const per = perfilPorId.get(u.id);
    return {
      id: u.id,
      email: per?.email ?? u.email ?? null,
      rol: per?.rol ?? "tecnico",
      nombre: per?.nombre ?? null,
      apellido: per?.apellido ?? null,
      creado_en: u.created_at,
    };
  });
  return NextResponse.json({ usuarios });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor." },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string; rol?: string; nombre?: string; apellido?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rol = body.rol === "admin" ? "admin" : "tecnico";
  const nombre = String(body.nombre ?? "").trim() || null;
  const apellido = String(body.apellido ?? "").trim() || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const uid = data.user?.id;
  if (uid) {
    const { error: perfilError } = await admin
      .from("perfiles")
      .upsert({ id: uid, rol, email, nombre, apellido });
    if (perfilError) {
      console.error("[usuarios] error al asignar rol:", perfilError.message);
    }
  }

  return NextResponse.json({ ok: true, id: uid });
}
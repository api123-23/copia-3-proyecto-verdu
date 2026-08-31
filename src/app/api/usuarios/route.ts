import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function sinClave(metodo: string): NextResponse {
  return NextResponse.json(
    {
      error: `SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (${metodo}).`,
    },
    { status: 500 }
  );
}

async function esAdminAutenticado(
  req: Request,
  admin: SupabaseClient
): Promise<boolean> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return false;

  try {
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return false;

    const { data: perfil } = await admin
      .from("perfiles")
      .select("rol")
      .eq("id", userData.user.id)
      .maybeSingle();
    return perfil?.rol === "admin";
  } catch {
    return false;
  }
}

function crearAdmin(url: string, key: string) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return sinClave("GET");
  const admin = crearAdmin(url, key);
  if (!(await esAdminAutenticado(req, admin))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

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
  if (!url || !key) return sinClave("POST");
  const admin = crearAdmin(url, key);
  if (!(await esAdminAutenticado(req, admin))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
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

export async function DELETE(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return sinClave("DELETE");
  const admin = crearAdmin(url, key);
  if (!(await esAdminAutenticado(req, admin))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Falta el id del usuario." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id });
}
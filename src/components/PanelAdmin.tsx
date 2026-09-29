"use client";

import { useEffect, useState } from "react";
import { usePerfil } from "@/lib/usePerfil";
import { supabase } from "@/lib/supabase";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { IconoLinea } from "@/components/IconoLinea";
import { PantallaCarga } from "@/components/PantallaCarga";

type Usuario = {
  id: string;
  email: string | null;
  rol: string;
  nombre: string | null;
  apellido: string | null;
  creado_en: string;
};

export function PanelAdmin() {
  const { cargando, esMaster } = usePerfil();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [apellidoNuevo, setApellidoNuevo] = useState("");
  const [rol, setRol] = useState<"tecnico" | "admin" | "master">("tecnico");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  async function authFetch(path: string, init?: RequestInit) {
    const { data: ses } = await supabase().auth.getSession();
    const token = ses?.session?.access_token;
    return fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  }

  async function cargar() {
    setCargandoLista(true);
    setError(null);
    try {
      const res = await authFetch("/api/usuarios");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar usuarios.");
      setUsuarios(data.usuarios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios.");
    } finally {
      setCargandoLista(false);
    }
  }

  useEffect(() => {
    if (!cargando && esMaster) {
      const t = window.setTimeout(() => void cargar(), 0);
      return () => window.clearTimeout(t);
    }
  }, [cargando, esMaster]);

  if (cargando) return <PantallaCarga mensaje="Cargando panel..." />;

  if (!esMaster) {
    return (
      <div className="px-margin py-xl text-center">
        <p className="text-body-lg text-on-surface-variant">
          No tenés permisos de administrador para ver esta sección.
        </p>
        <a href="#/" className="mt-md inline-block bg-primary text-on-primary rounded-lg px-md py-1.5">
          Volver al listado
        </a>
      </div>
    );
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setCreando(true);
    try {
      const res = await authFetch("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ email, password, rol, nombre: nombreNuevo, apellido: apellidoNuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el usuario.");
      setOk(`Usuario creado: ${email}`);
      setEmail("");
      setPassword("");
      setNombreNuevo("");
      setApellidoNuevo("");
      void cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  async function eliminar(u: Usuario) {
    const { data: ses } = await supabase().auth.getSession();
    const uidActual = ses?.session?.user?.id;
    if (uidActual && uidActual === u.id) {
      setError("No podés eliminar tu propio usuario.");
      return;
    }
    const confirma = window.confirm(
      `¿Eliminar al usuario ${u.nombre || u.apellido || u.email}? Esta acción no se puede deshacer.`
    );
    if (!confirma) return;
    setError(null);
    setOk(null);
    try {
      const res = await authFetch("/api/usuarios", {
        method: "DELETE",
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar el usuario.");
      setOk("Usuario eliminado.");
      void cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar el usuario.");
    }
  }

  const texto = busqueda.trim().toLowerCase();
  const filtrados = texto
    ? usuarios.filter((u) => `${u.nombre ?? ""} ${u.apellido ?? ""} ${u.email ?? ""}`.toLowerCase().includes(texto))
    : usuarios;

  return (
    <div className="pb-xl px-margin max-w-3xl mx-auto md:px-margin"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
      }}
    >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-2">
          <a href="#/" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all" aria-label="Volver">
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Panel de Administración
          </h1>
        </div>
      </header>

      <div className="h-md" aria-hidden="true" />

      {error ? (
        <div className="aviso-panel mb-md flex items-start gap-2 rounded-xl border border-error/40 bg-error-container/60 px-3 py-2 text-[13px] text-error" role="alert">
          <IconoLinea nombre="alerta" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {ok ? (
        <div className="aviso-panel mb-md flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-50 px-3 py-2 text-[13px] text-green-800" role="status">
          <IconoLinea nombre="check" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ok}</span>
        </div>
      ) : null}

      <section className="section-card mb-lg rounded-2xl border border-outline-variant bg-white p-md shadow-sm">
        <h2 className="mb-md flex items-center gap-2 text-title-md font-title-md font-bold uppercase tracking-wider text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icono nombre="add" className="h-4 w-4" /></span>
          Crear técnico / usuario
        </h2>
        <form onSubmit={crear} className="space-y-sm">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Email</span>
            <input
              className="input-technical w-full h-[40px]"
              type="email"
              required
              placeholder="tecnico@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Contraseña</span>
            <span className="relative block">
              <input
                className="input-technical w-full h-[40px] pr-16"
                type={verPassword ? "text" : "password"}
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setVerPassword((v) => !v)} className="absolute right-1 top-1/2 h-8 -translate-y-1/2 rounded-md px-2 text-[12px] font-bold text-primary">
                {verPassword ? "Ocultar" : "Ver"}
              </button>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-sm">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Nombre</span>
              <input
                className="input-technical w-full h-[40px]"
                type="text"
                placeholder="Opcional"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Apellido</span>
              <input
                className="input-technical w-full h-[40px]"
                type="text"
                placeholder="Opcional"
                value={apellidoNuevo}
                onChange={(e) => setApellidoNuevo(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Rol</span>
            <div className="selector-rol grid grid-cols-3 gap-1 rounded-xl bg-surface-container-low p-1" role="radiogroup" aria-label="Rol">
              {([
                { valor: "tecnico", etiqueta: "Técnico" },
                { valor: "admin", etiqueta: "Admin" },
                { valor: "master", etiqueta: "Master" },
              ] as const).map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  role="radio"
                  aria-checked={rol === opcion.valor}
                  onClick={() => setRol(opcion.valor)}
                  className={`rounded-lg py-2 text-[13px] font-bold transition-all duration-200 ${
                    rol === opcion.valor ? "bg-white text-primary shadow-sm ring-1 ring-primary/20" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={creando}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary-container px-md py-2.5 text-title-md font-title-md font-bold uppercase tracking-wider text-on-primary shadow-md shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {creando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Icono nombre="person" className="w-[16px] h-[16px]" />
                Crear usuario
              </>
            )}
          </button>
        </form>
      </section>

      <section className="section-card rounded-2xl border border-outline-variant bg-white p-md shadow-sm">
        <div className="mb-sm flex items-center justify-between gap-2">
          <h2 className="text-title-md font-title-md font-bold uppercase tracking-wider text-primary">
            Usuarios <span className="text-on-surface-variant">({usuarios.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargandoLista}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] font-bold text-primary transition-all hover:bg-surface-container-low active:scale-95 disabled:opacity-50"
          >
            {cargandoLista ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" /> : null}
            Actualizar
          </button>
        </div>
        <label className="relative mb-sm block">
          <IconoLinea nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            className="input-technical h-[40px] w-full pl-9"
            placeholder="Buscar por nombre o email"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar usuario"
          />
        </label>
        {cargandoLista && usuarios.length === 0 ? (
          <div className="space-y-2" aria-label="Cargando usuarios">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
                <span className="esqueleto h-10 w-10 rounded-full" />
                <span className="flex-1 space-y-1.5"><span className="esqueleto block h-3.5 w-1/2 rounded" /><span className="esqueleto block h-3 w-2/3 rounded" /></span>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-3 py-6 text-center text-body-md text-on-surface-variant">
            {usuarios.length === 0 ? "No hay usuarios." : "No hay usuarios que coincidan con la búsqueda."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((u, index) => {
              const nombre = u.nombre || u.apellido ? `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() : u.email ?? "sin email";
              const inicial = (nombre.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
              const rolInfo = u.rol === "master"
                ? { texto: "Master", clase: "bg-violet-100 text-violet-800", avatar: "from-violet-500 to-violet-700" }
                : u.rol === "admin"
                  ? { texto: "Administrador", clase: "bg-sky-100 text-sky-800", avatar: "from-sky-500 to-sky-700" }
                  : { texto: "Técnico", clase: "bg-emerald-100 text-emerald-800", avatar: "from-emerald-500 to-emerald-700" };
              return (
                <li
                  key={u.id}
                  className="fila-usuario list-item-in flex items-center gap-3 rounded-xl border border-outline-variant p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  style={{ "--item-delay": `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-extrabold text-white shadow-sm ${rolInfo.avatar}`}>
                    {inicial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-bold text-on-surface">{nombre}</p>
                    <p className="truncate text-[11px] text-on-surface-variant">{u.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${rolInfo.clase}`}>{rolInfo.texto}</span>
                      <span className="text-on-surface-variant">desde {new Date(u.creado_en).toLocaleDateString("es-AR")}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Eliminar usuario"
                    aria-label={`Eliminar a ${nombre}`}
                    onClick={() => void eliminar(u)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:bg-error-container/60 active:scale-90"
                  >
                    <Icono nombre="delete" className="w-[18px] h-[18px] text-error" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

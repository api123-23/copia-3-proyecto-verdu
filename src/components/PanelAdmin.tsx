"use client";

import { useEffect, useState } from "react";
import { usePerfil } from "@/lib/usePerfil";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";

type Usuario = { id: string; email: string | null; creado_en: string };

export function PanelAdmin() {
  const { cargando, esAdmin } = usePerfil();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"tecnico" | "admin">("tecnico");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargandoLista(true);
    setError(null);
    try {
      const res = await fetch("/api/usuarios");
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
    if (!cargando && esAdmin) {
      const t = window.setTimeout(() => void cargar(), 0);
      return () => window.clearTimeout(t);
    }
  }, [cargando, esAdmin]);

  if (cargando) return <Cargando />;

  if (!esAdmin) {
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
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el usuario.");
      setOk(`Usuario creado: ${email}`);
      setEmail("");
      setPassword("");
      void cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

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
          <a href="#/" className="hover:bg-primary-container active:scale-95 transition-all px-2 py-1 rounded" aria-label="Volver">
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Panel de Administración
          </h1>
        </div>
      </header>

      <div className="bg-white border-b border-outline-variant px-md py-1 flex items-center justify-between mb-md shadow-sm">
        <span className="flex items-center gap-2 text-title-md font-title-md font-bold text-primary">
          <LogoTipo className="w-5 h-5 rounded" />
          AIR POWER S.A.
        </span>
      </div>

      <section className="bg-white border border-outline-variant rounded-xl shadow-sm p-md mb-lg">
        <h2 className="text-title-md font-title-md font-bold text-primary mb-sm uppercase tracking-wider">
          Crear Técnico / Usuario
        </h2>
        <form onSubmit={crear} className="space-y-sm">
          <input
            className="input-technical w-full h-[36px]"
            type="email"
            required
            placeholder="Email del usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
          <input
            className="input-technical w-full h-[36px]"
            type="password"
            required
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <div className="flex items-center gap-sm">
            <span className="text-[13px] text-on-surface-variant">Rol:</span>
            <div className="dual-option w-48">
              <button
                type="button"
                className={rol === "tecnico" ? "selected-ok" : ""}
                onClick={() => setRol("tecnico")}
              >
                Técnico
              </button>
              <button
                type="button"
                className={rol === "admin" ? "selected-ok" : ""}
                onClick={() => setRol("admin")}
              >
                Admin
              </button>
            </div>
          </div>
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          {ok ? <p className="text-[12px] text-green-700">{ok}</p> : null}
          <button
            type="submit"
            disabled={creando}
            className="w-full bg-primary text-on-primary rounded-lg px-md py-1.5 text-title-md font-title-md font-bold uppercase tracking-wider hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

      <section className="bg-white border border-outline-variant rounded-xl shadow-sm p-md">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="text-title-md font-title-md font-bold text-primary uppercase tracking-wider">
            Usuarios ({usuarios.length})
          </h2>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargandoLista}
            className="border border-outline-variant rounded-lg px-md py-1 text-[13px] active:scale-95 transition-all disabled:opacity-50"
          >
            {cargandoLista ? "Cargando..." : "Actualizar"}
          </button>
        </div>
        {cargandoLista ? (
          <p className="text-on-surface-variant">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-on-surface-variant">No hay usuarios.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {usuarios.map((u) => (
              <li key={u.id} className="py-2 flex items-center justify-between gap-sm">
                <span className="text-body-md text-on-surface break-all">{u.email ?? "sin email"}</span>
                <span className="text-[11px] text-on-surface-variant">
                  {new Date(u.creado_en).toLocaleDateString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cargando() {
  return (
    <div className="flex flex-col items-center justify-center gap-lg px-margin py-2xl min-h-[50dvh]">
      <div className="animate-pulse">
        <LogoTipo className="w-24 h-24 rounded-3xl shadow-lg" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        <span className="text-title-md text-primary font-bold">Cargando...</span>
      </div>
    </div>
  );
}
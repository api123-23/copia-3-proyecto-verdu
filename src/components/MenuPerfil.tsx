"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePerfil } from "@/lib/usePerfil";
import { limpiarSesionCache } from "@/lib/useSesion";
import { contarPendientes } from "@/lib/reautenticacion";
import { Icono } from "@/components/Icono";
import { IconoLinea } from "@/components/IconoLinea";
import type { Session } from "@supabase/supabase-js";

type Modo = null | "clave" | "datos";

export function MenuPerfil({ sesion }: { sesion: Session | null }) {
  const { perfil, esMaster, refrescar } = usePerfil();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>(null);
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window === "undefined") return false;
    const guardado = window.localStorage.getItem("air-power-tema");
    return guardado === "oscuro";
  });
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        setModo(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        setModo(null);
      }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", modoOscuro);
  }, [modoOscuro]);

  const email = perfil?.email ?? sesion?.user?.email ?? "";
  const nombreCompleto = perfil?.nombre || perfil?.apellido
    ? `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim()
    : null;

  async function cerrarSesion() {
    const pendientes = await contarPendientes();
    const aviso = pendientes > 0
      ? `Tenés ${pendientes} informe${pendientes === 1 ? "" : "s"} sin subir. Van a quedar guardados en este celular y se suben cuando vuelvas a ingresar con esta cuenta.\n\n¿Cerrar sesión igual?`
      : "¿Seguro que querés cerrar sesión?";
    if (!window.confirm(aviso)) return;
    try {
      await supabase().auth.signOut();
    } finally {
      limpiarSesionCache();
      router.replace("/login");
    }
  }

  function alternarTema() {
    const nuevoValor = !modoOscuro;
    setModoOscuro(nuevoValor);
    document.documentElement.classList.toggle("dark", nuevoValor);
    window.localStorage.setItem("air-power-tema", nuevoValor ? "oscuro" : "claro");
  }

  const iniciales = (() => {
    const base = nombreCompleto || email || "?";
    const partes = base.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
    return ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
  })();
  const rolTexto = perfil?.rol === "master" ? "Master" : perfil?.rol === "admin" ? "Administrador" : "Técnico";

  function cerrarMenu() {
    setAbierto(false);
    setModo(null);
  }

  const itemClase =
    "menu-perfil-item group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-body-md transition-colors duration-200 hover:bg-surface-container-low active:bg-surface-container-high";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          setModo(null);
        }}
        className={`menu-perfil-boton flex h-10 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-on-primary transition-all duration-300 hover:bg-white/15 active:scale-95 sm:pr-3 ${
          abierto ? "bg-white/20 ring-2 ring-white/40" : "bg-white/10"
        }`}
        aria-label="Menú de cuenta"
        aria-expanded={abierto}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 to-white text-[12px] font-extrabold text-primary shadow-inner">
          {iniciales}
        </span>
        <span className="hidden max-w-[120px] truncate text-[12px] font-bold sm:inline">
          {nombreCompleto || email || "Cuenta"}
        </span>
        <Icono
          nombre="arrow_drop_down"
          className={`h-[16px] w-[16px] transition-transform duration-300 ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <>
          {/* Fondo atenuado en celular: tocar afuera cierra el menú. */}
          <div className="menu-perfil-fondo fixed inset-0 z-[55] bg-black/35 sm:bg-transparent" onClick={cerrarMenu} aria-hidden="true" />
          <div
            className="menu-perfil-panel fixed inset-x-3 z-[60] overflow-hidden rounded-3xl border border-outline-variant bg-white text-on-surface shadow-2xl shadow-black/25 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:rounded-2xl"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
            role="menu"
          >
            <div className="menu-perfil-cabecera relative flex items-center gap-3 bg-gradient-to-br from-primary to-[#0a5aa6] px-4 pb-4 pt-4 text-on-primary">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-[20px] font-extrabold text-primary shadow-lg">
                {iniciales}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold leading-tight">{nombreCompleto || email || "Sin nombre"}</p>
                <p className="truncate text-[12px] text-white/80">{email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <IconoLinea nombre="escudo" className="h-3 w-3" grosor={2.2} />
                  {rolTexto}
                </span>
              </div>
              <button
                type="button"
                onClick={cerrarMenu}
                aria-label="Cerrar menú"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white sm:hidden"
              >
                <Icono nombre="close" className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2">
              {modo === "clave" ? (
                <div className="p-2"><FormCambiarClave onListo={() => setModo(null)} /></div>
              ) : modo === "datos" ? (
                <div className="p-2"><FormDatos onListo={() => { setModo(null); refrescar(); }} /></div>
              ) : (
                <>
                  <button type="button" role="menuitem" className={itemClase} style={{ "--item-delay": "40ms" } as React.CSSProperties} onClick={() => setModo("datos")}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><IconoLinea nombre="datos" /></span>
                    <span className="flex-1">Mis datos</span>
                    <IconoLinea nombre="chevron" className="h-4 w-4 text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                  <button type="button" role="menuitem" className={itemClase} style={{ "--item-delay": "80ms" } as React.CSSProperties} onClick={() => setModo("clave")}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><IconoLinea nombre="llave" /></span>
                    <span className="flex-1">Cambiar contraseña</span>
                    <IconoLinea nombre="chevron" className="h-4 w-4 text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                  {esMaster ? (
                    <>
                      <a href="#/clientes" role="menuitem" className={`${itemClase} hidden md:flex`} style={{ "--item-delay": "120ms" } as React.CSSProperties} onClick={() => setAbierto(false)}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><IconoLinea nombre="edificio" /></span>
                        <span className="flex-1">Gestionar clientes</span>
                        <IconoLinea nombre="chevron" className="h-4 w-4 text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5" />
                      </a>
                      <a href="#/admin" role="menuitem" className={itemClase} style={{ "--item-delay": "160ms" } as React.CSSProperties} onClick={() => setAbierto(false)}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><IconoLinea nombre="usuarios" /></span>
                        <span className="flex-1">Panel de administración</span>
                        <IconoLinea nombre="chevron" className="h-4 w-4 text-on-surface-variant transition-transform duration-200 group-hover:translate-x-0.5" />
                      </a>
                    </>
                  ) : null}

                  <div className="my-1.5 h-px bg-outline-variant/70" />

                  <button type="button" className={itemClase} style={{ "--item-delay": "200ms" } as React.CSSProperties} onClick={alternarTema} aria-pressed={modoOscuro}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-700"><IconoLinea nombre="luna" /></span>
                    <span className="flex-1">Modo oscuro</span>
                    <span className="theme-toggle pointer-events-none" aria-hidden="true">
                      <span className="theme-toggle-track"><span className="theme-toggle-thumb" /></span>
                    </span>
                  </button>
                  <button type="button" role="menuitem" className={`${itemClase} text-error hover:bg-error-container/50`} style={{ "--item-delay": "240ms" } as React.CSSProperties} onClick={cerrarSesion}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700"><IconoLinea nombre="salir" /></span>
                    <span className="flex-1 font-bold">Cerrar sesión</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FormDatos({ onListo }: { onListo: () => void }) {
  const { perfil } = usePerfil();
  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [apellido, setApellido] = useState(perfil?.apellido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() && !apellido.trim()) {
      setError("Completá al menos un campo.");
      return;
    }
    setCargando(true);
    const { data: ses } = await supabase().auth.getSession();
    const uid = ses?.session?.user?.id;
    if (!uid) {
      setError("No se pudo identificar tu sesión.");
      setCargando(false);
      return;
    }
    const { error } = await supabase()
      .from("perfiles")
      .update({ nombre: nombre.trim() || null, apellido: apellido.trim() || null })
      .eq("id", uid);
    setCargando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOk(true);
    setTimeout(onListo, 1000);
  }

  return (
    <div className="space-y-sm">
      <p className="text-[12px] font-bold text-primary">Mis datos</p>
      {ok ? (
        <p className="text-body-md text-green-700">Datos guardados.</p>
      ) : (
        <form onSubmit={guardar} className="space-y-sm">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-on-surface-variant">Nombre</label>
            <input
              type="text"
              className="input-technical w-full text-[13px] h-[36px]"
              placeholder={perfil?.nombre ? `Actual: ${perfil.nombre}` : "Nombre (vacío)"}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-on-surface-variant">Apellido</label>
            <input
              type="text"
              className="input-technical w-full text-[13px] h-[36px]"
              placeholder={perfil?.apellido ? `Actual: ${perfil.apellido}` : "Apellido (vacío)"}
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <p className="text-[10px] text-on-surface-variant">
            Se guardará en tu perfil y se usará para filtrar informes por técnico.
          </p>
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 bg-primary text-on-primary rounded-lg px-md py-1.5 text-[13px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="border border-outline-variant rounded-lg px-md py-1.5 text-[13px]"
              onClick={onListo}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FormCambiarClave({ onListo }: { onListo: () => void }) {
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCargando(true);
    const { error } = await supabase().auth.updateUser({ password: nueva });
    setCargando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOk(true);
    setTimeout(onListo, 1200);
  }

  return (
    <div className="space-y-sm">
      <p className="text-[12px] font-bold text-primary">Cambiar contraseña</p>
      {ok ? (
        <p className="text-body-md text-green-700">Contraseña actualizada. Redirigiendo...</p>
      ) : (
        <form onSubmit={cambiar} className="space-y-sm">
          <input
            type="password"
            className="input-technical w-full text-[13px] h-[36px]"
            placeholder="Nueva contraseña"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-[10px] text-on-surface-variant">
            Por seguridad la contraseña actual no se muestra. Solo ingresá la nueva.
          </p>
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 bg-primary text-on-primary rounded-lg px-md py-1.5 text-[13px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="border border-outline-variant rounded-lg px-md py-1.5 text-[13px]"
              onClick={onListo}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

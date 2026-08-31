"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePerfil } from "@/lib/usePerfil";
import { Icono } from "@/components/Icono";
import type { Session } from "@supabase/supabase-js";

type Modo = null | "clave";

export function MenuPerfil({ sesion }: { sesion: Session | null }) {
  const { perfil, esAdmin } = usePerfil();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        setModo(null);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const email = perfil?.email ?? sesion?.user?.email ?? "";

  async function cerrarSesion() {
    await supabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          setModo(null);
        }}
        className="flex items-center gap-1.5 hover:bg-primary-container active:scale-95 transition-all px-2 py-1.5 rounded-lg text-on-primary min-h-[44px]"
        aria-label="Menú de cuenta"
      >
        <Icono nombre="person" className="w-[18px] h-[18px]" />
        <span className="hidden sm:inline text-[12px] font-bold max-w-[120px] truncate">
          {email || "Cuenta"}
        </span>
        <Icono nombre="arrow_drop_down" className="w-[16px] h-[16px]" />
      </button>

      {abierto ? (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-outline-variant rounded-xl shadow-xl p-md z-[60]">
          <div className="border-b border-outline-variant pb-sm mb-sm">
            <p className="text-body-md font-bold text-on-surface break-all">{email}</p>
            <p className="text-[12px] text-on-surface-variant">
              Rol: {esAdmin ? "Administrador" : "Técnico"}
            </p>
          </div>

          {modo === "clave" ? (
            <FormCambiarClave onListo={() => setModo(null)} />
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="text-left px-2 py-2 rounded-lg hover:bg-surface-container-low text-body-md active:scale-[0.98] transition-all"
                  onClick={() => setModo("clave")}
                >
                  Cambiar contraseña
                </button>
                {esAdmin ? (
                  <a
                    href="#/admin"
                    className="text-left px-2 py-2 rounded-lg hover:bg-surface-container-low text-body-md active:scale-[0.98] transition-all"
                    onClick={() => setAbierto(false)}
                  >
                    Panel de administración
                  </a>
                ) : null}
              </div>
              <div className="border-t border-outline-variant mt-sm pt-sm">
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="w-full px-2 py-2 rounded-lg text-left text-error font-bold text-body-md hover:bg-error-container/40 active:scale-[0.98] transition-all"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
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
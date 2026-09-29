"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { intentarSync } from "@/lib/sync";
import { limpiarSesionCache } from "@/lib/useSesion";
import { EVENTO_VERIFICAR_SESION, leerUltimoLogin, registrarIngreso, useEstadoSesion, verificarSesion } from "@/lib/reautenticacion";
import { LogoTipo } from "@/components/LogoTipo";

const INTERVALO_MINIMO_MS = 60_000;

/** Vigila la sesión y, si venció estando con conexión, pide solo la contraseña. */
export function ReLogin({ sesion }: { sesion: Session | null }) {
  const estado = useEstadoSesion();
  const router = useRouter();
  const [oculto, setOculto] = useState(false);
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendientes = useLiveQuery(
    () => db.informes.filter((informe) => informe.estado_sync !== "sincronizado").count(),
    []
  ) ?? 0;

  const email = leerUltimoLogin()?.email || sesion?.user?.email || "";

  useEffect(() => {
    let ultima = 0;
    const verificar = (forzar = false) => {
      const ahora = Date.now();
      if (!forzar && ahora - ultima < INTERVALO_MINIMO_MS) return;
      ultima = ahora;
      void verificarSesion();
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") verificar();
    };
    const alConectar = () => verificar(true);
    const alPedir = () => verificar(true);
    verificar(true);
    window.addEventListener("online", alConectar);
    window.addEventListener(EVENTO_VERIFICAR_SESION, alPedir);
    document.addEventListener("visibilitychange", alVolver);
    const { data: sub } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") verificar(true);
    });
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener(EVENTO_VERIFICAR_SESION, alPedir);
      document.removeEventListener("visibilitychange", alVolver);
      sub.subscription.unsubscribe();
    };
  }, []);

  // Cada vez que vuelve a vencer se muestra de nuevo el panel completo.
  const [estadoPrevio, setEstadoPrevio] = useState(estado);
  if (estado !== estadoPrevio) {
    setEstadoPrevio(estado);
    if (estado !== "vencida") {
      setOculto(false);
      setPassword("");
      setError(null);
      setBloqueo(null);
    }
  }

  if (estado !== "vencida" || !sesion) return null;

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    if (!password || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const { data, error: errorIngreso } = await supabase().auth.signInWithPassword({ email, password });
      if (errorIngreso || !data.user) {
        if (errorIngreso && (isAuthRetryableFetchError(errorIngreso) || !navigator.onLine)) {
          setError("No hay conexión. Tus informes siguen guardados en el celular; probá de nuevo con señal.");
        } else {
          setError("Contraseña incorrecta.");
          setPassword("");
          inputRef.current?.focus();
        }
        return;
      }
      const resultado = await registrarIngreso(data.user.id, data.user.email ?? email);
      if (!resultado.ok) {
        setBloqueo(`Este celular tiene ${resultado.pendientes} informe${resultado.pendientes === 1 ? "" : "s"} sin subir de ${resultado.emailCorrecto}. Ingresá con esa cuenta para subirlos.`);
        return;
      }
      setPassword("");
      void intentarSync();
    } finally {
      setEnviando(false);
    }
  }

  async function otraCuenta() {
    if (pendientes > 0) {
      setBloqueo(`Hay ${pendientes} informe${pendientes === 1 ? "" : "s"} de ${email} sin subir. Primero ingresá con esa cuenta para que se suban; después podés cambiar de usuario.`);
      return;
    }
    await supabase().auth.signOut({ scope: "local" }).catch(() => undefined);
    limpiarSesionCache();
    router.replace("/login");
  }

  if (oculto) {
    return (
      <button
        type="button"
        onClick={() => setOculto(false)}
        className="relogin-pill fixed left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2.5 text-[12px] font-bold text-on-primary shadow-xl shadow-black/30 active:scale-95 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />
        Sesión vencida · Ingresar
        {pendientes > 0 ? <span className="rounded-full bg-white/20 px-1.5">{pendientes}</span> : null}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 sm:items-center modal-backdrop-in" role="dialog" aria-modal="true" aria-labelledby="relogin-titulo">
      <form
        onSubmit={continuar}
        className="relogin-panel w-full max-w-sm rounded-t-3xl bg-white px-5 pt-5 shadow-2xl sm:rounded-2xl sm:pb-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant sm:hidden" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <LogoTipo className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h2 id="relogin-titulo" className="text-[17px] font-bold leading-tight text-on-surface">Confirmá tu contraseña</h2>
            <p className="truncate text-[12px] text-on-surface-variant" title={email}>{email}</p>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-snug text-on-surface-variant">
          {pendientes > 0
            ? <>Tenés <strong className="text-primary">{pendientes} informe{pendientes === 1 ? "" : "s"}</strong> esperando para subirse. Se suben apenas ingreses.</>
            : "Por seguridad, volvé a ingresar tu contraseña para seguir sincronizando."}
        </p>

        {bloqueo ? (
          <p className="mt-3 rounded-lg border border-error bg-error-container px-3 py-2 text-[12px] font-bold text-error" role="alert">{bloqueo}</p>
        ) : null}

        {/* Usuario oculto para que el gestor de contraseñas del celular autocomplete. */}
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <div className="relative mt-4">
          <input
            ref={inputRef}
            type={verPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            autoFocus
            enterKeyHint="go"
            placeholder="Contraseña"
            aria-label="Contraseña"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            className="input-technical h-12 w-full pr-20 text-[16px]"
          />
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            className="absolute right-1 top-1/2 h-10 -translate-y-1/2 rounded-md px-3 text-[12px] font-bold text-primary active:scale-95"
          >
            {verPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        {error ? <p className="mt-2 text-[12px] font-bold text-error" role="alert">{error}</p> : null}

        <button
          type="submit"
          disabled={!password || enviando}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary-container text-[14px] font-bold uppercase tracking-wider text-on-primary shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {enviando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : null}
          {enviando ? "Ingresando..." : "Continuar"}
        </button>

        <div className="mt-3 flex items-center justify-between text-[12px]">
          <button type="button" onClick={() => setOculto(true)} className="min-h-[40px] px-1 font-bold text-on-surface-variant">
            Ahora no
          </button>
          <button type="button" onClick={() => void otraCuenta()} className="min-h-[40px] px-1 font-bold text-primary">
            Entrar con otra cuenta
          </button>
        </div>
      </form>
    </div>
  );
}

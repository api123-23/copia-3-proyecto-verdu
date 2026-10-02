"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui";
import { LogoTipo } from "@/components/LogoTipo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setCargando(false);
      setError("Credenciales inválidas o usuario inexistente.");
      return;
    }
    // Se carga recién al ingresar: usa la base local (Dexie) para revisar
    // informes pendientes y así /login no la descarga al abrir.
    let resultado: Awaited<ReturnType<typeof import("@/lib/reautenticacion").registrarIngreso>>;
    try {
      const { registrarIngreso } = await import("@/lib/reautenticacion");
      resultado = await registrarIngreso(data.user.id, data.user.email ?? email);
    } catch {
      setCargando(false);
      setError("No se pudo completar el ingreso. Revisá la conexión y volvé a intentar.");
      return;
    }
    setCargando(false);
    if (!resultado.ok) {
      setError(`Este celular tiene ${resultado.pendientes} informe${resultado.pendientes === 1 ? "" : "s"} sin subir de ${resultado.emailCorrecto}. Ingresá con esa cuenta para subirlos.`);
      return;
    }
    router.push("/");
  }

  return (
    <div
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[#002c59] via-[#003e7a] to-[#0055a4]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <main
        className="flex min-h-dvh items-center justify-center px-margin"
      >
      <form
        onSubmit={entrar}
        className="relative z-10 w-full max-w-sm bg-white/95 border border-white/60 rounded-2xl shadow-2xl shadow-black/25 p-xl backdrop-blur-sm animate-[loginCardIn_700ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex flex-col items-center mb-lg">
          <LogoTipo className="w-20 h-20 rounded-2xl mb-md animate-[loginBrandIn_550ms_ease-out]" />
          <h1 className="text-headline-sm text-primary font-bold text-center animate-[loginBrandIn_550ms_120ms_both_ease-out]">
            Air Power S.A.
          </h1>
        </div>
        <div className="space-y-md">
          <div>
            <Label>Email</Label>
            <input
              className="input-technical"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Contraseña</Label>
            <input
              className="input-technical"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={cargando}
            className="w-full min-h-[44px] bg-primary text-on-primary rounded-lg px-md py-1.5 text-title-md font-bold uppercase tracking-wider shadow-md shadow-primary/20 hover:bg-primary-container hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
      </main>
    </div>
  );
}

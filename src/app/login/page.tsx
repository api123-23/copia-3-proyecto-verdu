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
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      setError("Credenciales inválidas o usuario inexistente.");
      return;
    }
    router.push("/");
  }

  return (
    <div
      style={{
        background: "#003e7a",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <main
        className="flex items-center justify-center px-margin"
        style={{ minHeight: "calc(100dvh - env(safe-area-inset-top, 0px))" }}
      >
      <form
        onSubmit={entrar}
        className="w-full max-w-sm bg-white border border-outline-variant rounded-xl shadow-lg p-xl"
      >
        <div className="flex flex-col items-center mb-lg">
          <LogoTipo className="w-20 h-20 rounded-2xl mb-md" />
          <h1 className="text-headline-sm text-primary font-bold text-center">
            Air Power S.A.
          </h1>
          <p className="text-title-md font-bold text-on-surface mt-xs text-center">
            Acceso de técnicos
          </p>
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
            className="w-full bg-primary text-on-primary rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
      </main>
    </div>
  );
}

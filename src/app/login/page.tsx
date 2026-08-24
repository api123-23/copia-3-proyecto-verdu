"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui";

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
    <main className="min-h-screen flex items-center justify-center px-margin">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm bg-white border border-outline-variant rounded-lg shadow-sm p-xl"
      >
        <h1 className="text-headline-sm text-primary font-bold mb-md text-center">
          Air Power S.A.
        </h1>
        <p className="text-title-md font-bold text-on-surface mb-lg text-center">
          Acceso de técnicos
        </p>
        <div className="space-y-md">
          <div>
            <Label>Email</Label>
            <input
              className="input-technical"
              type="email"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary text-on-primary rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </form>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { IconoLinea } from "@/components/IconoLinea";

type Estado = "online" | "offline" | "reconectado";

/**
 * Aviso de conexión: sin señal la app cambia levemente de tono y muestra una
 * píldora; al volver la conexión avisa unos segundos y desaparece.
 */
export function EstadoConexion() {
  const [estado, setEstado] = useState<Estado>("online");

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    const aplicar = (conectado: boolean, avisar: boolean) => {
      document.documentElement.classList.toggle("sin-conexion", !conectado);
      if (temporizador) clearTimeout(temporizador);
      if (!conectado) {
        setEstado("offline");
      } else if (avisar) {
        setEstado("reconectado");
        temporizador = setTimeout(() => setEstado("online"), 2800);
      } else {
        setEstado("online");
      }
    };
    aplicar(navigator.onLine, false);
    const alConectar = () => aplicar(true, true);
    const alDesconectar = () => aplicar(false, false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    return () => {
      if (temporizador) clearTimeout(temporizador);
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  if (estado === "online") return null;
  const offline = estado === "offline";
  return (
    <div
      className="aviso-conexion-contenedor pointer-events-none fixed inset-x-0 z-[85] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.9rem)" }}
      role="status"
      aria-live="polite"
    >
      <div
        key={estado}
        className={`aviso-conexion flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-white shadow-xl shadow-black/25 ${
          offline ? "bg-slate-800/95" : "bg-emerald-600"
        }`}
      >
        <span className={`relative flex h-7 w-7 items-center justify-center rounded-full ${offline ? "bg-amber-400/20 text-amber-300" : "bg-white/20 text-white"}`}>
          {offline ? <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/25" aria-hidden="true" /> : null}
          <IconoLinea nombre={offline ? "sin-red" : "red"} className="relative h-4 w-4" grosor={2.2} />
        </span>
        <span className="leading-tight">
          <span className="block text-[12px] font-bold">{offline ? "Sin conexión" : "Conectado de nuevo"}</span>
          <span className="block text-[10.5px] text-white/75">
            {offline ? "Todo se guarda en el celular" : "La sincronización se reanuda sola"}
          </span>
        </span>
      </div>
    </div>
  );
}

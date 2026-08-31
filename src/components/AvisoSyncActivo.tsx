"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { LogoTipo } from "@/components/LogoTipo";

const ESTADOS_ACTIVOS = new Set(["pendiente", "subiendo_imagenes", "imagenes_ok"]);

export function AvisoSyncActivo() {
  const pendientes = useLiveQuery(
    () => db.informes.where("estado_sync").notEqual("sincronizado").toArray(),
    []
  );
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!online || !pendientes) return null;
  const activos = pendientes.filter((p) => ESTADOS_ACTIVOS.has(p.estado_sync));
  if (activos.length === 0) {
    if (oculto) setOculto(false);
    return null;
  }
  if (oculto) return null;

  const cant = activos.length;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-margin bg-black/30">
      <div className="w-full max-w-sm bg-amber-100 border-2 border-amber-400 rounded-xl shadow-xl p-lg text-center relative">
        <button
          type="button"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-amber-200 text-amber-800 hover:bg-amber-300 transition-colors text-lg font-bold"
          onClick={() => setOculto(true)}
          aria-label="Ocultar aviso"
        >
          &times;
        </button>
        <div className="flex justify-center mb-md">
          <LogoTipo className="w-14 h-14 rounded-2xl animate-pulse" />
        </div>
        <p className="flex items-center justify-center gap-2 text-title-md font-bold text-amber-800 mb-xs">
          <span className="w-4 h-4 rounded-full border-2 border-amber-700 border-t-transparent animate-spin" />
          Subiendo informe{cant > 1 ? "s" : ""}...
        </p>
        <p className="text-body-md text-amber-800/80">
          {cant} pendiente{cant > 1 ? "s" : ""} de subida. Esperá hasta que termine.
        </p>
      </div>
    </div>
  );
}
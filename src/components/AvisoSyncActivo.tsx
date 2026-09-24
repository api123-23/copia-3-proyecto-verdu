"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function AvisoSyncActivo() {
  const pendientes = useLiveQuery(
    () => db.informes.filter((informe) => informe.listo_para_enviar && informe.estado_sync !== "sincronizado").toArray(),
    []
  );

  if (!pendientes || pendientes.length === 0) return null;
  return (
    <div className="fixed left-0 right-0 top-0 z-[80] flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pointer-events-none">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center text-[12px] font-bold text-amber-900 shadow-lg">
        Informes pendientes por subir guardados
        <span className="ml-1 font-normal">({pendientes.length})</span>
      </div>
    </div>
  );
}

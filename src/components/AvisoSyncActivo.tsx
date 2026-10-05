"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useEnLinea } from "@/lib/useEnLinea";

export function AvisoSyncActivo() {
  const enLinea = useEnLinea();
  const pendientes = useLiveQuery(
    () => db.informes.filter((informe) => informe.listo_para_enviar && informe.estado_sync !== "sincronizado").toArray(),
    []
  );
  // Avance del que está subiendo ("3 de 7"): cada archivo queda con su ruta al terminar de subirse.
  const avance = useLiveQuery(async () => {
    const subiendo = (pendientes ?? []).find((i) => i.estado_sync === "subiendo_imagenes");
    if (!subiendo) return null;
    const archivos = await db.archivos.where("informe_id").equals(subiendo.id).toArray();
    return archivos.length ? `${archivos.filter((a) => a.url).length} de ${archivos.length}` : null;
  }, [pendientes]);

  if (!pendientes || pendientes.length === 0) return null;
  return (
    <div className="fixed left-0 right-0 top-0 z-[80] flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pointer-events-none">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center text-[12px] font-bold text-amber-900 shadow-lg">
        Informes pendientes por subir guardados
        <span className="ml-1 font-normal">({pendientes.length})</span>
        {enLinea && avance ? (
          <span className="block font-normal" role="status">Subiendo fotos y firmas {avance}</span>
        ) : null}
      </div>
    </div>
  );
}

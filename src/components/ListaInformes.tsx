"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { TIPOS_EQUIPO, formatNumero } from "@/lib/informes";
import { useSesion } from "@/lib/useSesion";

const BADGE_SYNC: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente de sync", clase: "bg-secondary-container text-on-secondary-container" },
  subiendo_imagenes: { label: "Sincronizando", clase: "bg-secondary-container text-on-secondary-container" },
  imagenes_ok: { label: "Sincronizando", clase: "bg-secondary-container text-on-secondary-container" },
  sincronizado: { label: "Sincronizado", clase: "bg-green-100 text-green-700" },
  error: { label: "Error de sync", clase: "bg-error-container text-on-error-container" },
};

export function ListaInformes() {
  const { cargando } = useSesion(true);
  const informes = useLiveQuery(
    () => db.informes.orderBy("fecha_hora").reverse().toArray(),
    []
  );

  if (cargando || !informes)
    return <p className="px-margin text-on-surface-variant">Cargando...</p>;

  if (informes.length === 0) {
    return (
      <div className="mx-4 md:mx-0 p-xl bg-white border border-outline-variant rounded-lg text-center">
        <p className="text-body-lg text-on-surface-variant mb-md">
          No hay informes cargados en este dispositivo.
        </p>
        <Link
          href="/informe/nuevo"
          className="inline-block bg-primary text-on-primary rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider"
        >
          Crear primer informe
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-0 space-y-sm">
      {informes.map((inf) => {
        const tipo = TIPOS_EQUIPO.find((t) => t.value === inf.tipo_equipo)?.label ?? inf.tipo_equipo;
        const sync = BADGE_SYNC[inf.estado_sync];
        const fecha = new Date(inf.fecha_hora).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return (
          <Link
            key={inf.id}
            href={`/informe/${inf.id}`}
            className="block bg-white border border-outline-variant rounded-lg p-md shadow-sm hover:bg-surface-container-low transition-colors"
          >
            <div className="flex justify-between items-center mb-xs">
              <span className="text-title-md font-bold text-primary">
                Informe № {formatNumero(inf.numero_registro)}
              </span>
              <span className="text-[12px] text-on-surface-variant">{fecha}</span>
            </div>
            <p className="text-body-lg truncate">{inf.cliente_nombre || "Sin cliente"}</p>
            <p className="text-body-md text-on-surface-variant">{tipo}</p>
            <div className="flex gap-xs mt-sm">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  inf.estado_firma === "firmado" ? "bg-green-100 text-green-700" : "bg-error-container text-on-error-container"
                }`}
              >
                {inf.estado_firma === "firmado" ? "Firmado por cliente" : "Sin firma de cliente"}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${sync.clase}`}>
                {sync.label}
              </span>
            </div>
            {inf.estado_sync === "error" && inf.error_sync ? (
              <p className="text-[10px] text-error mt-xs break-words">{inf.error_sync}</p>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

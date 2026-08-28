"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { listarRemotos } from "@/lib/remoto";
import type { InformeGeneral } from "@/lib/types";
import { TIPOS_EQUIPO, formatNumero } from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { useSesion } from "@/lib/useSesion";

const BADGE_SYNC: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Subiendo...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  subiendo_imagenes: { label: "Subiendo fotos...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  imagenes_ok: { label: "Guardando...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  sincronizado: { label: "Sincronizado", clase: "bg-green-100 text-green-700" },
  error: { label: "Error de sync", clase: "bg-error-container text-on-error-container" },
};

export function ListaInformes() {
  const { cargando, sesion } = useSesion(true);
  const locales = useLiveQuery(
    () => db.informes.where("estado_sync").notEqual("sincronizado").toArray(),
    []
  );
  const [remotos, setRemotos] = useState<InformeGeneral[]>([]);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [actualizando, setActualizando] = useState(false);

  async function actualizar() {
    if (actualizando) return;
    const confirmado = window.confirm(
      "Esto limpiará la caché local y mostrará solo los informes cargados en la base de datos. ¿Continuar?"
    );
    if (!confirmado) return;
    setActualizando(true);
    try {
      await db.transaction(
        "rw",
        [
          db.informes,
          db.valores_motocompresor,
          db.valores_compresor,
          db.valores_vehiculos,
          db.valores_grupo_electrogeno,
          db.archivos,
          db.blobs,
        ],
        async () => {
          await db.informes.clear();
          await db.valores_motocompresor.clear();
          await db.valores_compresor.clear();
          await db.valores_vehiculos.clear();
          await db.valores_grupo_electrogeno.clear();
          await db.archivos.clear();
          await db.blobs.clear();
        }
      );
      const lista = await listarRemotos();
      setRemotos(lista);
    } finally {
      setActualizando(false);
    }
  }

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

  useEffect(() => {
    if (cargando || !sesion || !online) return;
    let activo = true;
    const refrescar = () => {
      void listarRemotos().then((r) => {
        if (activo) setRemotos(r);
      });
    };
    refrescar();
    window.addEventListener("verdu-sync", refrescar);
    window.addEventListener("focus", refrescar);
    const onVis = () => { if (document.visibilityState === "visible") refrescar(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      activo = false;
      window.removeEventListener("verdu-sync", refrescar);
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [cargando, sesion, online]);

  if (cargando || !locales)
    return <p className="px-margin text-on-surface-variant">Cargando...</p>;

  const pendientesLocales = locales.filter((l) => l.estado_sync !== "sincronizado");

  const informesMap = new Map<string, InformeGeneral>();
  if (online) {
    for (const r of remotos) informesMap.set(r.id, r);
  }
  for (const l of pendientesLocales) informesMap.set(l.id, l);
  const informes = [...informesMap.values()].sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));

  if (informes.length === 0) {
    return (
      <div className="mx-4 md:mx-0 p-xl bg-white border border-outline-variant rounded-lg text-center">
        <p className="text-body-lg text-on-surface-variant mb-md">
          {online
            ? "No hay informes cargados."
            : "Sin conexión. No hay informes locales pendientes."}
        </p>
        <div className="flex items-center justify-center gap-sm">
          <Link
            href="/informe/nuevo"
            className="inline-block bg-primary text-on-primary rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider"
          >
            Crear informe
          </Link>
          {online ? (
            <button
              type="button"
              onClick={actualizar}
              disabled={actualizando}
              className="inline-block border border-outline-variant rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider text-primary"
            >
              {actualizando ? "Actualizando..." : "Actualizar"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-0 space-y-sm">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={actualizar}
          disabled={actualizando || !online}
          className={`text-[12px] font-bold uppercase tracking-wider border border-outline-variant rounded px-3 py-1 transition-colors ${
            actualizando
              ? "opacity-50 cursor-not-allowed"
              : online
                ? "text-primary hover:bg-surface-container-low"
                : "opacity-50 cursor-not-allowed"
          }`}
        >
          {actualizando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>
      {!online ? (
        <p className="text-[12px] text-on-surface-variant px-1">
          Sin conexión — mostrando informes locales pendientes.
        </p>
      ) : null}
      {informes.map((inf) => {
        const tipo = TIPOS_EQUIPO.find((t) => t.value === inf.tipo_equipo)?.label ?? inf.tipo_equipo;
        const esLocal = pendientesLocales.some((l) => l.id === inf.id);
        const sync = esLocal ? BADGE_SYNC[inf.estado_sync] ?? BADGE_SYNC.pendiente : null;
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
              {sync ? (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${sync.clase}`}>
                  {sync.label}
                </span>
              ) : null}
            </div>
            {esLocal && inf.estado_sync === "error" ? (
              <div className="mt-xs">
                {inf.error_sync ? (
                  <p className="text-[10px] text-error break-words">{inf.error_sync}</p>
                ) : null}
                <button
                  type="button"
                  className="mt-xs text-[11px] font-bold text-primary underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    intentarSync();
                  }}
                >
                  Reintentar sincronización
                </button>
              </div>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

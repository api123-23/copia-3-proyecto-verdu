"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { listarRemotos } from "@/lib/remoto";
import { supabase } from "@/lib/supabase";
import type { InformeGeneral } from "@/lib/types";
import { TIPOS_EQUIPO, formatNumero } from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { useSesion } from "@/lib/useSesion";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { PantallaCarga } from "@/components/PantallaCarga";

const BADGE_SYNC: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Subiendo...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  subiendo_imagenes: { label: "Subiendo fotos...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  imagenes_ok: { label: "Guardando...", clase: "bg-amber-100 text-amber-700 animate-pulse" },
  sincronizado: { label: "Sincronizado", clase: "bg-green-100 text-green-700" },
  error: { label: "Error de sync", clase: "bg-error-container text-on-error-container" },
};

type Tecnico = { id: string; nombre: string | null; apellido: string | null; rol: string };
type ClienteL = { id: string; nombre: string };

function estadoFirmaClase(inf: InformeGeneral): string {
  return inf.estado_firma === "firmado" ? "bg-green-100 text-green-700" : "bg-error-container text-on-error-container";
}

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ListaInformes() {
  const { cargando, sesion } = useSesion(true);
  const locales = useLiveQuery(
    () => db.informes.where("estado_sync").notEqual("sincronizado").toArray(),
    []
  );
  const [remotos, setRemotos] = useState<InformeGeneral[]>([]);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [actualizando, setActualizando] = useState(false);

  const [esPc, setEsPc] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [clientes, setClientes] = useState<ClienteL[]>([]);

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const act = () => setEsPc(mq.matches);
    act();
    mq.addEventListener("change", act);
    return () => mq.removeEventListener("change", act);
  }, []);

  useEffect(() => {
    if (!online) return;
    let activo = true;
    (async () => {
      try {
        const [p, c] = await Promise.all([
          supabase()
            .from("perfiles")
            .select("id, nombre, apellido, rol")
            .order("nombre", { ascending: true }),
          supabase()
            .from("clientes")
            .select("id, nombre")
            .order("nombre", { ascending: true }),
        ]);
        if (!activo) return;
        if (!p.error) setTecnicos((p.data ?? []) as Tecnico[]);
        if (!c.error) setClientes((c.data ?? []) as ClienteL[]);
      } catch {
        if (!activo) return;
      }
    })();
    return () => {
      activo = false;
    };
  }, [online]);

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
    return <PantallaCarga mensaje="Cargando informes..." />;

  const pendientesLocales = locales.filter((l) => l.estado_sync !== "sincronizado");

  const informesMap = new Map<string, InformeGeneral>();
  if (online) {
    for (const r of remotos) informesMap.set(r.id, r);
  }
  for (const l of pendientesLocales) informesMap.set(l.id, l);
  let informes = [...informesMap.values()].sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));

  const tecnicoNombre = new Map<string, string>();
  for (const t of tecnicos) {
    tecnicoNombre.set(t.id, t.nombre || t.apellido ? `${t.nombre ?? ""} ${t.apellido ?? ""}`.trim() : t.id.slice(0, 8));
  }

  const filtroNumeroTrim = filtroNumero.trim().toLowerCase();
  const filtroClienteTrim = filtroCliente.trim().toLowerCase();
  if (
    filtroNumeroTrim ||
    filtroFecha ||
    filtroClienteTrim ||
    filtroTecnico
  ) {
    informes = informes.filter((inf) => {
      if (filtroNumeroTrim) {
        const numStr = (inf.numero_registro ?? "").toString().toLowerCase();
        if (!numStr.includes(filtroNumeroTrim)) return false;
      }
      if (filtroFecha) {
        const local = new Date(inf.fecha_hora);
        const y = local.getFullYear();
        const m = String(local.getMonth() + 1).padStart(2, "0");
        const d = String(local.getDate()).padStart(2, "0");
        if (`${y}-${m}-${d}` !== filtroFecha) return false;
      }
      if (filtroClienteTrim) {
        if (!(inf.cliente_nombre || "").toLowerCase().includes(filtroClienteTrim)) return false;
      }
      if (filtroTecnico) {
        if (inf.tecnico_id !== filtroTecnico) return false;
      }
      return true;
    });
  }

  const tieneFiltros = !!(filtroNumeroTrim || filtroFecha || filtroClienteTrim || filtroTecnico);

  function limpiarFiltros() {
    setFiltroNumero("");
    setFiltroFecha("");
    setFiltroCliente("");
    setFiltroTecnico("");
  }

  const filtroBarClass = "bg-surface-container-low/60 border border-outline-variant rounded-lg px-2 py-1.5 text-[13px] h-[32px] w-full focus:outline-none focus:ring-2 focus:ring-primary";

  if (informes.length === 0 && !tieneFiltros) {
    return (
      <div className="mx-4 md:mx-0 p-xl bg-white border border-outline-variant rounded-lg text-center">
        <div className="flex items-center justify-center mb-md">
          <LogoTipo className="w-14 h-14 rounded-2xl opacity-90" />
        </div>
        <p className="text-body-lg text-on-surface-variant mb-md">
          {online
            ? "No hay informes cargados todavía. Creá el primero."
            : "Sin conexión. No hay informes locales pendientes."}
        </p>
        <div className="flex items-center justify-center gap-sm">
          <a
            href="#/informe/nuevo"
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-primary to-primary-container text-on-primary rounded-lg px-5 py-2.5 text-title-md font-title-md font-bold uppercase tracking-wider shadow-lg shadow-primary/40 hover:brightness-110 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <Icono nombre="add" className="w-[18px] h-[18px]" />
            Crear informe
          </a>
          {online ? (
            <button
              type="button"
              onClick={actualizar}
              disabled={actualizando}
              className="inline-block border border-outline-variant rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
            >
              {actualizando ? "Actualizando..." : "Actualizar"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const panelFiltros =
    esPc ? (
      <div className="rounded-lg border border-outline-variant bg-white p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-label-caps font-label-caps font-bold uppercase tracking-wider text-primary">
            Filtros
          </p>
          {tieneFiltros ? (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
            >
              <Icono nombre="close" className="w-[14px] h-[14px]" />
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Número</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 000123"
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className={filtroBarClass}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className={filtroBarClass}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Cliente</label>
            <input
              type="text"
              list="filtro-clientes"
              placeholder="Escribí o elegí..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className={filtroBarClass}
            />
            <datalist id="filtro-clientes">
              {clientes.map((c) => (
                <option key={c.id} value={c.nombre} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Técnico</label>
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className={filtroBarClass}
            >
              <option value="">Todos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {tecnicoNombre.get(t.id) ?? t.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="mx-4 md:mx-0 space-y-sm">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-on-surface-variant hidden md:block">
          {informes.length} informe{informes.length === 1 ? "" : "s"}
          {tieneFiltros ? " (filtrado)" : ""}
        </p>
        <button
          type="button"
          onClick={actualizar}
          disabled={actualizando || !online}
          className={`text-[12px] font-bold uppercase tracking-wider border border-outline-variant rounded px-3 py-1 active:scale-95 transition-all ${
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

      {panelFiltros}

      {!online ? (
        <p className="text-[12px] text-on-surface-variant px-1">
          Sin conexión — mostrando informes locales pendientes.
        </p>
      ) : null}

      {informes.length === 0 && tieneFiltros ? (
        <div className="p-lg bg-white border border-outline-variant rounded-lg text-center">
          <p className="text-body-lg text-on-surface-variant">
            No hay informes que coincidan con los filtros.
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-sm text-[12px] font-bold text-primary underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {/* Vista PC: tabla de ancho completo */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse bg-white border border-outline-variant rounded-lg shadow-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">
              <th className="px-3 py-2 font-bold">Nº</th>
              <th className="px-3 py-2 font-bold">Fecha</th>
              <th className="px-3 py-2 font-bold">Cliente</th>
              <th className="px-3 py-2 font-bold">Técnico</th>
              <th className="px-3 py-2 font-bold">Equipo</th>
              <th className="px-3 py-2 font-bold">Firma</th>
              <th className="px-3 py-2 font-bold">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {informes.map((inf) => {
              const tipo = TIPOS_EQUIPO.find((t) => t.value === inf.tipo_equipo)?.label ?? inf.tipo_equipo;
              const esLocal = pendientesLocales.some((l) => l.id === inf.id);
              const sync = esLocal ? BADGE_SYNC[inf.estado_sync] ?? BADGE_SYNC.pendiente : null;
              return (
                <tr
                  key={inf.id}
                  className="hover:bg-surface-container-low active:bg-surface-container-high transition-colors cursor-pointer"
                  onClick={() => { window.location.hash = `#/informe/${encodeURIComponent(inf.id)}`; }}
                >
                  <td className="px-3 py-2 text-primary font-bold whitespace-nowrap">
                    {formatNumero(inf.numero_registro)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatoFecha(inf.fecha_hora)}</td>
                  <td className="px-3 py-2 truncate max-w-[260px]">{inf.cliente_nombre || "Sin cliente"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">
                    {tecnicoNombre.get(inf.tecnico_id ?? "") ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{tipo}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${estadoFirmaClase(inf)}`}>
                      {inf.estado_firma === "firmado" ? "Firmado" : "Sin firma"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {sync ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${sync.clase}`}>
                        {sync.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className="space-y-sm md:hidden">
        {informes.map((inf) => {
          const tipo = TIPOS_EQUIPO.find((t) => t.value === inf.tipo_equipo)?.label ?? inf.tipo_equipo;
          const esLocal = pendientesLocales.some((l) => l.id === inf.id);
          const sync = esLocal ? BADGE_SYNC[inf.estado_sync] ?? BADGE_SYNC.pendiente : null;
          const fecha = formatoFecha(inf.fecha_hora);
          return (
            <a
              key={inf.id}
              href={`#/informe/${encodeURIComponent(inf.id)}`}
              className="block bg-white border border-outline-variant rounded-lg p-md shadow-sm hover:bg-surface-container-low hover:shadow-md active:scale-[0.99] transition-all"
            >
              <div className="flex justify-between items-center mb-xs">
                <span className="text-title-md font-bold text-primary">
                  Informe № {formatNumero(inf.numero_registro)}
                </span>
                <span className="text-[12px] text-on-surface-variant">{fecha}</span>
              </div>
              <p className="text-body-lg truncate">{inf.cliente_nombre || "Sin cliente"}</p>
              <p className="text-body-md text-on-surface-variant">{tipo}</p>
              <p className="text-body-md text-on-surface-variant">
                Técnico: {tecnicoNombre.get(inf.tecnico_id ?? "") ?? "—"}
              </p>
              <div className="flex gap-xs mt-sm">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${estadoFirmaClase(inf)}`}>
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
            </a>
          );
        })}
      </div>
    </div>
  );
}

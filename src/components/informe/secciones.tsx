"use client";

import { useEffect, useState } from "react";
import type { InformeGeneral } from "@/lib/types";
import { TIPOS_EQUIPO } from "@/lib/informes";
import { supabase } from "@/lib/supabase";
import { Label, Seccion } from "@/components/ui";
import { Icono } from "@/components/Icono";

type PatchInforme = Partial<InformeGeneral>;

type ClienteOpcion = {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
};

function SelectorCliente({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [seleccion, setSeleccion] = useState<string>(informe.cliente_id ?? "");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data, error } = await supabase()
          .from("clientes")
          .select("id, nombre, telefono, direccion")
          .order("nombre", { ascending: true });
        if (error) throw error;
        if (!activo) return;
        setClientes((data ?? []) as ClienteOpcion[]);
      } catch {
        if (!activo) return;
        setClientes([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    setSeleccion(informe.cliente_id ?? "");
  }, [informe.cliente_id]);

  function alSeleccionar(id: string) {
    setSeleccion(id);
    if (!id) return;
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    onChange({
      cliente_id: c.id,
      cliente_nombre: c.nombre,
      cliente_telefono: c.telefono,
      cliente_direccion: c.direccion,
    });
  }

  return (
    <div className="md:col-span-2">
      <Label>Cliente guardado (opcional)</Label>
      <select
        className="input-technical w-full h-[28px] py-0"
        value={seleccion}
        onChange={(e) => alSeleccionar(e.target.value)}
      >
        <option value="">— Seleccionar o cargar manual —</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.telefono ? ` · ${c.telefono}` : ""}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-on-surface-variant">
        Al elegir un cliente se completan nombre, teléfono y ubicación automáticamente.
      </p>
    </div>
  );
}

export function SeccionCliente({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  return (
    <Seccion titulo="Datos del Cliente" badge="Obligatorio">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        <SelectorCliente informe={informe} onChange={onChange} />
        <div>
          <Label>Cliente / Empresa</Label>
          <input
            className="input-technical"
            placeholder="Nombre de la empresa"
            type="text"
            value={informe.cliente_nombre}
            onChange={(e) => onChange({ cliente_nombre: e.target.value })}
          />
        </div>
        <div>
          <Label>Teléfono</Label>
          <input
            className="input-technical"
            placeholder="+54..."
            type="tel"
            value={informe.cliente_telefono ?? ""}
            onChange={(e) => onChange({ cliente_telefono: e.target.value || null })}
          />
        </div>
        <div className="md:col-span-2 flex gap-sm">
          <div className="flex-1">
            <Label>Dirección</Label>
            <input
              className="input-technical"
              placeholder="Ubicación del equipo"
              type="text"
              value={informe.cliente_direccion ?? ""}
              onChange={(e) => onChange({ cliente_direccion: e.target.value || null })}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              title="Usar mi ubicación actual"
              className="bg-primary-container text-on-primary border border-primary-container rounded px-sm py-1 flex items-center justify-center gap-xs hover:bg-primary transition-colors h-[28px]"
              onClick={() => {
                if (!("geolocation" in navigator)) {
                  alert("Este dispositivo no tiene geolocalización.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    onChange({
                      cliente_direccion: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                    });
                  },
                  () => alert("No se pudo obtener la ubicación. Revisá los permisos del navegador."),
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }}
            >
              <Icono nombre="location_on" className="w-[16px] h-[16px]" />
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Categoría de Equipo</Label>
          <select
            className="input-technical w-full h-[28px] py-0"
            value={informe.tipo_equipo}
            onChange={(e) => onChange({ tipo_equipo: e.target.value as InformeGeneral["tipo_equipo"] })}
          >
            {TIPOS_EQUIPO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Seccion>
  );
}

export function SeccionTrabajos({
  informe,
  onChange,
  onGenerarInforme,
  generandoInforme,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
  onGenerarInforme?: () => void;
  generandoInforme?: boolean;
}) {
  const planilla = `${informe.cliente_nombre || "Cliente"} | ${TIPOS_EQUIPO.find((t) => t.value === informe.tipo_equipo)?.label ?? informe.tipo_equipo} | ${informe.observaciones || ""}`;
  return (
    <Seccion titulo="Trabajos Realizados / Observaciones">
      <div className="flex flex-col gap-sm">
        <textarea
          className="input-technical h-24 resize-none py-1 w-full"
          placeholder="Describa el trabajo realizado y observaciones detalladamente..."
          value={informe.observaciones ?? ""}
          onChange={(e) => onChange({ observaciones: e.target.value || null })}
        />
        {onGenerarInforme ? (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={generandoInforme}
              className="border border-primary text-primary rounded-lg px-md py-1.5 text-title-md font-title-md hover:bg-primary hover:text-white transition-colors text-[13px] h-[36px] uppercase tracking-wider font-bold whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
              onClick={onGenerarInforme}
            >
              {generandoInforme ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Generando...
                </>
              ) : (
                "GENERAR INFORME"
              )}
            </button>
          </div>
        ) : null}
        {informe.observaciones_ia ? (
          <p className="flex items-center gap-1.5 text-[11px] text-primary font-bold">
            <span aria-hidden>✓</span>
            Editado con IA. El texto ya fue reemplazado arriba; podés corregirlo a mano.
          </p>
        ) : null}
        {onGenerarInforme && !informe.observaciones_ia ? (
          <p className="text-[10px] text-on-surface-variant italic">
            El texto de arriba se usa como fuente para la IA. Usá {"\u201C"}GENERAR INFORME{"\u201D"} para redactar
            las observaciones con Gemini.
          </p>
        ) : null}
        <span className="sr-only">{planilla}</span>
      </div>
    </Seccion>
  );
}

export function SeccionHoras({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  return (
    <Seccion titulo="Horas Trabajadas" badge="Obligatorio">
      <div>
        <Label>
          Total Horas Trabajadas <span className="text-error">*</span>
        </Label>
        <input
          className="input-technical w-32 text-data-mono font-data-mono h-[28px]"
          placeholder="0.0"
          type="number"
          step="0.1"
          value={informe.horas_trabajadas ?? ""}
          onChange={(e) => onChange({ horas_trabajadas: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </div>
    </Seccion>
  );
}

export function SeccionRepuestos({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  return (
    <Seccion titulo="Repuestos">
      <div className="space-y-md">
        <div>
          <h3 className="text-label-caps font-label-caps font-bold text-primary mb-xs">Del Cliente</h3>
          <textarea
            className="input-technical h-16 resize-none py-1 text-[12px]"
            placeholder="Repuestos provistos por el cliente..."
            value={informe.repuestos_cliente ?? ""}
            onChange={(e) => onChange({ repuestos_cliente: e.target.value || null })}
          />
        </div>
        <div>
          <h3 className="text-label-caps font-label-caps font-bold text-primary mb-xs">De Air Power S.A.</h3>
          <textarea
            className="input-technical h-16 resize-none py-1 text-[12px]"
            placeholder="Repuestos provistos por Air Power..."
            value={informe.repuestos_air_power ?? ""}
            onChange={(e) => onChange({ repuestos_air_power: e.target.value || null })}
          />
        </div>
      </div>
    </Seccion>
  );
}

export function SeccionOperativa({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  return (
    <Seccion titulo="¿La máquina queda operativa?">
      <div className="flex items-center justify-between bg-surface-container-low p-1 rounded">
        <span className="text-body-md font-body-md text-[12px]">Operativa</span>
        <div className="dual-option w-24">
          <button
            type="button"
            className={informe.maquina_operativa === true ? "selected-ok" : ""}
            onClick={() => onChange({ maquina_operativa: true })}
          >
            Sí
          </button>
          <button
            type="button"
            className={informe.maquina_operativa === false ? "selected-error" : ""}
            onClick={() => onChange({ maquina_operativa: false })}
          >
            No
          </button>
        </div>
      </div>
    </Seccion>
  );
}

export function SeccionCotizacion({
  informe,
  onChange,
  onRedactarIA,
  redactandoIA,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
  onRedactarIA?: () => void;
  redactandoIA?: boolean;
}) {
  return (
    <Seccion titulo="Cotización">
      <div className="space-y-sm">
        <Label>¿Requiere cotización adicional?</Label>
        <div className="dual-option max-w-40">
          <button
            type="button"
            className={informe.requiere_cotizacion ? "selected-ok" : ""}
            onClick={() => onChange({ requiere_cotizacion: true })}
          >
            Sí
          </button>
          <button
            type="button"
            className={!informe.requiere_cotizacion ? "selected-ok" : ""}
            onClick={() => onChange({ requiere_cotizacion: false })}
          >
            No
          </button>
        </div>
        {informe.requiere_cotizacion ? (
          <div className="flex flex-col gap-sm">
            <textarea
              className="input-technical h-24 resize-none py-1 w-full"
              placeholder="Detalle qué se debe cotizar o presupuestar..."
              value={informe.cotizacion_notas ?? ""}
              onChange={(e) => onChange({ cotizacion_notas: e.target.value || null })}
            />
            {onRedactarIA ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={redactandoIA}
                  className="border border-primary text-primary rounded-lg px-md py-1.5 text-title-md font-title-md hover:bg-primary hover:text-white transition-colors text-[13px] h-[36px] uppercase tracking-wider font-bold whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                  onClick={onRedactarIA}
                >
                  {redactandoIA ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Redactando...
                    </>
                  ) : (
                    "REDACTAR CON IA"
                  )}
                </button>
              </div>
            ) : null}
            {informe.cotizacion_notas_ia ? (
              <p className="flex items-center gap-1.5 text-[11px] text-primary font-bold">
                <span aria-hidden>✓</span>
                Editado con IA. El texto ya fue reemplazado arriba; podés corregirlo a mano.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Seccion>
  );
}

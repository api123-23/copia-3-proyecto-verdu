"use client";

import { useEffect, useRef, useState } from "react";
import type { InformeGeneral } from "@/lib/types";
import { TIPOS_EQUIPO } from "@/lib/informes";
import { buscarClientes, filtrarClientes, leerCacheClientes, normalizarTexto, recordarClientes, type ClienteOpcion } from "@/lib/clientes";
import { InputNumero, Label, Seccion } from "@/components/ui";
import { Icono } from "@/components/Icono";

type PatchInforme = Partial<InformeGeneral>;

const MAX_SUGERENCIAS = 8;
const ESPERA_BUSQUEDA_MS = 300;

/** Campo "Cliente / Empresa" con sugerencias de los clientes guardados (búsqueda en el servidor; sin conexión, en la copia local). */
function BuscadorCliente({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
}) {
  // Resultado de la última búsqueda y el texto (normalizado) al que corresponde.
  const [resultado, setResultado] = useState<{ clave: string; lista: ClienteOpcion[] } | null>(null);
  // Copia local acotada (clientes vistos/usados): sugerencias inmediatas mientras llega la respuesta.
  const [locales, setLocales] = useState<ClienteOpcion[]>(() => leerCacheClientes());
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  const texto = normalizarTexto(informe.cliente_nombre ?? "");
  const busqueda = (informe.cliente_nombre ?? "").trim();

  useEffect(() => {
    if (!abierto || !texto) return;
    let vigente = true;
    const t = window.setTimeout(() => {
      void buscarClientes(busqueda, MAX_SUGERENCIAS).then((lista) => {
        if (!vigente) return;
        setResultado({ clave: texto, lista });
        setLocales(leerCacheClientes());
      });
    }, ESPERA_BUSQUEDA_MS);
    return () => {
      vigente = false;
      window.clearTimeout(t);
    };
  }, [abierto, texto, busqueda]);

  useEffect(() => {
    const fuera = (e: PointerEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, []);

  const sugerencias = !texto
    ? []
    : resultado && resultado.clave === texto
      ? resultado.lista.slice(0, MAX_SUGERENCIAS)
      : filtrarClientes(locales, texto, MAX_SUGERENCIAS);
  // cliente_id solo queda cargado al elegir una sugerencia (editar el nombre a mano lo borra).
  const vinculado = Boolean(informe.cliente_id);
  const mostrar = abierto && texto.length > 0 && !vinculado;

  // Mientras la lista está abierta, su sección no recorta lo que sobresale
  // (tiene overflow hidden por los bordes redondeados) y va por encima de las siguientes.
  useEffect(() => {
    const seccion = contenedor.current?.closest<HTMLElement>(".section-card");
    if (!seccion) return;
    seccion.style.zIndex = mostrar ? "20" : "";
    seccion.style.overflow = mostrar ? "visible" : "";
    return () => {
      seccion.style.zIndex = "";
      seccion.style.overflow = "";
    };
  }, [mostrar]);

  function elegir(c: ClienteOpcion) {
    onChange({ cliente_id: c.id, cliente_nombre: c.nombre, cliente_telefono: c.telefono });
    setAbierto(false);
    // Queda entre los recientes de la copia local para encontrarlo sin conexión.
    recordarClientes([c]);
  }

  return (
    <div className="relative" ref={contenedor} data-campo="cliente_nombre" data-validation-label="Cliente / Empresa" data-tutorial="cliente">
      <Label>Cliente / Empresa</Label>
      <input
        className="input-technical"
        placeholder="Escribí para buscar o cargar un cliente"
        type="text"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls="lista-clientes"
        aria-autocomplete="list"
        autoComplete="off"
        value={informe.cliente_nombre}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          // Si se edita el nombre a mano deja de estar vinculado al cliente guardado.
          onChange({ cliente_nombre: e.target.value, cliente_id: null });
          setAbierto(true);
          setActivo(0);
        }}
        onKeyDown={(e) => {
          if (!mostrar || sugerencias.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((a) => (a + 1) % sugerencias.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((a) => (a - 1 + sugerencias.length) % sugerencias.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            elegir(sugerencias[Math.min(activo, sugerencias.length - 1)]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      {vinculado ? (
        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-green-700">
          <span aria-hidden="true">✓</span> Cliente guardado: se completaron nombre y teléfono
        </p>
      ) : null}
      {mostrar ? (
        <ul
          id="lista-clientes"
          role="listbox"
          className="lista-clientes absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-outline-variant bg-white shadow-xl"
        >
          {sugerencias.length === 0 ? (
            <li className="px-3 py-2.5 text-[12px] text-on-surface-variant">Sin coincidencias. Se cargará como cliente nuevo.</li>
          ) : (
            sugerencias.map((c, k) => (
              <li
                key={c.id}
                role="option"
                aria-selected={k === activo}
                // pointerdown: se elige antes de que el campo pierda el foco
                onPointerDown={(e) => {
                  e.preventDefault();
                  elegir(c);
                }}
                onMouseEnter={() => setActivo(k)}
                className={`flex cursor-pointer items-center justify-between gap-2 border-b border-outline-variant/50 px-3 py-2.5 last:border-b-0 ${k === activo ? "bg-primary-fixed" : ""}`}
              >
                <span className="min-w-0 truncate text-body-md font-bold text-on-surface">{c.nombre}</span>
                {c.telefono ? <span className="shrink-0 text-[11px] text-on-surface-variant">{c.telefono}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
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
    <Seccion titulo="Datos del Cliente" badge={informe.tipo_equipo === "extraordinarios" ? undefined : "Obligatorio"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        <BuscadorCliente informe={informe} onChange={onChange} />
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
        <div className="md:col-span-2" data-tutorial="categoria">
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
        <div>
          <Label>Modelo</Label>
          <input
            className="input-technical"
            placeholder="Modelo del equipo"
            type="text"
            value={informe.modelo ?? ""}
            onChange={(e) => onChange({ modelo: e.target.value || null })}
          />
        </div>
        <div>
          <Label>Número de serie</Label>
          <input
            className="input-technical"
            placeholder="Serie del equipo"
            type="text"
            value={informe.numero_serie ?? ""}
            onChange={(e) => onChange({ numero_serie: e.target.value || null })}
          />
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
      <div className="flex flex-col gap-sm" data-campo="observaciones" data-validation-label="Trabajos realizados / Observaciones">
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
  obligatoria = true,
}: {
  informe: InformeGeneral;
  onChange: (p: PatchInforme) => void;
  obligatoria?: boolean;
}) {
  return (
    <Seccion titulo="Horas Trabajadas" badge={obligatoria ? "Obligatorio" : "Opcional"}>
      <div data-campo="horas_trabajadas" data-validation-label="Total horas trabajadas">
        <Label>
          Total Horas Trabajadas <span className="text-error">*</span>
        </Label>
        <InputNumero
          className="input-technical w-32 text-data-mono font-data-mono h-[28px]"
          placeholder="0.0"
          valor={informe.horas_trabajadas ?? null}
          onChange={(v) => onChange({ horas_trabajadas: v })}
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
      <div data-campo="maquina_operativa" data-validation-label="¿La máquina queda operativa?" className="flex items-center justify-between bg-surface-container-low p-1 rounded">
        <span className="text-body-md font-body-md text-[12px]">Operativa</span>
        <div className={`dual-option w-24 field-binary field-status-${informe.maquina_operativa === null ? "empty" : informe.maquina_operativa ? "si" : "no"}`}>
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
        <div className={`dual-option max-w-40 field-binary field-status-${informe.requiere_cotizacion ? "si" : "no"}`}>
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

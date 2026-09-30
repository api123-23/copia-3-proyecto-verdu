"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TIPOS_EQUIPO } from "@/lib/informes";
import { supabase } from "@/lib/supabase";
import { navegar } from "@/lib/hashRuta";
import { usePerfil } from "@/lib/usePerfil";
import { PantallaCarga } from "@/components/PantallaCarga";
import { IconoLinea } from "@/components/IconoLinea";
import { useEnLinea } from "@/lib/useEnLinea";

// Errores de red (sin señal o conexión cortada a mitad de la consulta).
function esErrorDeRed(mensaje: string): boolean {
  return /fetch|network|conexi|timeout|load failed/i.test(mensaje);
}

function AvisoSinConexion({ conDatos, onReintentar }: { conDatos: boolean; onReintentar?: () => void }) {
  if (conDatos) {
    return (
      <div role="status" className="aviso-estadisticas flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
        <IconoLinea nombre="sin-red" className="h-4 w-4 shrink-0" grosor={2.2} />
        <span>Sin conexión: se muestran los últimos datos cargados. Se actualizan solos cuando vuelva la señal.</span>
      </div>
    );
  }
  return (
    <div role="status" className="aviso-estadisticas mx-auto mt-lg flex max-w-md flex-col items-center gap-3 rounded-2xl border border-outline-variant bg-white p-lg text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <IconoLinea nombre="sin-red" className="h-6 w-6" grosor={2.1} />
      </span>
      <h2 className="text-title-md font-bold text-on-surface">Sin conexión</h2>
      <p className="text-body-md text-on-surface-variant">
        Las estadísticas necesitan internet. Se cargan solas cuando vuelva la señal.
      </p>
      {onReintentar ? (
        <button type="button" onClick={onReintentar} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-on-primary active:scale-95">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

type Mensual = { mes: string; cantidad: number };
type Barra = { id?: string; nombre?: string; tipo?: string; cantidad: number };
type Respuesta = { mensuales: Mensual[]; tecnicos: Barra[]; equipos: Barra[] };

function fechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function etiquetaMes(mes: string, corto = false): string {
  const [anio, numero] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: corto ? "short" : "long", year: "numeric" })
    .format(new Date(anio, numero - 1, 1))
    .replace(/^./, (x) => x.toUpperCase());
}

function Resumen({ datos }: { datos: Mensual[] }) {
  const total = datos.reduce((suma, dato) => suma + dato.cantidad, 0);
  const conDatos = datos.filter((dato) => dato.cantidad > 0);
  // Promedio del año en curso: de enero hasta el mes actual (incluido).
  const anio = String(new Date().getFullYear());
  const delAnio = datos.filter((dato) => dato.mes.startsWith(anio + "-"));
  const promedio = delAnio.length > 0 ? delAnio.reduce((suma, dato) => suma + dato.cantidad, 0) / delAnio.length : 0;
  const nombreMes = (mes: string) => etiquetaMes(mes).replace(/\s+de\s+\d{4}$|\s+\d{4}$/, "");
  const hasta = delAnio.length > 0 ? delAnio[delAnio.length - 1].mes : null;
  const periodo = hasta
    ? delAnio.length === 1 ? `${nombreMes(hasta)} ${anio}, hasta hoy` : `Enero a ${nombreMes(hasta).toLowerCase()} ${anio}, hasta hoy`
    : "Sin datos este año";
  const pico = conDatos.reduce<Mensual | null>((mejor, dato) => (!mejor || dato.cantidad > mejor.cantidad ? dato : mejor), null);
  const tarjetas = [
    { titulo: "Total del período", valor: String(total), detalle: `${datos.length} mes${datos.length === 1 ? "" : "es"}` },
    { titulo: "Promedio de informes por mes de este año", valor: promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 }), detalle: periodo },
    { titulo: "Mes con más informes", valor: pico ? String(pico.cantidad) : "—", detalle: pico ? etiquetaMes(pico.mes) : "Sin datos" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-sm">
      {tarjetas.map((tarjeta, index) => (
        <div key={tarjeta.titulo} className="chart-kpi list-item-in min-w-0 rounded-lg border border-outline-variant bg-white p-2.5 shadow-sm sm:p-md" style={{ "--item-delay": `${index * 70}ms` } as React.CSSProperties}>
          <p className="text-[9px] font-bold uppercase leading-tight tracking-wider text-on-surface-variant sm:text-[11px]">{tarjeta.titulo}</p>
          <p className="mt-1 text-[22px] font-bold leading-none text-primary tabular-nums sm:text-[28px]">{tarjeta.valor}</p>
          <p className="mt-1 text-[11px] leading-snug text-on-surface-variant sm:text-[12px]" title={tarjeta.detalle}>{tarjeta.detalle}</p>
        </div>
      ))}
    </div>
  );
}

function LineaMensual({ datos }: { datos: Mensual[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(datos.length > 0 ? datos.length - 1 : null);
  const ancho = Math.max(720, datos.length * 64);
  const alto = 250;
  const base = alto - 45;
  const max = Math.max(1, ...datos.map((x) => x.cantidad));
  const referencias = [1, 0.75, 0.5, 0.25, 0].map((fraccion) => Math.round(max * fraccion));
  const puntos = datos.map((dato, i) => {
    const x = 36 + i * ((ancho - 72) / Math.max(1, datos.length - 1));
    const y = 25 + (alto - 70) * (1 - dato.cantidad / max);
    return { ...dato, x, y };
  });
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(" ");
  const area = puntos.length > 1 ? `${puntos[0].x},${base} ${linea} ${puntos[puntos.length - 1].x},${base}` : "";

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [datos]);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low/30">
      <div className="flex h-[250px] min-w-0">
        <div className="flex w-10 shrink-0 flex-col justify-between pb-[48px] pl-1 pt-[17px] text-right text-[11px] text-on-surface-variant tabular-nums" aria-hidden="true">
          {referencias.map((valor, index) => <span key={`${valor}-${index}`}>{valor}</span>)}
        </div>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <svg width={ancho} height={alto} role="img" aria-label="Informes realizados por mes" className="block min-w-full">
            <defs>
              <linearGradient id="chart-area-gradiente" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" className="chart-area-stop-top" />
                <stop offset="100%" className="chart-area-stop-bottom" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((fraccion) => {
              const y = 25 + (alto - 70) * fraccion;
              return <line key={fraccion} x1="0" x2={ancho - 10} y1={y} y2={y} className="chart-grid" strokeDasharray="3 4" />;
            })}
            {area ? <polygon points={area} fill="url(#chart-area-gradiente)" className="chart-area" /> : null}
            <polyline points={linea} pathLength={1} fill="none" className="chart-line" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {seleccionado !== null && puntos[seleccionado] ? (
              <line x1={puntos[seleccionado].x} x2={puntos[seleccionado].x} y1={puntos[seleccionado].y} y2={base} className="chart-guide" strokeDasharray="2 3" />
            ) : null}
            {puntos.map((p, index) => {
              const activo = seleccionado === index;
              return (
                <g
                  key={p.mes}
                  role="button"
                  tabIndex={0}
                  aria-label={`${etiquetaMes(p.mes)}: ${p.cantidad} informes`}
                  aria-pressed={activo}
                  onClick={() => setSeleccionado(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSeleccionado(index);
                    }
                  }}
                  className="chart-point cursor-pointer outline-none"
                  style={{ "--item-delay": `${Math.min(index, 12) * 40}ms` } as React.CSSProperties}
                >
                  {/* Área táctil amplia para el celular */}
                  <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
                  {activo ? <circle cx={p.x} cy={p.y} r="10" className="chart-point-halo" strokeWidth="2" /> : null}
                  <circle cx={p.x} cy={p.y} r={activo ? 5.5 : 4} className="chart-point-dot" />
                  {p.cantidad > 0 || activo ? (
                    <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight={activo ? 700 : 500} className={activo ? "chart-value-active" : "chart-value"}>{p.cantidad}</text>
                  ) : null}
                  <text x={p.x} y={alto - 22} textAnchor="middle" fontSize="11" fontWeight={activo ? 700 : 400} className="chart-axis-text">{etiquetaMes(p.mes, true)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      {seleccionado !== null && datos[seleccionado] ? (
        <p className="border-t border-outline-variant bg-white px-md py-2 text-right text-[13px]" aria-live="polite">
          <strong>{etiquetaMes(datos[seleccionado].mes)}:</strong> {datos[seleccionado].cantidad} informe{datos[seleccionado].cantidad === 1 ? "" : "s"}
        </p>
      ) : (
        <p className="border-t border-outline-variant bg-white px-md py-2 text-right text-[12px] text-on-surface-variant">Seleccioná un mes para ver la cantidad.</p>
      )}
    </div>
  );
}

function Barras({ datos, etiqueta }: { datos: Barra[]; etiqueta: (dato: Barra) => string }) {
  const max = Math.max(1, ...datos.map((x) => x.cantidad));
  const total = datos.reduce((suma, dato) => suma + dato.cantidad, 0);
  if (datos.length === 0) return <p className="rounded-lg border border-outline-variant p-md text-body-md text-on-surface-variant">No hay informes para este período.</p>;
  return (
    <div className="space-y-sm">
      {datos.map((dato, i) => (
        <div key={`${dato.id ?? dato.tipo ?? i}`} className="grid grid-cols-[minmax(4.5rem,8rem)_1fr_auto] items-center gap-2 text-[13px] sm:grid-cols-[minmax(7rem,12rem)_1fr_auto] sm:gap-sm">
          <span className="truncate" title={etiqueta(dato)}>{etiqueta(dato)}</span>
          <div className="h-6 overflow-hidden rounded bg-surface-container-low">
            <div
              className="chart-bar h-full rounded"
              style={{ width: `${Math.max(4, (dato.cantidad / max) * 100)}%`, "--item-delay": `${Math.min(i, 10) * 60}ms` } as React.CSSProperties}
            />
          </div>
          <span className="whitespace-nowrap text-right tabular-nums">
            <strong className="text-primary">{dato.cantidad}</strong>
            <span className="ml-1 text-[11px] text-on-surface-variant">{total > 0 ? `${Math.round((dato.cantidad / total) * 100)}%` : ""}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Estadisticas() {
  const { esMaster, cargando: cargandoPerfil } = usePerfil();
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  });
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const enLinea = useEnLinea();

  const meses = useMemo(() => {
    const ahora = new Date();
    const salida: string[] = [];
    const inicio = new Date(2026, 0, 1);
    const cantidadMeses = Math.max(1, (ahora.getFullYear() - inicio.getFullYear()) * 12 + ahora.getMonth() + 1);
    for (let i = 0; i < cantidadMeses; i++) {
      const fecha = new Date(2026, i, 1);
      salida.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`);
    }
    return salida;
  }, []);

  useEffect(() => {
    if (cargandoPerfil) return;
    if (!esMaster) {
      navegar("#/");
      return;
    }
    // Sin señal no se consulta: se muestra el aviso y, al volver la conexión,
    // este efecto se ejecuta de nuevo y carga los datos.
    if (!enLinea) return;
    let activo = true;
    const ahora = new Date();
    const desde = new Date(2026, 0, 1);
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    (async () => {
      setCargando(true);
      setError(null);
      let consultaError: { message: string } | null = null;
      let data: unknown = null;
      try {
        ({ data, error: consultaError } = await supabase().rpc("estadisticas_informes", {
          p_desde: fechaIso(desde),
          p_hasta: fechaIso(hasta),
          p_mes: `${mes}-01`,
        }));
      } catch (e) {
        consultaError = { message: e instanceof Error ? e.message : String(e) };
      }
      if (!activo) return;
      if (consultaError) {
        setError(consultaError.message);
        // Si se cortó la señal se conservan los últimos datos cargados.
        if (!esErrorDeRed(consultaError.message)) setDatos(null);
      } else {
        setDatos(data as Respuesta);
      }
      setCargando(false);
    })();
    return () => { activo = false; };
  }, [esMaster, cargandoPerfil, mes, enLinea, intento]);

  const sinConexion = !enLinea || (error !== null && esErrorDeRed(error));
  if (cargandoPerfil || (!datos && cargando && !sinConexion)) return <PantallaCarga mensaje="Cargando estadísticas..." />;
  if (!esMaster) return null;

  return (
    <div className="min-h-screen bg-background pb-xl" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)" }}>
      <header className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-primary-container bg-primary px-margin text-on-primary shadow-sm" style={{ minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <h1 className="text-title-md font-bold tracking-tight">Estadísticas</h1>
        <a href="#/" className="rounded-lg bg-white px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-primary active:scale-95">Volver</a>
      </header>
      <main className="mx-auto max-w-7xl space-y-lg px-4 md:px-margin">
        {sinConexion ? (
          <AvisoSinConexion conDatos={datos !== null} onReintentar={enLinea ? () => setIntento((n) => n + 1) : undefined} />
        ) : error ? (
          <p className="rounded-lg border border-error bg-error-container p-md text-error">No se pudieron cargar las estadísticas: {error}</p>
        ) : null}
        {datos ? (
          <>
            <Resumen datos={datos.mensuales} />
            <section className="rounded-lg border border-outline-variant bg-white p-md shadow-sm">
              <div className="mb-md flex items-center justify-between gap-sm">
                <div><h2 className="section-title">Informes por mes</h2><p className="text-[12px] text-on-surface-variant">Últimos 12 meses visibles; deslizá para consultar meses anteriores.</p></div>
              </div>
              <LineaMensual datos={datos.mensuales} />
            </section>
            <section className={`rounded-lg border border-outline-variant bg-white p-md shadow-sm transition-opacity duration-300 ${cargando ? "opacity-60" : ""}`} aria-busy={cargando}>
              <div className="mb-md flex flex-wrap items-end justify-between gap-sm">
                <h2 className="section-title flex items-center gap-2">Informes por técnico{cargando ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Actualizando" /> : null}</h2>
                <label className="text-[12px] font-bold text-on-surface-variant">Mes
                  <select disabled={!enLinea} className="filter-control ml-2 rounded border border-outline-variant bg-white px-2 py-1 text-[13px] disabled:opacity-50" value={mes} onChange={(e) => setMes(e.target.value)}>
                    {meses.slice().reverse().map((item) => <option key={item} value={item}>{etiquetaMes(item)}</option>)}
                  </select>
                </label>
              </div>
              <Barras datos={datos.tecnicos} etiqueta={(dato) => dato.nombre ?? "Sin técnico"} />
            </section>
            <section className={`rounded-lg border border-outline-variant bg-white p-md shadow-sm transition-opacity duration-300 ${cargando ? "opacity-60" : ""}`} aria-busy={cargando}>
              <h2 className="section-title mb-md">Informes por tipo de equipo</h2>
              <Barras datos={datos.equipos} etiqueta={(dato) => TIPOS_EQUIPO.find((tipo) => tipo.value === dato.tipo)?.label ?? dato.tipo ?? "Sin tipo"} />
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

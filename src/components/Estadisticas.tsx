"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TIPOS_EQUIPO } from "@/lib/informes";
import { supabase } from "@/lib/supabase";
import { navegar } from "@/lib/hashRuta";
import { usePerfil } from "@/lib/usePerfil";
import { PantallaCarga } from "@/components/PantallaCarga";

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

function LineaMensual({ datos }: { datos: Mensual[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const ancho = Math.max(720, datos.length * 64);
  const alto = 250;
  const max = Math.max(1, ...datos.map((x) => x.cantidad));
  const referencias = [1, 0.75, 0.5, 0.25, 0].map((fraccion) => Math.round(max * fraccion));
  const puntos = datos.map((dato, i) => {
    const x = 10 + i * ((ancho - 30) / Math.max(1, datos.length - 1));
    const y = 25 + (alto - 70) * (1 - dato.cantidad / max);
    return { ...dato, x, y };
  });
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(" ");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [datos]);

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low/30">
      <div className="flex h-[250px] min-w-0">
        <div className="flex w-10 shrink-0 flex-col justify-between pb-[48px] pl-1 pt-[17px] text-right text-[11px] text-on-surface-variant" aria-hidden="true">
          {referencias.map((valor, index) => <span key={`${valor}-${index}`}>{valor}</span>)}
        </div>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
          <svg width={ancho} height={alto} role="img" aria-label="Informes realizados por mes" className="block min-w-full">
            {[0, 0.25, 0.5, 0.75, 1].map((fraccion) => {
              const y = 25 + (alto - 70) * fraccion;
              return <line key={fraccion} x1="0" x2={ancho - 10} y1={y} y2={y} stroke="#cbd5e1" strokeDasharray="3 4" />;
            })}
            <polyline points={linea} fill="none" stroke="#003e7a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {puntos.map((p, index) => (
              <g
                key={p.mes}
                role="button"
                tabIndex={0}
                aria-label={`${etiquetaMes(p.mes)}: ${p.cantidad} informes`}
                onClick={() => setSeleccionado(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSeleccionado(index);
                  }
                }}
                className="cursor-pointer"
              >
                {seleccionado === index ? <circle cx={p.x} cy={p.y} r="9" fill="#dbeafe" stroke="#003e7a" strokeWidth="2" /> : null}
                <circle cx={p.x} cy={p.y} r={seleccionado === index ? "5" : "4"} fill="#003e7a" />
                <text x={p.x} y={alto - 22} textAnchor="middle" fontSize="11" fill="#334155">{etiquetaMes(p.mes, true)}</text>
              </g>
            ))}
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
  if (datos.length === 0) return <p className="rounded-lg border border-outline-variant p-md text-body-md text-on-surface-variant">No hay informes para este período.</p>;
  return (
    <div className="space-y-sm">
      {datos.map((dato, i) => (
        <div key={`${dato.id ?? dato.tipo ?? i}`} className="grid grid-cols-[minmax(7rem,12rem)_1fr_auto] items-center gap-sm text-[13px]">
          <span className="truncate" title={etiqueta(dato)}>{etiqueta(dato)}</span>
          <div className="h-6 overflow-hidden rounded bg-surface-container-low">
            <div className="h-full rounded bg-primary transition-all" style={{ width: `${Math.max(4, (dato.cantidad / max) * 100)}%` }} />
          </div>
          <strong className="w-8 text-right text-primary">{dato.cantidad}</strong>
        </div>
      ))}
    </div>
  );
}

export function Estadisticas() {
  const { esAdmin, cargando: cargandoPerfil } = usePerfil();
  const [mes, setMes] = useState(() => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  });
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!esAdmin) {
      navegar("#/");
      return;
    }
    let activo = true;
    const ahora = new Date();
    const desde = new Date(2026, 0, 1);
    const hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    (async () => {
      setCargando(true);
      setError(null);
      const { data, error: consultaError } = await supabase().rpc("estadisticas_informes", {
        p_desde: fechaIso(desde),
        p_hasta: fechaIso(hasta),
        p_mes: `${mes}-01`,
      });
      if (!activo) return;
      if (consultaError) {
        setError(consultaError.message);
        setDatos(null);
      } else {
        setDatos(data as Respuesta);
      }
      setCargando(false);
    })();
    return () => { activo = false; };
  }, [esAdmin, cargandoPerfil, mes]);

  if (cargandoPerfil || (!datos && cargando)) return <PantallaCarga mensaje="Cargando estadísticas..." />;
  if (!esAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-xl" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)" }}>
      <header className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-primary-container bg-primary px-margin text-on-primary shadow-sm" style={{ minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <h1 className="text-title-md font-bold tracking-tight">Estadísticas</h1>
        <a href="#/" className="rounded-lg bg-white px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-primary active:scale-95">Volver</a>
      </header>
      <main className="mx-auto max-w-7xl space-y-lg px-4 md:px-margin">
        {error ? <p className="rounded-lg border border-error bg-error-container p-md text-error">No se pudieron cargar las estadísticas: {error}</p> : null}
        {datos ? (
          <>
            <section className="rounded-lg border border-outline-variant bg-white p-md shadow-sm">
              <div className="mb-md flex items-center justify-between gap-sm">
                <div><h2 className="section-title">Informes por mes</h2><p className="text-[12px] text-on-surface-variant">Últimos 12 meses visibles; deslizá para consultar meses anteriores.</p></div>
              </div>
              <LineaMensual datos={datos.mensuales} />
            </section>
            <section className="rounded-lg border border-outline-variant bg-white p-md shadow-sm">
              <div className="mb-md flex flex-wrap items-end justify-between gap-sm">
                <h2 className="section-title">Informes por técnico</h2>
                <label className="text-[12px] font-bold text-on-surface-variant">Mes
                  <select className="ml-2 rounded border border-outline-variant bg-white px-2 py-1 text-[13px]" value={mes} onChange={(e) => setMes(e.target.value)}>
                    {meses.slice().reverse().map((item) => <option key={item} value={item}>{etiquetaMes(item)}</option>)}
                  </select>
                </label>
              </div>
              <Barras datos={datos.tecnicos} etiqueta={(dato) => dato.nombre ?? "Sin técnico"} />
            </section>
            <section className="rounded-lg border border-outline-variant bg-white p-md shadow-sm">
              <h2 className="section-title mb-md">Informes por tipo de equipo</h2>
              <Barras datos={datos.equipos} etiqueta={(dato) => TIPOS_EQUIPO.find((tipo) => tipo.value === dato.tipo)?.label ?? dato.tipo ?? "Sin tipo"} />
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

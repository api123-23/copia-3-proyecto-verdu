"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSesion } from "@/lib/useSesion";
import { db } from "@/lib/db";
import {
  CAMPO_LABELS,
  CAMPO_LABELS_GE,
  CAMPOS_GE,
  CAMPOS_POR_TIPO,
  cargarAnexa,
  cargarAnexaGE,
  formatNumero,
  guardarBorrador,
  valoresVacios,
  valoresVaciosGE,
} from "@/lib/informes";
import { bloquearInformeSync, desbloquearInformeSync, intentarSync } from "@/lib/sync";
import { Icono } from "@/components/Icono";
import { traerInformeRemoto } from "@/lib/remoto";
import { navegar } from "@/lib/hashRuta";
import { gemini } from "@/lib/gemini";
import type { InformeGeneral, InformeGrupoElectrogeno, ValoresBase } from "@/lib/types";
import { Divisor, Toast } from "@/components/ui";
import { LogoTipo } from "@/components/LogoTipo";
import { PantallaCarga } from "@/components/PantallaCarga";
import {
  SeccionCliente,
  SeccionTrabajos,
  SeccionHoras,
  SeccionRepuestos,
  SeccionCotizacion,
  SeccionOperativa,
} from "@/components/informe/secciones";
import SeccionValores from "@/components/informe/SeccionValores";
import SeccionFotos from "@/components/informe/SeccionFotos";
import SeccionFirmas from "@/components/informe/SeccionFirmas";

function EditorProgreso({
  informe,
  valores,
  fotos,
}: {
  informe: InformeGeneral;
  valores: ValoresBase;
  fotos: number;
}) {
  const etapas = [
    { nombre: "Cliente", seccion: "Datos del Cliente", listo: Boolean(informe.cliente_nombre.trim()) },
    { nombre: "Trabajo", seccion: "Trabajos Realizados / Observaciones", listo: Boolean(informe.observaciones?.trim()) },
    { nombre: "Controles", seccion: "Valores", listo: Object.values(valores).some((v) => v !== null) },
    { nombre: "Cierre", seccion: "Horas Trabajadas", listo: informe.horas_trabajadas !== null && informe.maquina_operativa !== null },
    { nombre: "Evidencia", seccion: "Registro Fotográfico", listo: fotos >= 3 },
    { nombre: "Firmas", seccion: "Firmas Digitales", listo: informe.estado_firma === "firmado" },
  ];
  const completadas = etapas.filter((e) => e.listo).length;
  const porcentaje = Math.round((completadas / etapas.length) * 100);

  function irA(seccion: string) {
    document.querySelector(`[data-seccion="${seccion}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="editor-progress-panel" aria-label={`Progreso del informe: ${porcentaje}%`}>
      <div className="flex items-center justify-between gap-3 mb-sm">
        <div>
          <p className="text-label-caps font-label-caps font-bold tracking-wider text-primary">Progreso del informe</p>
          <p className="text-[12px] text-on-surface-variant">{completadas} de {etapas.length} etapas completas</p>
        </div>
        <strong className="text-headline-sm text-primary">{porcentaje}%</strong>
      </div>
      <div className="editor-progress-track" aria-hidden="true"><span style={{ width: `${porcentaje}%` }} /></div>
      <div className="editor-stage-list">
        {etapas.map((etapa, index) => (
          <button
            key={etapa.nombre}
            type="button"
            className={`editor-stage ${etapa.listo ? "is-complete" : ""}`}
            onClick={() => irA(etapa.seccion)}
          >
            <span className="editor-stage-dot">{etapa.listo ? "✓" : index + 1}</span>
            <span>{etapa.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EstadoEditor({ informe, online, tieneCambios }: { informe: InformeGeneral; online: boolean; tieneCambios: boolean }) {
  const estado = !online
    ? { texto: "Guardado local · Sin conexión", clase: "is-offline" }
    : tieneCambios
      ? { texto: "Cambios pendientes de guardar", clase: "is-pending" }
      : informe.estado_sync === "sincronizado"
        ? { texto: "Sincronizado con Supabase", clase: "is-ok" }
        : { texto: "Guardado local · Pendiente de sincronizar", clase: "is-pending" };

  return (
    <div className={`editor-status-bar ${estado.clase}`}>
      <span className="editor-status-dot" />
      <span>{estado.texto}</span>
      <span className="ml-auto hidden sm:inline text-[11px] font-normal opacity-75">Los cambios se guardan automáticamente</span>
    </div>
  );
}

export function EditorInforme({ id }: { id: string }) {
  const { cargando } = useSesion(false);
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase>(valoresVacios);
  const [valoresGE, setValoresGE] = useState<InformeGrupoElectrogeno>(valoresVaciosGE());
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [redactandoIA, setRedactandoIA] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [tieneCambios, setTieneCambios] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: "exito" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fotos = useLiveQuery(
    () => db.archivos.where({ informe_id: id, tipo: "foto" }).count(),
    [id]
  ) ?? 0;

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
    bloquearInformeSync(id);
    return () => desbloquearInformeSync(id);
  }, [id]);

  function mostrarToast(t: { mensaje: string; tipo: "exito" | "error" | "info" }) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 5000);
  }
  const sucioRef = useRef(false);
  const estadoRef = useRef<{
    informe: InformeGeneral | null;
    valores: ValoresBase;
    valoresGE: InformeGrupoElectrogeno;
  }>({
    informe: null,
    valores: valoresVacios(),
    valoresGE: valoresVaciosGE(),
  });

  useEffect(() => {
    let activo = true;
    (async () => {
      let inf = await db.informes.get(id).catch(() => undefined);
      if (!inf) {
        const traido = await traerInformeRemoto(id).catch(() => false);
        if (traido) inf = await db.informes.get(id).catch(() => undefined);
      }
      if (!inf) {
        const crudo = sessionStorage.getItem("verdu-nuevo");
        if (crudo) {
          try {
            const candidato = JSON.parse(crudo) as InformeGeneral;
            if (candidato.id === id) inf = candidato;
          } catch {
            /* sesión corrupta; se ignora */
          }
        }
      }
      if (!inf) {
        if (activo) setFallo(true);
        return;
      }
      inf = {
        ...inf,
        modelo: inf.modelo ?? null,
        numero_serie: inf.numero_serie ?? null,
      };
      const anexa = await cargarAnexa(inf.tipo_equipo, inf.id);
      let anexaGE = valoresVaciosGE();
      if (inf.tipo_equipo === "grupo_electrogeno") {
        anexaGE = await cargarAnexaGE(inf.id);
      }
      if (!activo) return;
      const val = { ...valoresVacios(), ...anexa };
      estadoRef.current = { informe: inf, valores: val, valoresGE: anexaGE };
      sucioRef.current = false;
      setTieneCambios(false);
      setFallo(false);
      setInforme(inf);
      setValores(val);
      setValoresGE(anexaGE);
    })();
    return () => {
      activo = false;
    };
  }, [id, cargando, intento]);

  function patchInforme(p: Partial<InformeGeneral>) {
    sucioRef.current = true;
    setTieneCambios(true);
    setInforme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      estadoRef.current.informe = next;
      return next;
    });
  }

  function patchValores(p: Partial<ValoresBase>) {
    sucioRef.current = true;
    setTieneCambios(true);
    setValores((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valores = next;
      return next;
    });
  }

  function patchValoresGE(p: Partial<InformeGrupoElectrogeno>) {
    sucioRef.current = true;
    setTieneCambios(true);
    setValoresGE((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valoresGE = next;
      return next;
    });
  }

  async function enviar() {
    if (enviando) return;
    const { informe: inf, valores: val, valoresGE: ge } = estadoRef.current;
    if (!inf) return;
    const faltantes: string[] = [];
    if (inf.tipo_equipo === "extraordinarios") {
      if (!inf.observaciones?.trim()) faltantes.push("Trabajos realizados / Observaciones");
    } else {
      if (!inf.cliente_nombre.trim()) faltantes.push("Cliente / Empresa");
      if (inf.horas_trabajadas === null) faltantes.push("Total Horas Trabajadas");
      if (inf.maquina_operativa === null) faltantes.push("¿La máquina queda operativa?");
      if (inf.tipo_equipo === "grupo_electrogeno") {
          for (const campo of CAMPOS_GE) {
            if (campo === "informe_id") continue;
            if (ge[campo] === null || ge[campo] === undefined) faltantes.push(CAMPO_LABELS_GE[campo]);
          }
      } else {
        for (const campo of CAMPOS_POR_TIPO[inf.tipo_equipo]) {
          if (
            (inf.tipo_equipo === "vehiculos" && (campo === "horometro" || campo === "kilometros")) ||
            (inf.tipo_equipo === "secadores" && campo === "horometro")
          ) continue;
          if (val[campo] === null) faltantes.push(CAMPO_LABELS[campo]);
        }
      }
      const fotos = await db.archivos.where({ informe_id: inf.id, tipo: "foto" }).count();
      if (fotos < 3) faltantes.push("Registro Fotográfico (mínimo 3 fotos)");
    }
    if (faltantes.length > 0) {
      mostrarToast({ mensaje: `Faltan: ${faltantes.slice(0, 3).join(", ")}...`, tipo: "error" });
      return;
    }
    setEnviando(true);
    try {
      const cerrado = inf.estado_firma === "firmado";
      const yaSincronizado = inf.estado_sync === "sincronizado";
      const archivosPendientes = await db.archivos
        .where("informe_id")
        .equals(inf.id)
        .filter((a) => a.estado_sync !== "sincronizado")
        .count();
      const hayCambios = sucioRef.current || archivosPendientes > 0;
      const resincronizar = !yaSincronizado || hayCambios;
      const guardado = {
        ...inf,
        estado_sync: resincronizar ? ("pendiente" as const) : ("sincronizado" as const),
        cerrado: inf.cerrado || cerrado,
      };
      estadoRef.current.informe = guardado;
      setInforme(guardado);
       await guardarBorrador(guardado, val, inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined);
       setTieneCambios(false);
       desbloquearInformeSync(inf.id);
       if (resincronizar) intentarSync();
      mostrarToast({ mensaje: "Informe guardado. Sincronizando...", tipo: "exito" });
      setTimeout(() => navegar("#/"), 700);
    } catch {
      mostrarToast({ mensaje: "No se pudo guardar el informe. Reintentá.", tipo: "error" });
    } finally {
      setEnviando(false);
    }
  }

  async function generarInforme() {
    const inf = estadoRef.current.informe;
    if (!inf || generandoInforme) return;
    const fuente =
      inf.observaciones?.trim() ||
      `Cliente: ${inf.cliente_nombre} | Equipo: ${inf.tipo_equipo} | Dirección: ${inf.cliente_direccion ?? ""}`;
    setGenerandoInforme(true);
    try {
      const texto = await gemini(
        `Sos un redactor técnico de informes de mantenimiento. Reescribí el texto de abajo de forma más formal y prolija, SIN cambiar su significado ni agregar información. Reglas estrictas: NO inventes trabajos, procesos, pasos ni detalles que no estén escritos; NO menciones procedimientos, herramientas ni tareas que no figuren en el texto original; NO agregues ni quites datos (clientes, equipos, horas, observaciones); mantené el mismo contenido, solo mejorá la redacción. Escribí en español, en primera persona, en un solo párrafo, sin títulos ni markdown:\n\n${fuente}`
      );
      patchInforme({
        observaciones: texto.trim(),
        observaciones_ia: "Generado con IA (revisar antes de enviar).",
      });
      mostrarToast({ mensaje: "Informe generado con IA.", tipo: "exito" });
    } catch (e) {
      mostrarToast({
        mensaje: e instanceof Error ? e.message : "No se pudo generar con IA.",
        tipo: "error",
      });
    } finally {
      setGenerandoInforme(false);
    }
  }

  async function redactarConIA() {
    const inf = estadoRef.current.informe;
    if (!inf || redactandoIA) return;
    const fuente = inf.cotizacion_notas?.trim();
    if (!fuente) {
      mostrarToast({ mensaje: "Escribí qué se debe cotizar primero.", tipo: "info" });
      return;
    }
    setRedactandoIA(true);
    try {
      const texto = await gemini(
        `Sos un asistente de cotizaciones técnicas. A partir de este detalle, organizá los ítems a cotizar de manera clara y concisa, respetando exactamente lo indicado sin inventar nada. Usá bullets simples en español, sin precios:\n\n${fuente}`
      );
      patchInforme({
        cotizacion_notas: texto.trim(),
        cotizacion_notas_ia: "Generado con IA (revisar antes de enviar).",
      });
      mostrarToast({ mensaje: "Cotización redactada con IA.", tipo: "exito" });
    } catch (e) {
      mostrarToast({
        mensaje: e instanceof Error ? e.message : "No se pudo redactar con IA.",
        tipo: "error",
      });
    } finally {
      setRedactandoIA(false);
    }
  }

  if (fallo) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-md px-margin">
        <p className="text-body-lg text-on-surface-variant text-center">
          No se pudo cargar el informe. Verificá tu conexión o reintentá.
        </p>
        <div className="flex gap-sm">
          <button
            type="button"
            className="bg-primary text-on-primary rounded px-md py-1 text-[13px] font-bold uppercase tracking-wider"
            onClick={() => setIntento((i) => i + 1)}
          >
            Reintentar
          </button>
          <a
            href="#/"
            className="border border-outline-variant rounded px-md py-1 text-[13px]"
          >
            Volver al listado
          </a>
        </div>
      </main>
    );
  }

  if (!informe) {
    return <PantallaCarga mensaje="Cargando informe..." />;
  }

  const fecha = new Date(informe.fecha_hora).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      className="pb-xl"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
      }}
    >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-2">
          <a
            href="#/"
            className="hover:bg-primary-container active:scale-95 transition-all px-2 py-1 rounded"
            aria-label="Volver al listado"
          >
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Informe Técnico № {formatNumero(informe.numero_registro)}
          </h1>
        </div>
        <button
          type="button"
          disabled={enviando}
           className="flex min-h-[44px] items-center gap-1.5 text-label-caps font-label-caps font-bold tracking-wider bg-gradient-to-br from-white to-sky-100 text-primary px-4 py-2 rounded-lg shadow-lg shadow-black/30 ring-1 ring-white/50 hover:brightness-105 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          onClick={enviar}
        >
          {enviando ? (
            <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : (
            <Icono nombre="send" className="w-[17px] h-[17px]" />
          )}
          {enviando ? "ENVIANDO" : "ENVIAR"}
        </button>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
        <div className="bg-white border-b border-outline-variant px-md py-1 flex items-center justify-between mb-md shadow-sm">
          <span className="flex items-center gap-2 text-title-md font-title-md font-bold text-primary">
            <LogoTipo className="w-5 h-5 rounded" />
            AIR POWER S.A.
          </span>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Icono nombre="calendar_today" className="w-[16px] h-[16px]" />
            <span className="text-body-md font-body-md text-[12px]">{fecha}</span>
          </div>
        </div>

        <EstadoEditor informe={informe} online={online} tieneCambios={tieneCambios} />
        <EditorProgreso informe={informe} valores={valores} fotos={fotos} />

        <fieldset disabled={informe.cerrado} className="m-0 min-w-0 border-0 p-0">
          <SeccionCliente informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionTrabajos
            informe={informe}
            onChange={patchInforme}
            onGenerarInforme={generarInforme}
            generandoInforme={generandoInforme}
          />
          <SeccionValores
            tipo={informe.tipo_equipo}
            valores={valores}
            onChange={patchValores}
             valoresGE={valoresGE}
             onChangeGE={patchValoresGE}
          />
          <Divisor />
          <SeccionOperativa informe={informe} onChange={patchInforme} />
          <Divisor />
           <SeccionHoras informe={informe} onChange={patchInforme} obligatoria={informe.tipo_equipo !== "extraordinarios"} />
          <Divisor />
          <SeccionRepuestos informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionCotizacion
            informe={informe}
            onChange={patchInforme}
            onRedactarIA={redactarConIA}
            redactandoIA={redactandoIA}
          />
          <Divisor />
           <SeccionFotos informeId={informe.id} cerrado={informe.cerrado} obligatoria={informe.tipo_equipo !== "extraordinarios"} />
          <Divisor />
          <SeccionFirmas informe={informe} onChange={patchInforme} />
        </fieldset>
      </main>
      {toast ? (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onCerrar={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { debeMostrarse, iniciarRecorrido, pedirRepasoInforme, repasoInformePendiente } from "@/lib/tutorial";
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
import { actualizadoEnServidor, copiaLocalVigente, descartarCopiaLocal, traerInformeRemoto } from "@/lib/remoto";
import { EVENTO_GUARDAR_ANTES_DE_RECARGAR, type EsperarGuardado } from "@/lib/recarga";
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

type Faltante = { campo: string; etiqueta: string };

// Cada campo obligatorio tiene data-campo con su identificador. Se busca por
// esa marca (no por el texto de la etiqueta, que cambia según el equipo) y se
// usa el primero de arriba hacia abajo entre los que se ven en pantalla.
function ubicarFaltantes(faltantes: Faltante[]): { elemento: HTMLElement | null; nombres: string[] } {
  const encontrados: { el: HTMLElement; nombre: string }[] = [];
  const sinUbicar: string[] = [];
  for (const f of faltantes) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-campo="${f.campo}"]`)).find((x) => x.getClientRects().length > 0);
    if (el) encontrados.push({ el, nombre: el.dataset.validationLabel?.replace(/^\d+\.\s*/, "") || f.etiqueta });
    else sinUbicar.push(f.etiqueta);
  }
  encontrados.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return { elemento: encontrados[0]?.el ?? null, nombres: [...encontrados.map((e) => e.nombre), ...sinUbicar] };
}

function resaltar(objetivo: HTMLElement) {
  objetivo.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  objetivo.classList.remove("field-validation-error");
  void objetivo.offsetWidth;
  objetivo.classList.add("field-validation-error");
  window.setTimeout(() => objetivo.classList.remove("field-validation-error"), 2500);
}

const MENSAJE_ERROR_GUARDADO = "No se pudo guardar en el celular. No cierres la app: revisá el espacio libre y volvé a intentar.";

// La copia en memoria de un informe recién creado solo sirve hasta que queda
// guardado en el celular. Después se lee de ahí o del servidor: nunca de esta
// copia en blanco (si no, al reabrirlo ya enviado se vería vacío).
function olvidarInformeNuevo(id: string) {
  try {
    const crudo = sessionStorage.getItem("verdu-nuevo");
    if (crudo && (JSON.parse(crudo) as { id?: string }).id === id) sessionStorage.removeItem("verdu-nuevo");
  } catch {
    /* sin acceso a la memoria de la sesión: no hay nada que olvidar */
  }
}

export function EditorInforme({ id }: { id: string }) {
  const { cargando, sesion } = useSesion(false);
  const uidTutorial = sesion?.user?.id ?? null;
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase>(valoresVacios);
  const [valoresGE, setValoresGE] = useState<InformeGrupoElectrogeno>(valoresVaciosGE());
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [redactandoIA, setRedactandoIA] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: "exito" | "error" | "info" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permitirSalida = useRef(false);

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
  // Guardado automático: todo cambio queda en el celular aunque se cierre la
  // app. Las escrituras van en cola para que un autoguardado nunca pise a
  // "Enviar".
  const pendienteGuardarRef = useRef(false);
  const esNuevoRef = useRef(false);
  const guardadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colaGuardadoRef = useRef<Promise<void>>(Promise.resolve());
  const [estadoGuardado, setEstadoGuardado] = useState<"guardando" | "guardado" | null>(null);
  const ocultarGuardadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Copia local SIN cambios de un informe del servidor: con conexión se
      // compara con el servidor. Si otra persona lo modificó (o este usuario ya
      // no puede verlo) se descarta la copia vieja y se trae la versión actual,
      // así nunca se edita sobre datos viejos.
      if (inf && inf.estado_sync === "sincronizado" && (typeof navigator === "undefined" || navigator.onLine)) {
        if ((await copiaLocalVigente(inf)) === false) {
          await descartarCopiaLocal(id).catch(() => undefined);
          inf = undefined;
        }
      }
      // Informe recién creado: está en memoria de la sesión, no hace falta
      // consultar el servidor (sin señal eso demoraba la apertura).
      if (!inf) {
        const crudo = sessionStorage.getItem("verdu-nuevo");
        if (crudo) {
          try {
            const candidato = JSON.parse(crudo) as InformeGeneral;
            if (candidato.id === id) {
              inf = candidato;
              esNuevoRef.current = true;
            }
          } catch {
            /* sesión corrupta; se ignora */
          }
        }
      }
      if (!inf && (typeof navigator === "undefined" || navigator.onLine)) {
        const traido = await traerInformeRemoto(id).catch(() => false);
        if (traido) inf = await db.informes.get(id).catch(() => undefined);
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
      setFallo(false);
      setInforme(inf);
      setValores(val);
      setValoresGE(anexaGE);
    })();
    return () => {
      activo = false;
    };
  }, [id, cargando, intento]);

  const guardarAhora = useCallback((): Promise<void> => {
    if (guardadoTimerRef.current) {
      clearTimeout(guardadoTimerRef.current);
      guardadoTimerRef.current = null;
    }
    colaGuardadoRef.current = colaGuardadoRef.current.then(async () => {
      if (!pendienteGuardarRef.current) return;
      const { informe: inf, valores: val, valoresGE: ge } = estadoRef.current;
      if (!inf) return;
      pendienteGuardarRef.current = false;
      setEstadoGuardado("guardando");
      try {
        // Borrador: no se sube hasta que se toque "Enviar".
        await guardarBorrador(
          { ...inf, estado_sync: "pendiente", listo_para_enviar: false },
          val,
          inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined
        );
        esNuevoRef.current = false;
        olvidarInformeNuevo(inf.id);
        setEstadoGuardado("guardado");
        if (ocultarGuardadoRef.current) clearTimeout(ocultarGuardadoRef.current);
        ocultarGuardadoRef.current = setTimeout(() => setEstadoGuardado(null), 2200);
        setToast((t) => (t?.mensaje === MENSAJE_ERROR_GUARDADO ? null : t));
      } catch (error) {
        pendienteGuardarRef.current = true;
        setEstadoGuardado(null);
        console.error("[editor] No se pudo guardar el borrador:", error);
        // Aviso visible (queda hasta cerrarlo o hasta que se guarde bien).
        setToast({ mensaje: MENSAJE_ERROR_GUARDADO, tipo: "error" });
      }
    });
    return colaGuardadoRef.current;
  }, []);

  function programarGuardado() {
    pendienteGuardarRef.current = true;
    if (guardadoTimerRef.current) clearTimeout(guardadoTimerRef.current);
    guardadoTimerRef.current = setTimeout(() => void guardarAhora(), 800);
  }

  // Al pasar a segundo plano, cerrar la app o salir del editor se guarda ya.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === "hidden") void guardarAhora();
    };
    const alSalir = () => void guardarAhora();
    // Antes de recargar la app (actualización) se guarda y se espera.
    const alRecargar = (e: Event) => (e as CustomEvent<EsperarGuardado>).detail?.(guardarAhora());
    document.addEventListener("visibilitychange", alOcultar);
    window.addEventListener("pagehide", alSalir);
    window.addEventListener(EVENTO_GUARDAR_ANTES_DE_RECARGAR, alRecargar);
    return () => {
      document.removeEventListener("visibilitychange", alOcultar);
      window.removeEventListener("pagehide", alSalir);
      window.removeEventListener(EVENTO_GUARDAR_ANTES_DE_RECARGAR, alRecargar);
      void guardarAhora();
    };
  }, [guardarAhora]);

  // Cuando se agrega una foto o firma nueva, el informe se guarda como borrador
  // al instante: así el archivo nunca queda suelto ni se pierde con
  // "Actualizar". Abrir un informe sin tocar nada no lo modifica.
  const archivosSinSubir = useLiveQuery(
    () => db.archivos.where("informe_id").equals(id).filter((a) => a.estado_sync !== "sincronizado").count(),
    [id]
  );
  const archivosSinSubirInicialRef = useRef<number | null>(null);
  useEffect(() => {
    if (archivosSinSubir === undefined || !informe) return;
    if (archivosSinSubirInicialRef.current === null) {
      archivosSinSubirInicialRef.current = archivosSinSubir;
      if (!esNuevoRef.current || archivosSinSubir === 0) return;
    }
    if (archivosSinSubir > archivosSinSubirInicialRef.current || (esNuevoRef.current && archivosSinSubir > 0)) {
      archivosSinSubirInicialRef.current = archivosSinSubir;
      pendienteGuardarRef.current = true;
      void guardarAhora();
    }
  }, [archivosSinSubir, informe, guardarAhora]);

  // Eliminar una foto ya subida también guarda el informe como borrador al
  // instante, para que el borrado se envíe junto con el resto de los cambios.
  const fotosEliminadas = useLiveQuery(() => db.eliminados.where("informe_id").equals(id).count(), [id]);
  const fotosEliminadasInicialRef = useRef<number | null>(null);
  useEffect(() => {
    if (fotosEliminadas === undefined || !informe) return;
    if (fotosEliminadasInicialRef.current === null) {
      fotosEliminadasInicialRef.current = fotosEliminadas;
      return;
    }
    if (fotosEliminadas > fotosEliminadasInicialRef.current) {
      fotosEliminadasInicialRef.current = fotosEliminadas;
      sucioRef.current = true;
      pendienteGuardarRef.current = true;
      void guardarAhora();
    }
  }, [fotosEliminadas, informe, guardarAhora]);

  // Tutorial del informe: la primera vez que se abre uno (o al repasarlo desde el menú).
  const informeListo = Boolean(informe);
  useEffect(() => {
    if (!informeListo) return;
    let vigente = true;
    const t = window.setTimeout(async () => {
      if (!vigente) return;
      if (repasoInformePendiente()) {
        pedirRepasoInforme(false);
        iniciarRecorrido("informe", true);
      } else if (uidTutorial && (await debeMostrarse(uidTutorial, "informe")) && vigente) {
        iniciarRecorrido("informe");
      }
    }, 900);
    return () => {
      vigente = false;
      window.clearTimeout(t);
    };
  }, [informeListo, uidTutorial]);

  function patchInforme(p: Partial<InformeGeneral>) {
    sucioRef.current = true;
    programarGuardado();
    setInforme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      estadoRef.current.informe = next;
      return next;
    });
  }

  function patchValores(p: Partial<ValoresBase>) {
    sucioRef.current = true;
    programarGuardado();
    setValores((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valores = next;
      return next;
    });
  }

  function patchValoresGE(p: Partial<InformeGrupoElectrogeno>) {
    sucioRef.current = true;
    programarGuardado();
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
    const faltantes: Faltante[] = [];
    if (inf.tipo_equipo === "extraordinarios") {
      if (!inf.observaciones?.trim()) faltantes.push({ campo: "observaciones", etiqueta: "Trabajos realizados / Observaciones" });
    } else {
      if (!inf.cliente_nombre.trim()) faltantes.push({ campo: "cliente_nombre", etiqueta: "Cliente / Empresa" });
      if (inf.horas_trabajadas === null) faltantes.push({ campo: "horas_trabajadas", etiqueta: "Total Horas Trabajadas" });
      if (inf.maquina_operativa === null) faltantes.push({ campo: "maquina_operativa", etiqueta: "¿La máquina queda operativa?" });
      if (inf.tipo_equipo === "grupo_electrogeno") {
          for (const campo of CAMPOS_GE) {
            if (campo === "informe_id") continue;
            if (ge[campo] === null || ge[campo] === undefined) faltantes.push({ campo, etiqueta: CAMPO_LABELS_GE[campo] });
          }
      } else {
        for (const campo of CAMPOS_POR_TIPO[inf.tipo_equipo]) {
          if (
            (inf.tipo_equipo === "vehiculos" && (campo === "horometro" || campo === "kilometros")) ||
            (inf.tipo_equipo === "secadores" && campo === "horometro")
          ) continue;
          if (inf.tipo_equipo === "vehiculos" && ["aceite_caja", "aceite_diferencial"].includes(campo)) continue;
          if (val[campo] == null) faltantes.push({ campo, etiqueta: CAMPO_LABELS[campo] });
        }
      }
      const fotos = await db.archivos.where("informe_id").equals(inf.id).filter((a) => a.tipo === "foto").count();
      if (fotos < 3) faltantes.push({ campo: "fotos", etiqueta: "Registro Fotográfico (mínimo 3 fotos)" });
    }
    if (faltantes.length > 0) {
      const { elemento, nombres } = ubicarFaltantes(faltantes);
      if (elemento) resaltar(elemento);
      mostrarToast({ mensaje: `Faltan: ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? ` y ${nombres.length - 3} más` : ""}`, tipo: "error" });
      return;
    }
    // Si otra persona modificó el informe en el servidor después de abrirlo,
    // se avisa antes de reemplazar sus cambios.
    if (inf.base_servidor_en && (typeof navigator === "undefined" || navigator.onLine)) {
      const enServidor = await actualizadoEnServidor(inf.id);
      if (enServidor && new Date(enServidor).getTime() !== new Date(inf.base_servidor_en).getTime()) {
        const seguir = window.confirm(
          "Otra persona modificó este informe después de que lo abriste. Si enviás, tus cambios reemplazan los suyos. ¿Enviar igual?"
        );
        if (!seguir) return;
      }
    }
    setEnviando(true);
    try {
      if (guardadoTimerRef.current) {
        clearTimeout(guardadoTimerRef.current);
        guardadoTimerRef.current = null;
      }
      pendienteGuardarRef.current = false;
      await colaGuardadoRef.current;
      const cerrado = inf.estado_firma === "firmado";
      const yaSincronizado = inf.estado_sync === "sincronizado";
      const archivosPendientes = await db.archivos
        .where("informe_id")
        .equals(inf.id)
        .filter((a) => a.estado_sync !== "sincronizado")
        .count();
      const fotosEliminadas = await db.eliminados.where("informe_id").equals(inf.id).count();
      const hayCambios = sucioRef.current || archivosPendientes > 0 || fotosEliminadas > 0;
      const resincronizar = !yaSincronizado || hayCambios;
       const guardado = {
         ...inf,
         estado_sync: resincronizar ? ("pendiente" as const) : ("sincronizado" as const),
         listo_para_enviar: true,
         cerrado: inf.cerrado || cerrado,
       };
      estadoRef.current.informe = guardado;
      setInforme(guardado);
       await guardarBorrador(guardado, val, inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined);
       olvidarInformeNuevo(inf.id);
       desbloquearInformeSync(inf.id);
       if (resincronizar) intentarSync();
      mostrarToast({ mensaje: "Informe guardado. Sincronizando...", tipo: "exito" });
       setTimeout(() => {
         permitirSalida.current = true;
         navegar("#/" );
       }, 700);
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
          `Reformulá el texto proporcionado con una redacción más formal, clara y prolija. Tu única función es formalizar lo que ya está escrito. No actúes como técnico ni completes el informe. No inventes, supongas, interpretes ni agregues trabajos, procesos, pasos, herramientas, diagnósticos, causas, resultados o detalles. No cambies, elimines ni agregues información. Conservá exactamente los datos y el significado del texto original. Si el texto es breve o incompleto, mantenelo breve e incompleto; no lo completes. Respondé en español, en un solo párrafo, sin títulos, introducciones, conclusiones ni markdown:\n\n${fuente}`
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
          `Ordená exclusivamente los elementos, repuestos, trabajos o servicios que aparecen explícitamente en el texto y que deben cotizarse. Tu única función es ordenar la información existente, no actuar como cotizador ni completar datos. No inventes, supongas, interpretes ni asumas cantidades, modelos, marcas, precios, medidas, trabajos o servicios. No agregues elementos que no estén escritos de forma clara. Respondé únicamente con una lista simple y objetiva, un elemento por línea con formato de viñeta. No incluyas introducciones, explicaciones, conclusiones, recomendaciones, precios ni texto de relleno. Si el texto no contiene ningún elemento concreto para cotizar, respondé únicamente: - Sin elementos para cotizar.\n\nTexto proporcionado:\n${fuente}`
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

  function volverAlListado(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    void guardarAhora().finally(() => navegar("#/"));
  }

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
            data-tutorial="volver"
            onClick={volverAlListado}
          >
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Informe Técnico № {formatNumero(informe.numero_registro)}
          </h1>
          <span
            className={`indicador-guardado ml-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-on-primary/80 ${estadoGuardado ? "visible" : ""}`}
            aria-live="polite"
          >
            {estadoGuardado === "guardando" ? (
              <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            <span className="hidden sm:inline">{estadoGuardado === "guardando" ? "Guardando" : "Guardado"}</span>
          </span>
        </div>
        <button
          type="button"
          disabled={enviando}
           className="action-light-button flex min-h-[44px] items-center gap-1.5 text-label-caps font-label-caps font-bold tracking-wider bg-gradient-to-br from-white to-sky-100 text-primary px-4 py-2 rounded-lg shadow-lg shadow-black/30 ring-1 ring-white/50 hover:brightness-105 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-xl active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:scale-100"
          onClick={enviar}
          data-tutorial="enviar"
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

        <fieldset disabled={informe.cerrado} className="m-0 min-w-0 border-0 p-0">
          <SeccionCliente informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionTrabajos
            informe={informe}
            onChange={patchInforme}
            onGenerarInforme={generarInforme}
            generandoInforme={generandoInforme}
          />
          <div data-tutorial="valores">
            <SeccionValores
              tipo={informe.tipo_equipo}
              valores={valores}
              onChange={patchValores}
              valoresGE={valoresGE}
              onChangeGE={patchValoresGE}
            />
          </div>
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
          <div data-tutorial="firmas">
            <SeccionFirmas informe={informe} onChange={patchInforme} />
          </div>
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

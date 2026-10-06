"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buscarClientes, leerCacheClientes } from "@/lib/clientes";
import { INFORMES_POR_PAGINA, diaArgentina, listarRemotos, numeroDeFiltro, type FiltrosListado } from "@/lib/remoto";
import { marcarListaCargada } from "@/lib/tutorial";
import { supabase } from "@/lib/supabase";
import { fetchAutenticado } from "@/lib/fetchAutenticado";
import type { InformeGeneral } from "@/lib/types";
import { TIPOS_EQUIPO, formatNumero } from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { useSesion } from "@/lib/useSesion";
import { usePerfil } from "@/lib/usePerfil";
import { useEnLinea } from "@/lib/useEnLinea";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { PantallaCarga } from "@/components/PantallaCarga";
import { VistaPdfInforme } from "@/components/informe/VistaPdfInforme";

const BADGE_SYNC: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Subiendo...", clase: "bg-amber-100 text-amber-800 animate-pulse" },
  subiendo_imagenes: { label: "Subiendo fotos...", clase: "bg-amber-100 text-amber-800 animate-pulse" },
  imagenes_ok: { label: "Guardando...", clase: "bg-amber-100 text-amber-800 animate-pulse" },
  sincronizado: { label: "Sincronizado", clase: "bg-green-100 text-green-700" },
  error: { label: "Error de sync", clase: "bg-red-100 text-red-700" },
};

const BADGE_BORRADOR = { label: "Borrador", clase: "bg-sky-100 text-sky-800" };

/** Sin señal: el informe espera en el equipo; no se muestra como "subiendo". */
const BADGE_EN_ESPERA = { label: "En espera (sin señal)", clase: "bg-surface-container-high text-on-surface-variant" };

const ESTADOS_EN_CURSO = new Set(["pendiente", "subiendo_imagenes", "imagenes_ok"]);

function badgeSync(inf: InformeGeneral, enLinea: boolean, avance?: string): { label: string; clase: string } {
  if (!inf.listo_para_enviar) return BADGE_BORRADOR;
  const estado = BADGE_SYNC[inf.estado_sync] ? inf.estado_sync : "pendiente";
  if (!enLinea && ESTADOS_EN_CURSO.has(estado)) return BADGE_EN_ESPERA;
  if (estado === "subiendo_imagenes" && avance) return { ...BADGE_SYNC[estado], label: `Subiendo fotos y firmas ${avance}` };
  return BADGE_SYNC[estado];
}

/** Traduce el error técnico de sincronización a un mensaje claro para el técnico. */
function mensajeErrorSync(error: string): string {
  if (error.startsWith("Se perdió")) return error;
  const e = error.toLowerCase();
  if (/conexión|conexion|fetch|network|pendiente/.test(e)) return "Sin conexión estable. Se vuelve a intentar solo.";
  if (/sesión|jwt|token|401/.test(e)) return "Tu sesión venció. Ingresá tu contraseña para subirlo.";
  return "No se pudo subir. Tocá Reintentar.";
}

/** Elimina un borrador local (nunca toca lo que ya está en el servidor). */
async function descartarBorrador(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno, db.archivos, db.blobs, db.eliminados],
    async () => {
      const informe = await db.informes.get(id);
      if (!informe || informe.listo_para_enviar) return;
      const archivos = await db.archivos.where("informe_id").equals(id).primaryKeys();
      // Fotos/firmas ya subidas pertenecen al informe del servidor: se conservan allá
      // (también las que se habían eliminado en este borrador descartado).
      await db.blobs.bulkDelete(archivos);
      await db.archivos.bulkDelete(archivos);
      await db.eliminados.where("informe_id").equals(id).delete();
      for (const tabla of [db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno]) {
        await tabla.delete(id);
      }
      await db.informes.delete(id);
    }
  );
}

type Tecnico = { id: string; nombre: string | null; apellido: string | null; rol: string };

// Lista de técnicos guardada en el celular (por cuenta): los nombres se ven al
// instante y sin señal, aunque el pedido al servidor tarde o falle.
const claveTecnicos = (uid: string) => `verdu-tecnicos-${uid}`;
function leerTecnicosGuardados(uid: string): Tecnico[] {
  try {
    const lista = JSON.parse(localStorage.getItem(claveTecnicos(uid)) ?? "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** Corta la espera: un pedido colgado (señal mala, app en segundo plano) no deja la pantalla esperando para siempre. */
function conLimite<T>(promesa: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("El servidor tardó demasiado")), ms);
    Promise.resolve(promesa).then(
      (v) => { window.clearTimeout(t); resolve(v); },
      (e) => { window.clearTimeout(t); reject(e); }
    );
  });
}
type ClienteL = { id: string; nombre: string };

function estadoFirmaClase(inf: InformeGeneral): string {
  return inf.estado_firma === "firmado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800";
}

/** Si la página pedida quedó fuera de rango, la última página válida (si no, null). */
function paginaCorregida(pagina: number, total: number): number | null {
  const ultima = Math.max(1, Math.ceil(total / INFORMES_POR_PAGINA));
  return pagina > ultima ? ultima : null;
}

type ResultadoPagina = { clave: string; informes: InformeGeneral[]; total: number };

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ListaInformes() {
  const { cargando, sesion } = useSesion(true);
  const { esMaster, esObservador, perfil } = usePerfil();
  const enLinea = useEnLinea();
  const locales = useLiveQuery(
    () => db.informes.where("estado_sync").notEqual("sincronizado").toArray(),
    []
  );
  // Avance de la subida ("3 de 7"): cada archivo queda con su ruta al terminar de subirse.
  const avanceSubida = useLiveQuery(async () => {
    const ids = (locales ?? []).filter((i) => i.estado_sync === "subiendo_imagenes").map((i) => i.id);
    const avance = new Map<string, string>();
    if (ids.length === 0) return avance;
    const archivos = await db.archivos.where("informe_id").anyOf(ids).toArray();
    for (const id of ids) {
      const delInforme = archivos.filter((a) => a.informe_id === id);
      if (delInforme.length) avance.set(id, `${delInforme.filter((a) => a.url).length} de ${delInforme.length}`);
    }
    return avance;
  }, [locales]);
  // Página del servidor (30 informes) y la consulta (página + filtros) a la que corresponde.
  const [resultado, setResultado] = useState<ResultadoPagina | null>(null);
  const [falloClave, setFalloClave] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [remotosCargados, setRemotosCargados] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [actualizando, setActualizando] = useState(false);
  const [errorActualizacion, setErrorActualizacion] = useState<string | null>(null);
  const [resaltadoId, setResaltadoId] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(true);

  const [esPc, setEsPc] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [reintentoTecnicos, setReintentoTecnicos] = useState(0);
  const falloTecnicosRef = useRef(false);
  const uidSesion = sesion?.user.id ?? null;
  const [tecnicosGuardadosDe, setTecnicosGuardadosDe] = useState<string | null>(null);
  if (uidSesion && tecnicosGuardadosDe !== uidSesion) {
    setTecnicosGuardadosDe(uidSesion);
    const guardados = leerTecnicosGuardados(uidSesion);
    if (guardados.length) setTecnicos((actuales) => (actuales.length ? actuales : guardados));
  }
  const [clientes, setClientes] = useState<ClienteL[]>([]);

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState("");

  // Los filtros se aplican en el servidor sobre TODOS los informes.
  const numeroFiltro = numeroDeFiltro(filtroNumero);
  const clienteFiltro = filtroCliente.trim();
  const claveConsulta = JSON.stringify([pagina, numeroFiltro, filtroFecha, clienteFiltro, filtroTecnico, filtroEquipo]);
  const filtrosServidor: FiltrosListado = {
    numero: numeroFiltro,
    fecha: filtroFecha,
    cliente: clienteFiltro,
    tecnicoId: filtroTecnico,
    tipoEquipo: filtroEquipo,
  };
  const primeraConsultaHecha = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const act = () => setEsPc(mq.matches);
    act();
    mq.addEventListener("change", act);
    return () => mq.removeEventListener("change", act);
  }, []);

  // Sugerencias del filtro Cliente: búsqueda en el servidor con espera (no se descarga la cartera completa).
  useEffect(() => {
    let activo = true;
    const t = window.setTimeout(() => {
      const pedido = clienteFiltro
        ? buscarClientes(clienteFiltro, 20)
        : Promise.resolve(leerCacheClientes().slice(0, 20));
      void pedido
        .then((lista) => {
          if (activo) setClientes(lista.map((c) => ({ id: c.id, nombre: c.nombre })));
        })
        .catch(() => {
          /* ignorar: sin sugerencias */
        });
    }, 350);
    return () => {
      activo = false;
      window.clearTimeout(t);
    };
  }, [clienteFiltro]);

  useEffect(() => {
    if (!online) return;
    let activo = true;
    (async () => {
      try {
        const porId = new Map<string, Tecnico>();

        try {
          const res = await conLimite(fetchAutenticado("/api/tecnicos"), 8000);
          if (res.ok) {
            const body = (await res.json()) as { tecnicos?: { id: string; nombre: string | null; apellido: string | null }[] };
            for (const t of body.tecnicos ?? []) {
              porId.set(t.id, { id: t.id, nombre: t.nombre, apellido: t.apellido, rol: "tecnico" });
            }
          }
        } catch (e) {
          console.warn("[lista] no se pudo listar técnicos por API:", e);
        }

        if (porId.size === 0) {
          try {
            const { data } = await conLimite(supabase()
              .from("perfiles")
              .select("id, email, nombre, apellido, rol"), 8000);
            for (const t of (data ?? []) as (Tecnico & { email?: string | null })[]) {
              porId.set(t.id, { ...t, nombre: t.nombre ?? t.email ?? null });
            }
          } catch {
            /* ignorar */
          }
        }

        falloTecnicosRef.current = porId.size === 0;
        if (!activo || porId.size === 0) return; // si falló se conserva lo guardado
        const lista = [...porId.values()];
        setTecnicos(lista);
        try {
          const { data: sesionActual } = await supabase().auth.getSession();
          const uid = sesionActual.session?.user.id;
          if (uid) localStorage.setItem(claveTecnicos(uid), JSON.stringify(lista));
        } catch {
          /* sin almacenamiento: solo se pierde el atajo */
        }
      } finally {
        if (activo) setCargandoTecnicos(false);
      }
    })();
    // Si no se pudieron traer, se reintenta al volver la app a primer plano.
    const alVolver = () => {
      if (document.visibilityState === "visible" && falloTecnicosRef.current) setReintentoTecnicos((n) => n + 1);
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [online, reintentoTecnicos]);

  async function actualizar() {
    if (actualizando) return;
    setActualizando(true);
    setErrorActualizacion(null);
    try {
      if (!(await intentarSync())) {
        throw new Error("No se pudo completar la sincronización antes de actualizar.");
      }
      const clave = claveConsulta;
      const r = await listarRemotos(pagina, filtrosServidor);
      await db.transaction(
        "rw",
        [
          db.informes,
          db.valores_motocompresor,
          db.valores_compresor,
          db.valores_vehiculos,
          db.valores_secadores,
          db.valores_grupo_electrogeno,
          db.archivos,
          db.blobs,
          db.eliminados,
        ],
        async () => {
          // Solo se descartan las copias locales de informes ya sincronizados
          // (se vuelven a bajar del servidor). Borradores y pendientes NUNCA se
          // borran acá.
          const conservar = new Set(
            (await db.informes.filter((i) => i.estado_sync !== "sincronizado").primaryKeys()).map(String)
          );
          const sincronizados = (await db.informes.toCollection().primaryKeys())
            .map(String)
            .filter((informeId) => !conservar.has(informeId));
          await db.informes.bulkDelete(sincronizados);
          for (const tabla of [db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno]) {
            const claves = (await tabla.toCollection().primaryKeys()).map(String);
            await tabla.bulkDelete(claves.filter((clave) => !conservar.has(clave)));
          }
          const archivosDescartables = await db.archivos.filter((a) => !conservar.has(a.informe_id)).primaryKeys();
          await db.archivos.bulkDelete(archivosDescartables);
          await db.blobs.bulkDelete(archivosDescartables);
          const eliminadosDescartables = await db.eliminados.filter((e) => !conservar.has(e.informe_id)).primaryKeys();
          await db.eliminados.bulkDelete(eliminadosDescartables);
        }
      );
      setResultado({ clave, ...r });
      setFalloClave(null);
      const corregida = paginaCorregida(pagina, r.total);
      if (corregida !== null) setPagina(corregida);
      if (r.informes.length > 0) {
        const id = r.informes[0].id;
        setResaltadoId(id);
        window.setTimeout(() => setResaltadoId(null), 2800);
      }
    } catch (error) {
      setErrorActualizacion(error instanceof Error ? error.message : "No se pudo actualizar la lista.");
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

  // Trae (y refresca) solo la página actual con los filtros actuales.
  useEffect(() => {
    if (cargando || !sesion || !online) return;
    let activo = true;
    let ultimo = 0;
    const filtros: FiltrosListado = {
      numero: numeroFiltro,
      fecha: filtroFecha,
      cliente: clienteFiltro,
      tecnicoId: filtroTecnico,
      tipoEquipo: filtroEquipo,
    };
    const refrescar = () => {
      const ahora = Date.now();
      if (ahora - ultimo < 2000) return;
      ultimo = ahora;
      void listarRemotos(pagina, filtros).then((r) => {
        if (!activo) return;
        setResultado({ clave: claveConsulta, ...r });
        setFalloClave(null);
        const corregida = paginaCorregida(pagina, r.total);
        if (corregida !== null) setPagina(corregida);
      }).catch((error) => {
        console.error("[lista] No se pudieron actualizar los informes:", error);
        if (activo) setFalloClave(claveConsulta);
      }).finally(() => {
        if (activo) setRemotosCargados(true);
      });
    };
    // La primera vez se consulta al instante; al cambiar filtros o página se
    // espera un momento (mientras se escribe no se consulta en cada tecla).
    const t = window.setTimeout(refrescar, primeraConsultaHecha.current ? 350 : 0);
    primeraConsultaHecha.current = true;
    window.addEventListener("verdu-sync", refrescar);
    window.addEventListener("focus", refrescar);
    const onVis = () => { if (document.visibilityState === "visible") refrescar(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      activo = false;
      window.clearTimeout(t);
      window.removeEventListener("verdu-sync", refrescar);
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [cargando, sesion, online, pagina, numeroFiltro, filtroFecha, clienteFiltro, filtroTecnico, filtroEquipo, claveConsulta]);

  // Aviso para el tutorial: la lista terminó su primera carga.
  const primeraCargaLista = !cargando && !!locales && (!online || !sesion || remotosCargados);
  useEffect(() => {
    if (!primeraCargaLista) return;
    marcarListaCargada(true);
    return () => marcarListaCargada(false);
  }, [primeraCargaLista]);

  if (cargando || !locales) return <PantallaCarga mensaje="Cargando informes..." />;

  const resultadoVigente = resultado?.clave === claveConsulta ? resultado : null;
  // Mientras llega otra página o filtro se sigue viendo lo anterior (atenuado).
  const cargandoPagina = online && !!sesion && !resultadoVigente && falloClave !== claveConsulta;
  const falloPagina = online && !resultadoVigente && falloClave === claveConsulta;
  const remotosVisibles = resultadoVigente?.informes ?? (cargandoPagina ? resultado?.informes ?? [] : []);
  const totalServidor = resultadoVigente?.total ?? (cargandoPagina ? resultado?.total ?? 0 : 0);
  const totalPaginas = Math.max(1, Math.ceil(totalServidor / INFORMES_POR_PAGINA));

  const pendientesLocales = locales.filter((l) =>
    l.estado_sync !== "sincronizado" && (esMaster || esObservador || l.estado_firma !== "firmado" || !l.listo_para_enviar)
  );

  // Borradores y pendientes viven en el equipo: se filtran acá (con los mismos
  // criterios que el servidor) y se muestran siempre en la página 1.
  const clienteFiltroMin = clienteFiltro.toLowerCase();
  const localesFiltrados = pendientesLocales.filter((inf) => {
    if (numeroFiltro !== null && inf.numero_registro !== numeroFiltro) return false;
    if (filtroFecha && diaArgentina(inf.fecha_hora) !== filtroFecha) return false;
    if (clienteFiltroMin && !(inf.cliente_nombre || "").toLowerCase().includes(clienteFiltroMin)) return false;
    if (filtroTecnico && inf.tecnico_id !== filtroTecnico) return false;
    if (filtroEquipo && inf.tipo_equipo !== filtroEquipo) return false;
    return true;
  });
  const idsLocales = new Set(pendientesLocales.map((l) => l.id));

  const informesMap = new Map<string, InformeGeneral>();
  if (online) {
    // La copia local (con cambios sin subir) reemplaza a la del servidor.
    for (const r of remotosVisibles) if (!idsLocales.has(r.id)) informesMap.set(r.id, r);
  }
  if (pagina === 1 || !online) {
    for (const l of localesFiltrados) informesMap.set(l.id, l);
  }
  const esBorradorLocal = (inf: InformeGeneral) => inf.estado_sync !== "sincronizado" && !inf.listo_para_enviar;
  const informes = [...informesMap.values()].sort((a, b) => {
    // Los borradores van primero (el más reciente arriba).
    const borradorA = esBorradorLocal(a);
    const borradorB = esBorradorLocal(b);
    if (borradorA !== borradorB) return borradorA ? -1 : 1;
    if (borradorA && borradorB) return (b.actualizado_en ?? "").localeCompare(a.actualizado_en ?? "");
    const numeroA = a.numero_registro ?? -1;
    const numeroB = b.numero_registro ?? -1;
    if (numeroA !== numeroB) return numeroB - numeroA;
    return b.fecha_hora.localeCompare(a.fecha_hora);
  });

  const tecnicoNombre = new Map<string, string>();
  for (const t of tecnicos) {
    tecnicoNombre.set(t.id, t.nombre || t.apellido ? `${t.nombre ?? ""} ${t.apellido ?? ""}`.trim() : t.id.slice(0, 8));
  }
  // Sin conexión la lista de técnicos no se puede pedir: los informes propios
  // muestran el nombre de la cuenta (guardado en el celular), no el id.
  const miUid = sesion?.user.id;
  const miNombre = `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim() || perfil?.email;
  if (miUid && miNombre && (!tecnicoNombre.has(miUid) || tecnicoNombre.get(miUid) === miUid.slice(0, 8))) {
    tecnicoNombre.set(miUid, miNombre);
  }
  // Técnicos que figuran en informes pero no tienen perfil: igual se pueden filtrar.
  const opcionesTecnico = [...tecnicos];
  for (const inf of informes) {
    if (inf.tecnico_id && !tecnicoNombre.has(inf.tecnico_id) && !opcionesTecnico.some((t) => t.id === inf.tecnico_id)) {
      opcionesTecnico.push({ id: inf.tecnico_id, nombre: null, apellido: null, rol: "tecnico" });
    }
  }

  function nombreTecnico(id: string | null): string {
    if (!id) return "—";
    return tecnicoNombre.get(id) ?? (online && cargandoTecnicos ? "…" : id.slice(0, 8));
  }

  const etiquetaTipo = new Map(TIPOS_EQUIPO.map((t) => [t.value as string, t.label]));

  const tieneFiltros = !!(filtroNumero.trim() || filtroFecha || clienteFiltro || filtroTecnico || filtroEquipo);
  // Total: lo del servidor + lo creado en este equipo que todavía no subió.
  const totalMostrado = online
    ? totalServidor + localesFiltrados.filter((l) => l.numero_registro === null).length
    : informes.length;

  function irAPagina(n: number) {
    setPagina(Math.min(Math.max(1, n), totalPaginas));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpiarFiltros() {
    setFiltroNumero("");
    setFiltroFecha("");
    setFiltroCliente("");
    setFiltroTecnico("");
    setFiltroEquipo("");
    setPagina(1);
  }

  const filtroBarClass = "filter-control bg-surface-container-low/60 border border-outline-variant rounded-lg px-2 py-1.5 text-[13px] h-[32px] w-full focus:outline-none focus:ring-2 focus:ring-primary";

  // Con conexión, mientras llega la primera respuesta del servidor se muestran
  // tarjetas de carga en vez de "sin informes" (evita el salto visual).
  if (informes.length === 0 && !tieneFiltros && online && sesion && !remotosCargados) {
    return (
      <div className="mx-4 md:mx-0 mt-sm space-y-sm" role="status" aria-label="Cargando informes">
        {[0, 1, 2].map((i) => (
          <div key={i} className="esqueleto-tarjeta rounded-lg border border-outline-variant bg-white p-md shadow-sm" style={{ "--item-delay": `${i * 90}ms` } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              <span className="esqueleto h-4 w-32 rounded" />
              <span className="esqueleto h-3 w-16 rounded" />
            </div>
            <span className="esqueleto mt-3 block h-4 w-3/4 rounded" />
            <span className="esqueleto mt-2 block h-3 w-1/2 rounded" />
            <div className="mt-3 flex gap-2">
              <span className="esqueleto h-4 w-20 rounded-full" />
              <span className="esqueleto h-4 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (informes.length === 0 && !tieneFiltros && pagina === 1 && !cargandoPagina && !falloPagina) {
    return (
      <div>
         <div className="mx-4 md:mx-0 my-sm p-xl bg-white border border-outline-variant rounded-lg text-center">
        <div className="flex items-center justify-center mb-md">
          <LogoTipo className="estado-vacio-logo w-14 h-14 rounded-2xl opacity-90" />
        </div>
        <p className="mb-md text-body-md text-on-surface-variant">Todavía no hay informes cargados.</p>
        <div className="flex flex-wrap items-center justify-center gap-sm">
          <a
            href="#/informe/nuevo"
            className="inline-flex items-center gap-1.5 whitespace-nowrap bg-gradient-to-b from-primary to-primary-container text-on-primary rounded-lg px-5 py-2.5 text-title-md font-title-md font-bold uppercase tracking-wider shadow-lg shadow-primary/40 hover:brightness-110 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <Icono nombre="add" className="w-[18px] h-[18px]" />
            Crear informe
          </a>
          {online ? (
            <button
              type="button"
              onClick={actualizar}
              data-tutorial="actualizar"
              disabled={actualizando}
              className="inline-block border border-outline-variant rounded px-md py-1.5 text-title-md font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
            >
               Actualizar
            </button>
          ) : null}
        </div>
      </div>
      </div>
    );
  }

  const panelFiltros =
    esPc ? (
      <div className="rounded-lg border border-outline-variant bg-white p-3 shadow-sm space-y-2">
       <div className="my-3 sm:my-sm flex items-center justify-between">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Número</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 000123"
              value={filtroNumero}
              onChange={(e) => { setFiltroNumero(e.target.value); setPagina(1); }}
              className={filtroBarClass}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Fecha</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => { setFiltroFecha(e.target.value); setPagina(1); }}
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
              onChange={(e) => { setFiltroCliente(e.target.value); setPagina(1); }}
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
              onChange={(e) => { setFiltroTecnico(e.target.value); setPagina(1); }}
              className={filtroBarClass}
            >
              <option value="">Todos</option>
              {opcionesTecnico.map((t) => (
                <option key={t.id} value={t.id}>
                  {tecnicoNombre.get(t.id) ?? t.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-on-surface-variant block mb-0.5">Equipo</label>
            <select
              value={filtroEquipo}
              onChange={(e) => { setFiltroEquipo(e.target.value); setPagina(1); }}
              className={filtroBarClass}
            >
              <option value="">Todos</option>
              {TIPOS_EQUIPO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="mx-4 md:mx-0 space-y-sm">
      {descargandoId ? (
        <div id={`pdf-download-${descargandoId}`} className="pdf-download-host pdf-download-mode" aria-hidden="true">
          <VistaPdfInforme
            id={descargandoId}
            modoDescarga
            downloadRootId={`pdf-download-${descargandoId}`}
            onDescargaTerminada={() => setDescargandoId(null)}
          />
        </div>
      ) : null}
      {errorActualizacion ? (
        <div className="rounded-lg border border-error bg-error-container px-3 py-2 text-[12px] text-error">
          No se pudo actualizar. Los datos locales se conservaron. {errorActualizacion}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-on-surface-variant hidden md:block">
          {totalMostrado} informe{totalMostrado === 1 ? "" : "s"}
          {tieneFiltros ? " (filtrado)" : ""}
        </p>
        <button
          type="button"
          onClick={actualizar}
              data-tutorial="actualizar"
          disabled={actualizando || !online}
           className={`my-2 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider border border-outline-variant rounded px-3 py-2 active:scale-95 transition-all duration-300 ${
            actualizando
              ? "opacity-50 cursor-not-allowed"
              : online
                 ? "text-primary hover:bg-surface-container-low hover:-translate-y-0.5 hover:shadow-sm"
                : "opacity-50 cursor-not-allowed"
          }`}
        >
           {actualizando ? (
             <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Actualizando" />
           ) : null}
           Actualizar
        </button>
      </div>

      {panelFiltros}

      {falloPagina ? (
        <div className="rounded-lg border border-error bg-error-container px-3 py-2 text-[12px] text-error">
          No se pudieron traer los informes del servidor. Revisá la conexión y tocá Actualizar.
        </div>
      ) : null}

      {informes.length === 0 && cargandoPagina ? (
        <div className="p-lg bg-white border border-outline-variant rounded-lg text-center" role="status">
          <p className="text-body-lg text-on-surface-variant">Buscando informes…</p>
        </div>
      ) : null}

      {informes.length === 0 && tieneFiltros && !cargandoPagina && !falloPagina ? (
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
      <div className={`hidden lg:block overflow-x-auto transition-opacity ${cargandoPagina ? "opacity-60" : ""}`} aria-busy={cargandoPagina}>
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
               <th className="px-3 py-2 font-bold text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
             {informes.map((inf, index) => {
              const tipo = etiquetaTipo.get(inf.tipo_equipo) ?? inf.tipo_equipo;
              const esLocal = idsLocales.has(inf.id);
              const sync = esLocal ? badgeSync(inf, enLinea, avanceSubida?.get(inf.id)) : null;
              const esBorradorPc = esLocal && !inf.listo_para_enviar;
              return (
                <tr
                  key={inf.id}
                  data-tutorial={index === 0 ? "informe" : undefined}
                    className={`${resaltadoId === inf.id ? "animate-[reportHighlight_2.8s_ease-out]" : "hover:bg-surface-container-low active:bg-surface-container-high"} list-item-in transition-all duration-300 cursor-pointer`}
                  style={{ "--item-delay": `${Math.min(index, 8) * 55}ms` } as React.CSSProperties}
                  onClick={() => { window.location.hash = esObservador ? `#/informe/${encodeURIComponent(inf.id)}/pdf` : `#/informe/${encodeURIComponent(inf.id)}`; }}
                >
                  <td className="px-3 py-2 text-primary font-bold whitespace-nowrap">
                    {formatNumero(inf.numero_registro)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatoFecha(inf.fecha_hora)}</td>
                  <td className="px-3 py-2 truncate max-w-[170px] xl:max-w-[260px]" title={inf.cliente_nombre || undefined}>{inf.cliente_nombre || "Sin cliente"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-on-surface-variant">
                    {nombreTecnico(inf.tecnico_id)}
                  </td>
                  <td className="px-3 py-2 min-w-[8rem] leading-snug">{tipo}</td>
                   <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase transition-colors duration-500 ${estadoFirmaClase(inf)}`}>
                      {inf.estado_firma === "firmado" ? "Firmado" : "Sin firma"}
                    </span>
                  </td>
                  <td data-tutorial={index === 0 ? "estado" : undefined} className="px-3 py-2 whitespace-nowrap">
                    {sync ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase transition-colors duration-500 ${sync.clase}`}>
                        {sync.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">—</span>
                     )}
                    {esLocal && inf.error_sync && (inf.estado_sync === "error" || esBorradorPc) ? (
                      <div className="mt-1 max-w-[220px] whitespace-normal">
                        <p className="text-[12px] leading-snug text-error" title={inf.error_sync}>
                          {mensajeErrorSync(inf.error_sync)}
                        </p>
                        {inf.estado_sync === "error" ? (
                          <button
                            type="button"
                            className="mt-1 min-h-[40px] rounded border border-primary px-3 text-[12px] font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-white active:scale-95 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              intentarSync();
                            }}
                          >
                            Reintentar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                   </td>
                    <td className="px-3 py-2 text-right xl:whitespace-nowrap">
                      <div data-tutorial={index === 0 ? "pdf" : undefined} className="flex flex-col items-end justify-end gap-1 xl:flex-row xl:items-center">
                        {esBorradorPc ? (
                          <button
                            type="button"
                            title="Descartar borrador"
                            aria-label="Descartar borrador"
                            className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded text-error hover:bg-error-container active:scale-95 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("¿Descartar este borrador? Se borran los datos y fotos cargados en este equipo que no se enviaron.")) {
                                void descartarBorrador(inf.id);
                              }
                            }}
                          >
                            <Icono nombre="delete" className="h-[17px] w-[17px]" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={descargandoId !== null}
                          className="inline-flex items-center gap-1 rounded border border-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-white active:scale-95 transition-all disabled:cursor-wait disabled:opacity-60"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDescargandoId(inf.id);
                          }}
                        >
                          {descargandoId === inf.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
                          {descargandoId === inf.id ? "Generando…" : "Descargar"}
                        </button>
                        <a
                          href={`#/informe/${encodeURIComponent(inf.id)}/pdf`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center rounded border border-primary px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-white active:scale-95 transition-all"
                        >
                          Vista PDF
                        </a>
                      </div>
                   </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className={`space-y-sm lg:hidden transition-opacity ${cargandoPagina ? "opacity-60" : ""}`} aria-busy={cargandoPagina}>
         {informes.map((inf, index) => {
          const tipo = etiquetaTipo.get(inf.tipo_equipo) ?? inf.tipo_equipo;
          const esLocal = idsLocales.has(inf.id);
          const sync = esLocal ? badgeSync(inf, enLinea, avanceSubida?.get(inf.id)) : null;
          const esBorrador = esLocal && !inf.listo_para_enviar;
          const fecha = formatoFecha(inf.fecha_hora);
          return (
             <div
               key={inf.id}
               data-tutorial={index === 0 ? "informe" : undefined}
               role="link"
               tabIndex={0}
               onClick={() => { window.location.hash = esObservador ? `#/informe/${encodeURIComponent(inf.id)}/pdf` : `#/informe/${encodeURIComponent(inf.id)}`; }}
               onKeyDown={(e) => {
                 if (e.key === "Enter" || e.key === " ") {
                   e.preventDefault();
                    window.location.hash = esObservador ? `#/informe/${encodeURIComponent(inf.id)}/pdf` : `#/informe/${encodeURIComponent(inf.id)}`;
                 }
               }}
                  className={`block bg-white border border-outline-variant rounded-lg p-md shadow-sm hover:-translate-y-1 hover:bg-surface-container-low hover:shadow-md active:scale-[0.99] transition-all duration-300 list-item-in ${inf.estado_sync === "error" ? "report-card-error" : inf.estado_sync !== "sincronizado" ? "report-card-pending" : ""} ${resaltadoId === inf.id ? "animate-[reportHighlight_2.8s_ease-out]" : ""}`}
                  style={{ "--item-delay": `${Math.min(index, 8) * 55}ms` } as React.CSSProperties}
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
                Técnico: {nombreTecnico(inf.tecnico_id)}
              </p>
              <div data-tutorial={index === 0 ? "estado" : undefined} className="flex gap-xs mt-sm">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase transition-colors duration-500 ${estadoFirmaClase(inf)}`}>
                  {inf.estado_firma === "firmado" ? "Firmado por cliente" : "Sin firma de cliente"}
                </span>
                {sync ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase transition-colors duration-500 ${sync.clase}`}>
                    {sync.label}
                  </span>
                ) : null}
              </div>
               {esLocal && (inf.estado_sync === "error" || (esBorrador && inf.error_sync)) ? (
                <div className="mt-xs">
                  {inf.error_sync ? (
                    <p className="text-[13px] leading-snug text-error break-words" title={inf.error_sync}>
                      {mensajeErrorSync(inf.error_sync)}
                    </p>
                  ) : null}
                  {inf.estado_sync === "error" ? (
                    <button
                      type="button"
                      className="mt-xs min-h-[40px] rounded border border-primary px-4 text-[12px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        intentarSync();
                      }}
                    >
                      Reintentar
                    </button>
                  ) : null}
                </div>
               ) : null}
                <div data-tutorial={index === 0 ? "pdf" : undefined} className="mt-sm flex justify-end gap-1">
                  {esBorrador ? (
                    <button
                      type="button"
                      className="mr-auto inline-flex items-center rounded px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-error active:scale-95 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("¿Descartar este borrador? Se borran los datos y fotos cargados en este celular que no se enviaron.")) {
                          void descartarBorrador(inf.id);
                        }
                      }}
                    >
                      Descartar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={descargandoId !== null}
                    className="inline-flex items-center gap-1 rounded border border-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all disabled:cursor-wait disabled:opacity-60"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDescargandoId(inf.id);
                    }}
                  >
                    {descargandoId === inf.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
                    {descargandoId === inf.id ? "Generando…" : "Descargar"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center rounded border border-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.hash = `#/informe/${encodeURIComponent(inf.id)}/pdf`;
                   }}
                 >
                    Vista PDF
                 </button>
               </div>
              </div>
          );
        })}
      </div>

      {online && totalServidor > 0 ? (
        <nav aria-label="Páginas de informes" className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => irAPagina(pagina - 1)}
            disabled={pagina <= 1}
            className="min-h-[40px] rounded border border-outline-variant px-3 text-[12px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <p className="text-center text-[12px] font-bold text-on-surface-variant">
            Página {Math.min(pagina, totalPaginas)} de {totalPaginas}
            <span className="block text-[11px] font-normal">
              {totalMostrado} informe{totalMostrado === 1 ? "" : "s"}
              {tieneFiltros ? " (filtrado)" : ""}
            </span>
          </p>
          <button
            type="button"
            onClick={() => irAPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
            className="min-h-[40px] rounded border border-outline-variant px-3 text-[12px] font-bold uppercase tracking-wider text-primary active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </nav>
      ) : null}
    </div>
  );
}

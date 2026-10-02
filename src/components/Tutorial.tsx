"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { navegar } from "@/lib/hashRuta";
import { usePerfil } from "@/lib/usePerfil";
import {
  enviarPendientes,
  marcarVisto,
  pedirRepasoInforme,
  terminarRecorrido,
  useRecorridoActivo,
  type Recorrido,
} from "@/lib/tutorial";

type Paso = { objetivo: string; titulo: string; texto: string };

// Cada paso apunta a un elemento marcado con data-tutorial="...". Si ese
// elemento no está en pantalla (p. ej. ESTADÍSTICAS para un técnico, o todavía
// no hay informes), el paso se saltea solo.
const PASOS: Record<Recorrido, Paso[]> = {
  lista: [
    { objetivo: "nuevo", titulo: "Nuevo informe", texto: "Tocá acá para empezar un informe nuevo." },
    { objetivo: "informe", titulo: "Tus informes", texto: "Cada informe de la lista. Tocalo para abrirlo o seguir cargándolo." },
    { objetivo: "estado", titulo: "Estado del informe", texto: "Borrador: todavía no lo enviaste. Subiendo: se está subiendo. Sincronizado: ya está guardado en el sistema." },
    { objetivo: "pdf", titulo: "PDF del informe", texto: "Descargá el PDF para compartirlo, o miralo tal como queda impreso." },
    { objetivo: "actualizar", titulo: "Actualizar", texto: "Trae los informes más recientes." },
    { objetivo: "estadisticas", titulo: "Estadísticas", texto: "Gráficos de informes por mes, técnico y equipo." },
    { objetivo: "menu", titulo: "Tu cuenta", texto: "Tus datos, cambiar contraseña, modo oscuro, cerrar sesión y volver a ver este tutorial." },
  ],
  informe: [
    { objetivo: "cliente", titulo: "Cliente", texto: "Escribí el nombre y elegí el cliente de la lista: se completan solos el nombre y el teléfono." },
    { objetivo: "categoria", titulo: "Categoría de equipo", texto: "Elegí el tipo de equipo. Según la categoría cambian los controles a completar." },
    { objetivo: "valores", titulo: "Valores funcionales", texto: "Completá cada control. El color te indica si está bien (verde), mal (rojo) o fuera de rango (amarillo)." },
    { objetivo: "fotos", titulo: "Fotos", texto: "Elegí primero la categoría. Tomá una foto con la cámara o elegí varias de la galería." },
    { objetivo: "firmas", titulo: "Firmas", texto: "Firma del técnico y del cliente, con el dedo." },
    { objetivo: "enviar", titulo: "Enviar", texto: "Cuando termines, tocá Enviar. Si falta algo, te lleva al campo que falta. Sin señal, se sube solo cuando vuelve la conexión." },
    { objetivo: "volver", titulo: "Salir cuando quieras", texto: "Podés salir cuando quieras: lo cargado queda guardado como borrador." },
  ],
};

function buscar(objetivo: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-tutorial="${objetivo}"]`)).find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

type Caja = { top: number; left: number; width: number; height: number };

export function Tutorial({ uid }: { uid: string | null }) {
  const activo = useRecorridoActivo();
  const { esObservador } = usePerfil();
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [indice, setIndice] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [altoCartel, setAltoCartel] = useState(190);
  const cartelRef = useRef<HTMLDivElement>(null);

  // Sube a la cuenta lo marcado sin conexión (al abrir y al volver la señal).
  useEffect(() => {
    if (!uid) return;
    void enviarPendientes(uid);
    const alConectar = () => void enviarPendientes(uid);
    window.addEventListener("online", alConectar);
    return () => window.removeEventListener("online", alConectar);
  }, [uid]);

  // El observador no puede abrir la carga de informes: un repaso pedido que
  // quedó pendiente no tiene adónde seguir y se descarta.
  useEffect(() => {
    if (esObservador) pedirRepasoInforme(false);
  }, [esObservador]);

  // Al iniciar un recorrido se arma la lista con los pasos que aplican.
  const [recorridoPrevio, setRecorridoPrevio] = useState(activo);
  if (activo !== recorridoPrevio) {
    setRecorridoPrevio(activo);
    setIndice(0);
    setCaja(null);
    setPasos(activo ? PASOS[activo.recorrido].filter((p) => buscar(p.objetivo)) : []);
  }

  const paso = pasos[indice];

  const medir = useCallback(() => {
    if (!paso) return;
    const el = buscar(paso.objetivo);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCaja({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [paso]);

  useLayoutEffect(() => {
    if (!paso) return;
    const el = buscar(paso.objetivo);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(medir, 380);
    return () => window.clearTimeout(t);
  }, [paso, medir]);

  useEffect(() => {
    if (!paso) return;
    let pendiente = false;
    const alMover = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; medir(); });
    };
    window.addEventListener("resize", alMover);
    window.addEventListener("scroll", alMover, true);
    return () => {
      window.removeEventListener("resize", alMover);
      window.removeEventListener("scroll", alMover, true);
    };
  }, [paso, medir]);

  const finalizar = useCallback((salteado: boolean) => {
    if (!activo) return;
    const { recorrido, repaso } = activo;
    terminarRecorrido();
    if (repaso) {
      // Repaso desde el menú: después de la pantalla principal sigue el informe
      // (el observador no carga informes: para él termina acá).
      if (!salteado && recorrido === "lista" && !esObservador) {
        pedirRepasoInforme(true);
        navegar("#/informe/nuevo");
      } else {
        pedirRepasoInforme(false);
        if (recorrido === "informe") navegar("#/");
      }
      return;
    }
    if (uid) void marcarVisto(uid, salteado ? ["lista", "informe"] : [recorrido]);
  }, [activo, uid, esObservador]);

  useEffect(() => {
    if (!activo) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") finalizar(true);
      else if (e.key === "ArrowRight") setIndice((i) => Math.min(i + 1, pasos.length - 1));
      else if (e.key === "ArrowLeft") setIndice((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [activo, finalizar, pasos.length]);

  // Si la pantalla todavía no tiene ninguno de los elementos, no se muestra
  // (y NO se da por visto: se intenta la próxima vez).
  useEffect(() => {
    if (activo && pasos.length === 0) terminarRecorrido();
  }, [activo, pasos.length]);

  // Alto real del cartel (depende del texto) para ubicarlo siempre dentro de la pantalla.
  useLayoutEffect(() => {
    if (cartelRef.current) setAltoCartel(cartelRef.current.offsetHeight);
  }, [indice, paso]);

  if (!activo || !paso) return null;

  const margen = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const ancho = Math.min(330, vw - 24);
  // Debajo del elemento si entra; si no, arriba; si el elemento ocupa toda la
  // pantalla, el cartel va abajo de todo (siempre dentro de la vista).
  let cartelTop: number;
  if (!caja) cartelTop = (vh - altoCartel) / 2;
  else {
    const debajo = caja.top + caja.height + margen + 12;
    const arriba = caja.top - margen - 12 - altoCartel;
    if (debajo + altoCartel <= vh - 12) cartelTop = debajo;
    else if (arriba >= 12) cartelTop = arriba;
    else cartelTop = vh - altoCartel - 16;
  }
  cartelTop = Math.max(12, Math.min(cartelTop, vh - altoCartel - 12));
  const cartelLeft = caja ? Math.min(Math.max(12, caja.left + caja.width / 2 - ancho / 2), vw - ancho - 12) : (vw - ancho) / 2;
  const ultimo = indice === pasos.length - 1;

  return (
    <div className="tutorial fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* Captura los toques: durante el tutorial no se puede usar la app de fondo. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {caja ? (
        <div
          className="tutorial-foco pointer-events-none absolute rounded-xl"
          style={{ top: caja.top - margen, left: caja.left - margen, width: caja.width + margen * 2, height: caja.height + margen * 2 }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}
      <div
        key={indice}
        ref={cartelRef}
        className="tutorial-cartel absolute rounded-2xl bg-white p-4 text-on-surface shadow-2xl"
        style={{ top: cartelTop, left: cartelLeft, width: ancho }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {indice + 1} de {pasos.length}
        </p>
        <p className="mt-0.5 text-[15px] font-bold text-primary">{paso.titulo}</p>
        <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">{paso.texto}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => finalizar(true)} className="px-1 py-1.5 text-[12px] font-bold text-on-surface-variant hover:text-on-surface">
            Saltar tutorial
          </button>
          <div className="flex gap-1.5">
            {indice > 0 ? (
              <button type="button" onClick={() => setIndice((i) => i - 1)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] font-bold text-on-surface-variant active:scale-95">
                Anterior
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (ultimo ? finalizar(false) : setIndice((i) => i + 1))}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-[12px] font-bold text-on-primary shadow-sm active:scale-95"
            >
              {ultimo ? "Terminar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

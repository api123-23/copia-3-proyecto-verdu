"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useSesion } from "@/lib/useSesion";
import { supabase } from "@/lib/supabase";

function clavePerfil(uid: string): string {
  return `air-power-perfil-${uid}`;
}

function leerPerfilCache(uid: string): PerfilActual {
  if (typeof window === "undefined") return null;
  try {
    const cache = JSON.parse(window.localStorage.getItem(clavePerfil(uid)) ?? "null") as { uid?: string; perfil?: PerfilActual } | null;
    return cache?.uid === uid ? cache.perfil ?? null : null;
  } catch {
    return null;
  }
}

export type PerfilActual = {
  rol: "tecnico" | "admin" | "master";
  email: string | null;
  nombre: string | null;
  apellido: string | null;
} | null;

// ---------- Almacén compartido (uno solo para toda la app) ----------
// Antes cada componente que usaba usePerfil() pedía el perfil por su cuenta
// (~10 pedidos iguales por ingreso). Ahora hay UN pedido en curso y UN
// resultado por usuario, compartido por todos los componentes suscriptos.

type EstadoPerfil = { uid: string | null; perfil: PerfilActual; cargando: boolean };

// Estado inicial / del servidor: igual al comportamiento anterior (sin perfil y cargando).
const ESTADO_INICIAL: EstadoPerfil = { uid: null, perfil: null, cargando: true };

let estado: EstadoPerfil = ESTADO_INICIAL;
// Ya se asignó un uid activo (aunque sea null tras cerrar sesión).
let inicializado = false;
const oyentes = new Set<() => void>();
// Usuario cuyo perfil ya se refrescó desde el servidor en esta carga de la app.
let uidRefrescado: string | null = null;
// Pedido en curso (compartido) y número de generación para descartar respuestas viejas.
let pedidoEnCurso: { uid: string; promesa: Promise<void> } | null = null;
let generacion = 0;

function emitir(nuevo: EstadoPerfil) {
  estado = nuevo;
  for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function leerEstado(): EstadoPerfil {
  return estado;
}

function leerEstadoServidor(): EstadoPerfil {
  return ESTADO_INICIAL;
}

/** Cambia el usuario activo: primero muestra lo guardado en el celular (instantáneo). */
function activarUid(uid: string | null) {
  if (inicializado && estado.uid === uid) return;
  inicializado = true;
  generacion++;
  pedidoEnCurso = null;
  uidRefrescado = null;
  if (!uid) {
    emitir({ uid: null, perfil: null, cargando: false });
    return;
  }
  const cache = leerPerfilCache(uid);
  emitir({ uid, perfil: cache, cargando: !cache });
}

/** Pide el perfil al servidor; si ya hay un pedido en curso para ese uid, lo reutiliza. */
function pedirPerfil(uid: string, emailSesion: string | null): Promise<void> {
  if (pedidoEnCurso && pedidoEnCurso.uid === uid) return pedidoEnCurso.promesa;
  const miGeneracion = ++generacion;
  const vigente = () => miGeneracion === generacion && estado.uid === uid;
  const promesa = (async () => {
    try {
      const { data } = await supabase()
        .from("perfiles")
        .select("rol, email, nombre, apellido")
        .eq("id", uid)
        .maybeSingle();
      if (!vigente()) return;
      if (data) {
        const nuevoPerfil = {
          rol: data.rol === "master" ? "master" : data.rol === "admin" ? "admin" : "tecnico",
          email: data.email || emailSesion || null,
          nombre: data.nombre ?? null,
          apellido: data.apellido ?? null,
        } satisfies NonNullable<PerfilActual>;
        try {
          window.localStorage.setItem(clavePerfil(uid), JSON.stringify({ uid, perfil: nuevoPerfil }));
        } catch {
          /* almacenamiento lleno o bloqueado: se sigue con el perfil en memoria */
        }
        uidRefrescado = uid;
        emitir({ uid, perfil: nuevoPerfil, cargando: false });
      } else {
        // Sin fila (o error del servidor): se conserva lo guardado, como antes.
        // No se marca como refrescado: el próximo montaje vuelve a intentar.
        emitir({ uid, perfil: estado.perfil, cargando: false });
      }
    } catch {
      // Sin conexión: queda el perfil guardado; se reintenta en el próximo montaje.
      if (!vigente()) return;
      emitir({ uid, perfil: estado.perfil, cargando: false });
    } finally {
      // Solo se libera si nadie lanzó otro pedido después (p. ej. refrescar()).
      if (miGeneracion === generacion && pedidoEnCurso?.uid === uid) pedidoEnCurso = null;
    }
  })();
  pedidoEnCurso = { uid, promesa };
  return promesa;
}

/** Asegura que el almacén corresponda al uid y que se haya refrescado una vez. */
function asegurarPerfil(uid: string | null, emailSesion: string | null) {
  activarUid(uid);
  if (uid && uidRefrescado !== uid) void pedirPerfil(uid, emailSesion);
}

export function usePerfil(): {
  perfil: PerfilActual;
  cargando: boolean;
  esAdmin: boolean;
  esMaster: boolean;
  esObservador: boolean;
  refrescar: () => void;
} {
  const { sesion } = useSesion(false);
  const uid = sesion?.user?.id ?? null;
  const emailSesion = sesion?.user?.email ?? null;
  const compartido = useSyncExternalStore(suscribir, leerEstado, leerEstadoServidor);

  useEffect(() => {
    asegurarPerfil(uid, emailSesion);
  }, [uid, emailSesion]);

  const refrescar = useCallback(() => {
    if (!uid) return;
    activarUid(uid);
    // Fuerza un pedido nuevo aunque haya uno en curso; actualiza a todos.
    pedidoEnCurso = null;
    void pedirPerfil(uid, emailSesion);
  }, [uid, emailSesion]);

  // Mientras el almacén todavía no tomó el uid de esta sesión se muestra el
  // mismo estado inicial que antes (sin perfil, cargando).
  const vigente = compartido !== ESTADO_INICIAL && compartido.uid === uid;
  const perfil = vigente ? compartido.perfil : null;
  const cargando = vigente ? compartido.cargando : true;

  return {
    perfil,
    cargando,
    esAdmin: perfil?.rol === "admin",
    esMaster: perfil?.rol === "master",
    esObservador: perfil?.rol === "admin",
    refrescar,
  };
}

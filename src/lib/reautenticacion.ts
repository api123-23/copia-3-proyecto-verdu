"use client";

import { useSyncExternalStore } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { db } from "./db";
import { supabase } from "./supabase";

// Sin conexión se trabaja con la sesión guardada. Con conexión se valida contra
// el servidor: si la sesión ya no sirve se pide solo la contraseña, sin cerrar
// la app ni borrar lo cargado en el celular.

const ULTIMO_LOGIN_KEY = "air-power-ultimo-login";
// Aunque la sesión siga válida, cada tanto se confirma la contraseña para que
// un celular perdido no quede con acceso indefinido.
const DIAS_REVALIDAR = 30;

export const EVENTO_VERIFICAR_SESION = "verdu-verificar-sesion";

/** Pide a la app que revise la sesión (p. ej. el servidor rechazó una subida). */
export function pedirVerificacionSesion(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_VERIFICAR_SESION));
}

export type EstadoSesion = "verificando" | "ok" | "sin_conexion" | "vencida";

type UltimoLogin = { uid: string; email: string; at: number };

let estado: EstadoSesion = "verificando";
const oyentes = new Set<() => void>();
let verificacionEnCurso: Promise<EstadoSesion> | null = null;

function emitir(nuevo: EstadoSesion) {
  if (estado === nuevo) return;
  estado = nuevo;
  for (const oyente of oyentes) oyente();
}

export function estadoSesionActual(): EstadoSesion {
  return estado;
}

export function useEstadoSesion(): EstadoSesion {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    () => estado,
    () => "verificando"
  );
}

export function leerUltimoLogin(): UltimoLogin | null {
  if (typeof window === "undefined") return null;
  try {
    const dato = JSON.parse(window.localStorage.getItem(ULTIMO_LOGIN_KEY) ?? "null") as UltimoLogin | null;
    return dato && typeof dato.uid === "string" && typeof dato.at === "number" ? dato : null;
  } catch {
    return null;
  }
}

function guardarUltimoLogin(dato: UltimoLogin) {
  try {
    window.localStorage.setItem(ULTIMO_LOGIN_KEY, JSON.stringify(dato));
  } catch {
    /* almacenamiento lleno o bloqueado: no impide trabajar */
  }
}

export async function contarPendientes(): Promise<number> {
  return db.informes.filter((informe) => informe.estado_sync !== "sincronizado").count().catch(() => 0);
}

/**
 * Llamar después de un ingreso con contraseña exitoso. Si el celular tiene
 * informes sin subir de otro usuario, se rechaza el ingreso (se cierra la
 * sesión recién abierta) y se devuelve el email de la cuenta correcta.
 */
export async function registrarIngreso(uid: string, email: string): Promise<{ ok: true } | { ok: false; emailCorrecto: string; pendientes: number }> {
  const anterior = leerUltimoLogin();
  if (anterior && anterior.uid !== uid) {
    const pendientes = await contarPendientes();
    if (pendientes > 0) {
      await supabase().auth.signOut({ scope: "local" }).catch(() => undefined);
      return { ok: false, emailCorrecto: anterior.email, pendientes };
    }
  }
  guardarUltimoLogin({ uid, email, at: Date.now() });
  emitir("ok");
  return { ok: true };
}

function hayRed(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function evaluar(): Promise<EstadoSesion> {
  if (!hayRed()) return "sin_conexion";
  const { data } = await supabase().auth.getSession();
  if (!data.session) return "vencida";

  // getUser consulta al servidor: detecta credenciales revocadas o vencidas
  // que getSession (solo local) no ve.
  const { data: usuario, error } = await supabase().auth.getUser();
  if (error) {
    if (isAuthRetryableFetchError(error) || !hayRed()) return "sin_conexion";
    return "vencida";
  }
  if (!usuario.user) return "vencida";

  const ultimo = leerUltimoLogin();
  if (!ultimo || ultimo.uid !== usuario.user.id) {
    // Sesiones abiertas antes de esta versión: se toman como recién validadas
    // para no pedir contraseña a todos el día de la actualización.
    guardarUltimoLogin({ uid: usuario.user.id, email: usuario.user.email ?? "", at: Date.now() });
    return "ok";
  }
  const dias = (Date.now() - ultimo.at) / 86_400_000;
  return dias > DIAS_REVALIDAR ? "vencida" : "ok";
}

export function verificarSesion(): Promise<EstadoSesion> {
  if (verificacionEnCurso) return verificacionEnCurso;
  verificacionEnCurso = evaluar()
    .catch((): EstadoSesion => (hayRed() ? "vencida" : "sin_conexion"))
    .then((resultado) => {
      // "sin_conexion" nunca pisa un "vencida" ya detectado: se sigue pidiendo
      // la contraseña cuando vuelva la señal.
      if (!(resultado === "sin_conexion" && estado === "vencida")) emitir(resultado);
      return resultado;
    })
    .finally(() => {
      verificacionEnCurso = null;
    });
  return verificacionEnCurso;
}

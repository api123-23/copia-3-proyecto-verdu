"use client";

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

// Tutorial de primer uso. Se registra que ya se vio en DOS lugares:
//  - en el celular (localStorage), para decidir al instante y sin conexión;
//  - en la cuenta (perfiles), para que no reaparezca si se borran los datos
//    del navegador, se reinstala la app o se cambia de celular.
// Regla: ante cualquier duda (sin conexión, error, base sin actualizar) NO se muestra.

export type Recorrido = "lista" | "informe";

const COLUMNA: Record<Recorrido, string> = {
  lista: "tutorial_lista_visto_en",
  informe: "tutorial_informe_visto_en",
};
const claveLocal = (uid: string, r: Recorrido) => `air-power-tutorial-${r}-${uid}`;
const clavePendiente = (uid: string) => `air-power-tutorial-pendiente-${uid}`;

function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, valor);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** true solo si se confirmó (celular o cuenta) que el usuario NUNCA lo vio. */
export async function debeMostrarse(uid: string, recorrido: Recorrido): Promise<boolean> {
  if (leer(claveLocal(uid, recorrido))) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const { data, error } = await supabase()
      .from("perfiles")
      .select(COLUMNA[recorrido])
      .eq("id", uid)
      .maybeSingle();
    if (error || !data) return false;
    const valor = (data as unknown as Record<string, string | null>)[COLUMNA[recorrido]];
    if (valor) {
      escribir(claveLocal(uid, recorrido), valor);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Marca como visto en el celular al instante y en la cuenta (reintenta si no hay señal). */
export async function marcarVisto(uid: string, recorridos: Recorrido[]): Promise<void> {
  const ahora = new Date().toISOString();
  for (const r of recorridos) escribir(claveLocal(uid, r), ahora);
  const pendientes = new Set<Recorrido>([...(JSON.parse(leer(clavePendiente(uid)) ?? "[]") as Recorrido[]), ...recorridos]);
  escribir(clavePendiente(uid), JSON.stringify([...pendientes]));
  await enviarPendientes(uid);
}

/** Sube a la cuenta lo marcado sin conexión. Llamar al iniciar y al recuperar señal. */
export async function enviarPendientes(uid: string): Promise<void> {
  const pendientes = JSON.parse(leer(clavePendiente(uid)) ?? "[]") as Recorrido[];
  if (!pendientes.length || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  const cambios: Record<string, string> = {};
  for (const r of pendientes) cambios[COLUMNA[r]] = leer(claveLocal(uid, r)) ?? new Date().toISOString();
  try {
    const { error } = await supabase().from("perfiles").update(cambios).eq("id", uid);
    if (!error) escribir(clavePendiente(uid), null);
  } catch {
    /* se reintenta la próxima vez */
  }
}

// ---- Estado del recorrido en curso (lo dibuja <Tutorial />) ----
type Activo = { recorrido: Recorrido; repaso: boolean } | null;
let activo: Activo = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function iniciarRecorrido(recorrido: Recorrido, repaso = false) {
  activo = { recorrido, repaso };
  avisar();
}
export function terminarRecorrido() {
  activo = null;
  avisar();
}
export function useRecorridoActivo(): Activo {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => activo,
    () => null
  );
}

// Repaso pedido desde el menú: la pantalla principal y después el informe.
const CLAVE_REPASO = "air-power-tutorial-repaso";
export function pedirRepasoInforme(pedir: boolean) {
  try {
    if (pedir) sessionStorage.setItem(CLAVE_REPASO, "1");
    else sessionStorage.removeItem(CLAVE_REPASO);
  } catch {
    /* sin almacenamiento de sesión */
  }
}
export function repasoInformePendiente(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_REPASO) === "1";
  } catch {
    return false;
  }
}

// ---- La lista de informes terminó su primera carga ----
// El recorrido de la pantalla principal espera a que la lista termine de cargar
// (sin esto arrancaba sobre las tarjetas de carga, salteaba los pasos del
// informe y quedaba marcado como visto sin haberse mostrado completo).
let listaCargada = false;
const oyentesLista = new Set<() => void>();
export function marcarListaCargada(cargada: boolean) {
  if (listaCargada === cargada) return;
  listaCargada = cargada;
  oyentesLista.forEach((o) => o());
}
export function useListaCargada(): boolean {
  return useSyncExternalStore(
    (o) => {
      oyentesLista.add(o);
      return () => oyentesLista.delete(o);
    },
    () => listaCargada,
    () => false
  );
}

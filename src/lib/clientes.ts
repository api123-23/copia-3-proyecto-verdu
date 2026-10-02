"use client";

import { supabase } from "@/lib/supabase";

/**
 * Búsqueda de clientes sin descargar la cartera completa (PostgREST corta en
 * 1000 filas por pedido) y copia local acotada para buscar sin conexión.
 */

export type ClienteOpcion = {
  id: string;
  nombre: string;
  telefono: string | null;
};

/**
 * Misma clave que usaba el editor cuando guardaba la lista completa: se sigue
 * leyendo ese arreglo (formato idéntico) y al escribir se recorta a los más recientes.
 */
export const CLIENTES_CACHE_KEY = "air-power-clientes";
/** Tope de clientes guardados en el dispositivo (los vistos/usados más recientemente). */
export const MAX_CLIENTES_CACHE = 500;

export const normalizarTexto = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Escapa los comodines de LIKE (% _ \) para buscar el texto literal. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, "\\$&");
}

function esCliente(x: unknown): x is ClienteOpcion {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return typeof c.id === "string" && typeof c.nombre === "string";
}

/** Clientes guardados en el dispositivo (más recientes primero). Nunca lanza. */
export function leerCacheClientes(): ClienteOpcion[] {
  if (typeof window === "undefined") return [];
  try {
    const d = JSON.parse(window.localStorage.getItem(CLIENTES_CACHE_KEY) ?? "[]");
    if (!Array.isArray(d)) return [];
    return d.filter(esCliente).map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono ?? null }));
  } catch {
    return [];
  }
}

/**
 * Suma clientes vistos/usados al principio de la copia local (sin duplicados por id)
 * y la recorta a MAX_CLIENTES_CACHE para que no crezca sin límite.
 */
export function recordarClientes(nuevos: ClienteOpcion[]): void {
  if (typeof window === "undefined" || nuevos.length === 0) return;
  try {
    const vistos = new Set<string>();
    const lista: ClienteOpcion[] = [];
    for (const c of [...nuevos, ...leerCacheClientes()]) {
      if (!esCliente(c) || vistos.has(c.id)) continue;
      vistos.add(c.id);
      lista.push({ id: c.id, nombre: c.nombre, telefono: c.telefono ?? null });
      if (lista.length >= MAX_CLIENTES_CACHE) break;
    }
    window.localStorage.setItem(CLIENTES_CACHE_KEY, JSON.stringify(lista));
  } catch {
    /* sin espacio o almacenamiento bloqueado: se sigue sin copia */
  }
}

/** Filtra una lista en memoria (sin acentos; también por teléfono si hay 3+ dígitos). */
export function filtrarClientes(lista: ClienteOpcion[], texto: string, limite = 20): ClienteOpcion[] {
  const t = normalizarTexto(texto);
  if (!t) return [];
  const digitos = t.replace(/\D/g, "");
  return lista
    .map((c) => ({ c, n: normalizarTexto(c.nombre), tel: (c.telefono ?? "").replace(/\D/g, "") }))
    .filter(({ n, tel }) => n.includes(t) || (digitos.length >= 3 && tel.includes(digitos)))
    .sort((a, b) => Number(b.n.startsWith(t)) - Number(a.n.startsWith(t)) || a.n.localeCompare(b.n))
    .slice(0, limite)
    .map(({ c }) => c);
}

/** Búsqueda en la copia local (para usar sin conexión). */
export function buscarClientesLocal(texto: string, limite = 20): ClienteOpcion[] {
  return filtrarClientes(leerCacheClientes(), texto, limite);
}

/**
 * Busca clientes por nombre en el servidor (ilike %texto%, orden por nombre, con límite).
 * Sin conexión o si falla el pedido, busca en la copia local. Los resultados del
 * servidor se guardan en la copia local para poder encontrarlos después sin conexión.
 */
export async function buscarClientes(texto: string, limite = 20): Promise<ClienteOpcion[]> {
  const t = texto.trim();
  if (!t) return [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return buscarClientesLocal(t, limite);
  try {
    const { data, error } = await supabase()
      .from("clientes")
      .select("id, nombre, telefono")
      .ilike("nombre", `%${escaparLike(t)}%`)
      .order("nombre", { ascending: true })
      .order("id", { ascending: true })
      .limit(limite);
    if (error) throw error;
    const remotos = ((data ?? []) as unknown[]).filter(esCliente).map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono ?? null }));
    if (remotos.length < limite) quitarObsoletos(t, new Set(remotos.map((c) => c.id)));
    recordarClientes(remotos);
    // Primero los que empiezan con el texto, como en la búsqueda local.
    const tl = t.toLowerCase();
    return remotos.sort((a, b) => Number(b.nombre.toLowerCase().startsWith(tl)) - Number(a.nombre.toLowerCase().startsWith(tl)));
  } catch {
    return buscarClientesLocal(t, limite);
  }
}

/**
 * Si el servidor devolvió TODAS las coincidencias (menos que el límite), los clientes
 * guardados que coinciden igual pero no vinieron fueron borrados: se quitan de la copia.
 */
function quitarObsoletos(texto: string, vigentes: Set<string>): void {
  try {
    const t = texto.toLowerCase();
    const actual = leerCacheClientes();
    const limpia = actual.filter((c) => vigentes.has(c.id) || !c.nombre.toLowerCase().includes(t));
    if (limpia.length !== actual.length) window.localStorage.setItem(CLIENTES_CACHE_KEY, JSON.stringify(limpia));
  } catch {
    /* sin almacenamiento: nada que limpiar */
  }
}

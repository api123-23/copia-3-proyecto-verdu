"use client";

// Antes de recargar la app (al actualizar de versión o si falta un archivo de
// la app) se le pide al editor que guarde lo cargado, y se espera a que termine
// (como mucho unos segundos, para no dejar la app colgada).
export const EVENTO_GUARDAR_ANTES_DE_RECARGAR = "verdu-guardar-antes-de-recargar";

export type EsperarGuardado = (guardado: Promise<unknown>) => void;

export async function recargarGuardando(): Promise<void> {
  const guardados: Promise<unknown>[] = [];
  window.dispatchEvent(
    new CustomEvent<EsperarGuardado>(EVENTO_GUARDAR_ANTES_DE_RECARGAR, { detail: (g) => guardados.push(g) })
  );
  await Promise.race([Promise.allSettled(guardados), new Promise((r) => setTimeout(r, 3000))]);
  window.location.reload();
}

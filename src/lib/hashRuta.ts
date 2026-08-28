import { useEffect, useState } from "react";

export function useHash(): string {
  const [hash, setHash] = useState(() =>
    typeof window !== "undefined" ? window.location.hash : ""
  );

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return hash;
}

export function navegar(hash: string) {
  const limpio = hash.replace(/^#/, "");
  if (`#${window.location.hash}`.replace(/^#/, "") === limpio) return;
  window.location.hash = limpio;
}

export type Ruta =
  | { tipo: "lista" }
  | { tipo: "nuevo" }
  | { tipo: "informe"; id: string };

export function parsearRuta(hash: string): Ruta {
  const h = hash.replace(/^#/, "");
  const mInforme = h.match(/^\/informe\/(.+)$/);
  if (mInforme) return { tipo: "informe", id: decodeURIComponent(mInforme[1]) };
  if (h === "/informe/nuevo") return { tipo: "nuevo" };
  return { tipo: "lista" };
}
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
  const actual = window.location.hash.replace(/^#/, "");
  if (actual === limpio) return;
  window.location.hash = limpio;
}

export type Ruta =
  | { tipo: "lista" }
  | { tipo: "nuevo" }
  | { tipo: "informe"; id: string }
  | { tipo: "pdf"; id: string }
  | { tipo: "admin" }
  | { tipo: "clientes" };

export function parsearRuta(hash: string): Ruta {
  const h = hash.replace(/^#/, "");
  if (/^\/clientes\/?$/.test(h)) return { tipo: "clientes" };
  if (/^\/admin\/?$/.test(h)) return { tipo: "admin" };
  if (/^\/informe\/nuevo\/?$/.test(h)) return { tipo: "nuevo" };
  const mPdf = h.match(/^\/informe\/(.+?)\/pdf\/?$/);
  if (mPdf) return { tipo: "pdf", id: decodeURIComponent(mPdf[1]) };
  const mInforme = h.match(/^\/informe\/(.+?)\/?$/);
  if (mInforme) return { tipo: "informe", id: decodeURIComponent(mInforme[1]) };
  return { tipo: "lista" };
}

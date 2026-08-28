"use client";

import { useEffect } from "react";

export default function RedirectNuevo() {
  useEffect(() => {
    if (window.location.hash === "#/informe/nuevo") return;
    window.location.replace("/#/informe/nuevo");
  }, []);

  return <p className="p-margin text-on-surface-variant">Redirigiendo...</p>;
}
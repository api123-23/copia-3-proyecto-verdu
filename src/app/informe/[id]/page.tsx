"use client";

import { useEffect } from "react";

export default function RedirectInforme() {
  useEffect(() => {
    const id = window.location.pathname.replace(/^\/informe\//, "");
    if (window.location.hash === `#/informe/${id}`) return;
    window.location.replace(`/#/informe/${encodeURIComponent(id)}`);
  }, []);

  return <p className="p-margin text-on-surface-variant">Redirigiendo...</p>;
}
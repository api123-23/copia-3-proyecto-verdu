"use client";

import { useEffect } from "react";

/** Marca el documento cuando hay scroll para dar sombra a la cabecera fija. */
export function EfectoScroll() {
  useEffect(() => {
    let pendiente = false;
    const actualizar = () => {
      pendiente = false;
      document.documentElement.classList.toggle("con-scroll", window.scrollY > 4);
    };
    const alScroll = () => {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(actualizar);
    };
    actualizar();
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("hashchange", actualizar);
    return () => {
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("hashchange", actualizar);
    };
  }, []);
  return null;
}

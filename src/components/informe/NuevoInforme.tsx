"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { crearInforme } from "@/lib/informes";
import { navegar } from "@/lib/hashRuta";
import { EditorInforme } from "./EditorInforme";

export function NuevoInforme() {
  const { sesion, cargando } = useSesion(true);
  const [id, setId] = useState<string | null>(null);
  const creado = useRef(false);

  useEffect(() => {
    if (creado.current || cargando || !sesion) return;
    creado.current = true;
    const informe = crearInforme(sesion.user.id);
    sessionStorage.setItem("verdu-nuevo", JSON.stringify(informe));
    navegar(`#/informe/${encodeURIComponent(informe.id)}`);
    setId(informe.id);
  }, [cargando, sesion]);

  if (!id) {
    return <p className="p-margin text-on-surface-variant">Creando informe...</p>;
  }

  return <EditorInforme id={id} />;
}
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/useSesion";
import { crearInforme, guardarBorrador, valoresVacios } from "@/lib/informes";

export default function NuevoInformePage() {
  const router = useRouter();
  const { sesion, cargando } = useSesion(true);
  const creado = useRef(false);

  useEffect(() => {
    if (creado.current || cargando || !sesion) return;
    creado.current = true;
    const informe = crearInforme(sesion.user.id);
    void guardarBorrador(informe, valoresVacios()).then(() =>
      router.replace(`/informe/${informe.id}`)
    );
  }, [router, cargando, sesion]);

  return <p className="p-margin text-on-surface-variant">Creando informe...</p>;
}

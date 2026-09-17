"use client";

import { useSesion } from "@/lib/useSesion";
import { useHash, parsearRuta } from "@/lib/hashRuta";
import { ListaInformes } from "@/components/ListaInformes";
import { EditorInforme } from "@/components/informe/EditorInforme";
import { VistaPdfInforme } from "@/components/informe/VistaPdfInforme";
import { NuevoInforme } from "@/components/informe/NuevoInforme";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { PantallaCarga } from "@/components/PantallaCarga";
import { AvisoSyncActivo } from "@/components/AvisoSyncActivo";
import { MenuPerfil } from "@/components/MenuPerfil";
import { PanelAdmin } from "@/components/PanelAdmin";
import { GestionClientes } from "@/components/GestionClientes";
import { Estadisticas } from "@/components/Estadisticas";
import { usePerfil } from "@/lib/usePerfil";

export default function Home() {
  const { cargando, sesion } = useSesion(true);
  const { esAdmin } = usePerfil();
  const hash = useHash();
  const ruta = parsearRuta(hash);

  if (cargando || !sesion) {
    return <PantallaCarga mensaje="Cargando..." />;
  }

  return (
    <>
      <AvisoSyncActivo />
      {ruta.tipo === "admin" ? (
        <PanelAdmin />
      ) : ruta.tipo === "clientes" ? (
        <GestionClientes />
      ) : ruta.tipo === "nuevo" ? (
        <NuevoInforme />
      ) : ruta.tipo === "informe" ? (
        <EditorInforme id={ruta.id} />
      ) : ruta.tipo === "pdf" ? (
        <VistaPdfInforme id={ruta.id} />
      ) : ruta.tipo === "estadisticas" ? (
        <Estadisticas />
      ) : (
        <div
          className="pb-xl"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
          }}
        >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center gap-2 px-3 sm:px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <LogoTipo className="w-7 h-7 rounded-lg" />
          <h1 className="truncate text-[13px] sm:text-title-md font-title-md font-bold tracking-tight">
            Air Power S.A.
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {esAdmin ? (
            <a
              href="#/estadisticas"
              className="flex h-10 items-center text-[10px] sm:text-label-caps font-label-caps font-bold tracking-wider bg-white/10 text-on-primary px-2 sm:px-4 rounded-lg shadow-sm hover:bg-white/20 hover:shadow-md active:scale-95 transition-all"
            >
              ESTADÍSTICAS
            </a>
          ) : null}
          <a
            href="#/informe/nuevo"
             className="flex h-10 items-center gap-1.5 text-[10px] sm:text-label-caps font-label-caps font-bold tracking-wider bg-gradient-to-br from-white to-sky-100 text-primary px-2 sm:px-4 rounded-lg shadow-lg shadow-black/30 ring-1 ring-white/50 hover:brightness-105 hover:shadow-xl hover:scale-[1.03] active:scale-95 transition-all"
          >
            <Icono nombre="add" className="w-[17px] h-[17px]" />
            NUEVO
          </a>
          <MenuPerfil sesion={sesion} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
         <ListaInformes />
      </main>
        </div>
      )}
    </>
  );
}

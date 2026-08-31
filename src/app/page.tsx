"use client";

import { useSesion } from "@/lib/useSesion";
import { useHash, parsearRuta } from "@/lib/hashRuta";
import { ListaInformes } from "@/components/ListaInformes";
import { EditorInforme } from "@/components/informe/EditorInforme";
import { NuevoInforme } from "@/components/informe/NuevoInforme";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { PantallaCarga } from "@/components/PantallaCarga";
import { AvisoSyncActivo } from "@/components/AvisoSyncActivo";
import { MenuPerfil } from "@/components/MenuPerfil";
import { PanelAdmin } from "@/components/PanelAdmin";

export default function Home() {
  const { cargando, sesion } = useSesion(true);
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
      ) : ruta.tipo === "nuevo" ? (
        <NuevoInforme />
      ) : ruta.tipo === "informe" ? (
        <EditorInforme id={ruta.id} />
      ) : (
        <div
          className="pb-xl"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
          }}
        >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-2">
          <LogoTipo className="w-7 h-7 rounded-lg" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Informes Técnicos
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <a
            href="#/informe/nuevo"
            className="flex items-center gap-1 text-label-caps font-label-caps font-bold tracking-wider hover:bg-primary-container active:scale-95 transition-all px-3 py-1.5 rounded"
          >
            <Icono nombre="add" className="w-[16px] h-[16px]" />
            NUEVO
          </a>
          <MenuPerfil sesion={sesion} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
        <div className="bg-white border-b border-outline-variant px-md py-1 flex items-center justify-between mb-md shadow-sm">
          <span className="flex items-center gap-2 text-title-md font-title-md font-bold text-primary">
            <LogoTipo className="w-5 h-5 rounded" />
            AIR POWER S.A.
          </span>
        </div>
        <ListaInformes />
      </main>
        </div>
      )}
    </>
  );
}
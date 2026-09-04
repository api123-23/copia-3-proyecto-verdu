"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import {
  CAMPO_LABELS,
  CAMPO_LABELS_GE,
  CAMPOS_GE,
  CAMPOS_POR_TIPO,
  cargarAnexa,
  cargarAnexaGE,
  formatNumero,
  TIPOS_EQUIPO,
  valoresVaciosGE,
} from "@/lib/informes";
import type { ArchivoLocal, InformeGeneral, InformeGrupoElectrogeno, TipoEquipo, ValoresBase } from "@/lib/types";
import { PantallaCarga } from "@/components/PantallaCarga";

const CATEGORIAS: Record<string, string> = {
  inicial: "Estado Inicial",
  desarrollo: "Desarrollo",
  repuestos: "Repuestos",
  final: "Estado Final",
  falla: "Falla",
};

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (valor === true) return "Sí";
  if (valor === false) return "No";
  const etiquetas: Record<string, string> = {
    si: "Sí",
    no: "No",
    ok: "Ok",
    mal: "Mal",
    bajo: "Bajo",
    alta: "Alta",
    alto: "Alto",
    baja: "Baja",
    optimo: "Óptimo",
  };
  return etiquetas[String(valor)] ?? String(valor);
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nombreEquipo(tipo: TipoEquipo): string {
  return TIPOS_EQUIPO.find((x) => x.value === tipo)?.label ?? tipo;
}

function Bloque({ titulo, children, clase = "" }: { titulo: string; children: ReactNode; clase?: string }) {
  return (
    <section className={`pdf-bloque ${clase}`}>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  return (
    <div className="pdf-fila">
      <span>{etiqueta}</span>
      <strong>{texto(valor)}</strong>
    </div>
  );
}

function TablaValores({ valores, tipo }: { valores: ValoresBase; tipo: TipoEquipo }) {
  const campos = CAMPOS_POR_TIPO[tipo];
  if (campos.length === 0) return null;
  return (
    <div className="pdf-tabla-valores">
      {campos.map((campo) => (
        <Fila key={campo} etiqueta={CAMPO_LABELS[campo]} valor={valores[campo]} />
      ))}
    </div>
  );
}

function TablaGE({ valores }: { valores: InformeGrupoElectrogeno }) {
  const detenidos = CAMPOS_GE.filter((campo) => campo.startsWith("ge_motor_detenido_"));
  const funcionamiento = CAMPOS_GE.filter((campo) => campo.startsWith("ge_funcionamiento_"));
  return (
    <div className="pdf-ge-grid">
      <div>
        <h3>Verificar con motor detenido</h3>
        {detenidos.map((campo) => (
          <Fila key={campo} etiqueta={CAMPO_LABELS_GE[campo]} valor={valores[campo]} />
        ))}
      </div>
      <div>
        <h3>Verificaciones de funcionamiento</h3>
        {funcionamiento.map((campo) => (
          <Fila key={campo} etiqueta={CAMPO_LABELS_GE[campo]} valor={valores[campo]} />
        ))}
      </div>
    </div>
  );
}

function ArchivoVisual({ archivo, titulo }: { archivo: ArchivoLocal; titulo: string }) {
  const blob = useLiveQuery(() => db.blobs.get(archivo.id), [archivo.id]);
  const [remota, setRemota] = useState<string | null>(null);
  useEffect(() => {
    if (blob || remota || !archivo.url) return;
    let activo = true;
    supabase().storage.from("informe-archivos").createSignedUrl(archivo.url, 3600).then(({ data }) => {
      if (activo && data?.signedUrl) setRemota(data.signedUrl);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [archivo.url, blob, remota]);
  const url = useMemo(() => blob ? URL.createObjectURL(blob.blob) : remota, [blob, remota]);
  useEffect(() => () => { if (blob && url) URL.revokeObjectURL(url); }, [blob, url]);
  if (!url) return <div className="pdf-archivo-vacio">Imagen no disponible</div>;
  return (
    <figure className="pdf-foto">
      <img src={url} alt={titulo} />
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}

function Cabecera({ informe, grupo }: { informe: InformeGeneral; grupo: boolean }) {
  return (
    <header className="pdf-cabecera">
      <div className="pdf-marca">
        <img src="/icons/icon-192.png" alt="Air Power" />
        <div>
          <strong>AIR POWER S.A.</strong>
          <small>Servicio técnico</small>
        </div>
      </div>
      <div className="pdf-titulo">
        <h1>{grupo ? "MANTENIMIENTO DE GENERADORES" : "INFORME TÉCNICO"}</h1>
        <p>Nº {formatNumero(informe.numero_registro)}</p>
      </div>
      <div className="pdf-fecha">
        <span>Fecha</span>
        <strong>{fecha(informe.fecha_hora)}</strong>
      </div>
    </header>
  );
}

function DatosGenerales({ informe }: { informe: InformeGeneral }) {
  return (
    <Bloque titulo="Datos generales">
      <div className="pdf-datos-grid">
        <Fila etiqueta="Cliente / Empresa" valor={informe.cliente_nombre} />
        <Fila etiqueta="Teléfono" valor={informe.cliente_telefono} />
        <Fila etiqueta="Dirección / Ubicación" valor={informe.cliente_direccion} />
        <Fila etiqueta="Equipo" valor={nombreEquipo(informe.tipo_equipo)} />
      </div>
    </Bloque>
  );
}

function Cierre({ informe }: { informe: InformeGeneral }) {
  return (
    <>
      <div className="pdf-dos-columnas">
        <Bloque titulo="Horas trabajadas"><Fila etiqueta="Total" valor={informe.horas_trabajadas === null ? null : `${informe.horas_trabajadas} hs`} /></Bloque>
        <Bloque titulo="Estado de la máquina"><Fila etiqueta="Operativa" valor={informe.maquina_operativa} /></Bloque>
      </div>
      <Bloque titulo="Repuestos">
        <div className="pdf-textos">
          <div><strong>Del cliente</strong><p>{texto(informe.repuestos_cliente)}</p></div>
          <div><strong>De Air Power S.A.</strong><p>{texto(informe.repuestos_air_power)}</p></div>
        </div>
      </Bloque>
      {informe.requiere_cotizacion ? <Bloque titulo="Cotización"><p className="pdf-parrafo">{texto(informe.cotizacion_notas)}</p></Bloque> : null}
    </>
  );
}

function Firmas({ archivos }: { archivos: ArchivoLocal[] }) {
  const tecnico = archivos.find((x) => x.tipo === "firma_tecnico");
  const cliente = archivos.find((x) => x.tipo === "firma_cliente");
  return (
    <Bloque titulo="Firmas" clase="pdf-firmas">
      <div className="pdf-firmas-grid">
        <div><ArchivoVisual archivo={tecnico ?? { id: "firma-tecnico-vacia", informe_id: "", tipo: "firma_tecnico", categoria: null, url: null, estado_sync: "sincronizado", creado_en: "" }} titulo="Firma Técnico de Air Power S.A." /><span>Firma Técnico de AIR POWER S.A.</span></div>
        <div><ArchivoVisual archivo={cliente ?? { id: "firma-cliente-vacia", informe_id: "", tipo: "firma_cliente", categoria: null, url: null, estado_sync: "sincronizado", creado_en: "" }} titulo="Firma del cliente" /><span>Firma del Cliente o su representante</span></div>
        <div className="pdf-aclaracion"><span>Aclaración de firma</span></div>
      </div>
      <p className="pdf-conformidad">Doy conformidad y certifico que el trabajo ha sido efectuado de acuerdo a lo detallado en este informe.</p>
    </Bloque>
  );
}

function Fotos({ archivos }: { archivos: ArchivoLocal[] }) {
  const fotos = archivos.filter((x) => x.tipo === "foto");
  if (fotos.length === 0) return null;
  const paginas: ArchivoLocal[][] = [];
  for (let i = 0; i < fotos.length; i += 6) paginas.push(fotos.slice(i, i + 6));
  return (
    <>
      {paginas.map((pagina, paginaIndex) => (
        <section key={paginaIndex} className={`pdf-fotos ${paginaIndex === 0 ? "pdf-fotos-primera" : ""}`}>
          <h2>Registro fotográfico{paginaIndex > 0 ? " (continuación)" : ""}</h2>
          <div className="pdf-fotos-grid">
            {pagina.map((foto, index) => (
              <ArchivoVisual
                key={foto.id}
                archivo={foto}
                titulo={CATEGORIAS[foto.categoria ?? ""] || `Fotografía ${paginaIndex * 6 + index + 1}`}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function VistaPdfInforme({ id }: { id: string }) {
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase | null>(null);
  const [valoresGE, setValoresGE] = useState<InformeGrupoElectrogeno>(valoresVaciosGE());
  const [fallo, setFallo] = useState(false);
  const archivos = useLiveQuery(() => db.archivos.where("informe_id").equals(id).toArray(), [id]);

  useEffect(() => {
    let activo = true;
    (async () => {
      let inf = await db.informes.get(id).catch(() => undefined);
      if (!inf) {
        const { traerInformeRemoto } = await import("@/lib/remoto");
        if (await traerInformeRemoto(id).catch(() => false)) inf = await db.informes.get(id).catch(() => undefined);
      }
      if (!inf) { if (activo) setFallo(true); return; }
      const anexa = await cargarAnexa(inf.tipo_equipo, id);
      const v = { ...({} as ValoresBase), ...anexa };
      const ge = inf.tipo_equipo === "grupo_electrogeno" ? await cargarAnexaGE(id) : valoresVaciosGE();
      if (!activo) return;
      setInforme(inf);
      setValores(v);
      setValoresGE(ge);
    })();
    return () => { activo = false; };
  }, [id]);

  if (fallo) return <main className="pdf-error"><p>No se pudo cargar el informe.</p><a href="#/">Volver al listado</a></main>;
  if (!informe || !valores || !archivos) return <PantallaCarga mensaje="Preparando informe para imprimir..." />;
  const grupo = informe.tipo_equipo === "grupo_electrogeno";
  const tieneValores = grupo || CAMPOS_POR_TIPO[informe.tipo_equipo].length > 0;

  return (
    <div className="pdf-shell">
      <div className="pdf-acciones no-print">
        <a href="#/">Volver al listado</a>
        <button type="button" onClick={() => window.print()}>Imprimir</button>
      </div>
      <main className="pdf-hoja">
        <div className="pdf-contenido-principal">
          <Cabecera informe={informe} grupo={grupo} />
          <DatosGenerales informe={informe} />
          <Bloque titulo="Trabajos realizados / Observaciones">
            <p className="pdf-parrafo">{texto(informe.observaciones)}</p>
          </Bloque>
          {tieneValores ? (
            <Bloque titulo={grupo ? "Verificaciones" : "Valores funcionales"}>
              {grupo ? <TablaGE valores={valoresGE} /> : <TablaValores valores={valores} tipo={informe.tipo_equipo} />}
            </Bloque>
          ) : null}
          <Cierre informe={informe} />
          <Firmas archivos={archivos} />
        </div>
        <Fotos archivos={archivos} />
      </main>
    </div>
  );
}

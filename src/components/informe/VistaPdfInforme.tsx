"use client";

import { useEffect, useState } from "react";
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

function ArchivoVisual({ url, titulo }: { url: string | null; titulo: string }) {
  if (!url) return <div className="pdf-archivo-vacio">Imagen no disponible</div>;
  return (
    <figure className="pdf-foto">
      <img src={url} alt={titulo} data-pdf-image="true" />
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

function Firmas({ archivos, urls }: { archivos: ArchivoLocal[]; urls: Record<string, string | null> }) {
  const tecnico = archivos.find((x) => x.tipo === "firma_tecnico");
  const cliente = archivos.find((x) => x.tipo === "firma_cliente");
  return (
    <Bloque titulo="Firmas" clase="pdf-firmas">
      <div className="pdf-firmas-grid">
        <div><ArchivoVisual url={tecnico ? urls[tecnico.id] ?? null : null} titulo="Firma Técnico de Air Power S.A." /><span>Firma Técnico de AIR POWER S.A.</span></div>
        <div><ArchivoVisual url={cliente ? urls[cliente.id] ?? null : null} titulo="Firma del cliente" /><span>Firma del Cliente o su representante</span></div>
        <div className="pdf-aclaracion"><span>Aclaración de firma</span></div>
      </div>
      <p className="pdf-conformidad">Doy conformidad y certifico que el trabajo ha sido efectuado de acuerdo a lo detallado en este informe.</p>
    </Bloque>
  );
}

function Fotos({ archivos, urls }: { archivos: ArchivoLocal[]; urls: Record<string, string | null> }) {
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
                url={urls[foto.id] ?? null}
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
  const [precarga, setPrecarga] = useState<{
    clave: string;
    urls: Record<string, string | null>;
    errores: string[];
  } | null>(null);
  const archivos = useLiveQuery(() => db.archivos.where("informe_id").equals(id).toArray(), [id]);
  const claveArchivos = archivos?.map((archivo) => `${archivo.id}:${archivo.url ?? ""}`).join("|") ?? null;
  const cargandoArchivos = archivos === undefined || precarga?.clave !== claveArchivos;
  const archivosPdf = precarga?.clave === claveArchivos ? precarga.urls : {};
  const erroresArchivos = precarga?.clave === claveArchivos ? precarga.errores : [];

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

  useEffect(() => {
    if (!archivos) return;
    const listaArchivos = archivos;
    if (!claveArchivos) return;
    const clave = claveArchivos;
    let activo = true;
    const urlsTemporales: string[] = [];

    async function precargarArchivos() {
      const resultado: Record<string, string | null> = {};
      const errores: string[] = [];
      for (const archivo of listaArchivos) {
        let url: string | null = null;
        const local = await db.blobs.get(archivo.id).catch(() => undefined);
        if (local) {
          url = URL.createObjectURL(local.blob);
          urlsTemporales.push(url);
        } else if (archivo.url) {
          try {
            const descargado = await supabase().storage.from("informe-archivos").download(archivo.url);
            if (descargado.data) {
              await db.blobs.put({ id: archivo.id, blob: descargado.data }).catch(() => undefined);
              url = URL.createObjectURL(descargado.data);
              urlsTemporales.push(url);
            } else {
              const firmado = await supabase().storage.from("informe-archivos").createSignedUrl(archivo.url, 3600);
              url = firmado.data?.signedUrl ?? null;
            }
          } catch {
            url = null;
          }
        }
        if (!url && archivo.tipo === "foto") errores.push(archivo.id);
        resultado[archivo.id] = url;
      }
      if (!activo) return;
      setPrecarga({ clave, urls: resultado, errores });
    }

    void precargarArchivos();
    return () => {
      activo = false;
      for (const url of urlsTemporales) URL.revokeObjectURL(url);
    };
  }, [archivos, claveArchivos]);

  async function imprimir() {
    if (cargandoArchivos || erroresArchivos.length > 0) return;
    const imagenes = Array.from(document.querySelectorAll<HTMLImageElement>("[data-pdf-image='true']"));
    await Promise.all(imagenes.map((imagen) => {
      if (imagen.complete && imagen.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        imagen.addEventListener("load", () => resolve(), { once: true });
        imagen.addEventListener("error", () => resolve(), { once: true });
      });
    }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    window.print();
  }

  if (fallo) return <main className="pdf-error"><p>No se pudo cargar el informe.</p><a href="#/">Volver al listado</a></main>;
  if (!informe || !valores || !archivos) return <PantallaCarga mensaje="Preparando informe para imprimir..." />;
  const grupo = informe.tipo_equipo === "grupo_electrogeno";
  const tieneValores = grupo || CAMPOS_POR_TIPO[informe.tipo_equipo].length > 0;

  return (
    <div className="pdf-shell">
      <div className="pdf-acciones no-print">
        <a href="#/">Volver al listado</a>
        <button type="button" disabled={cargandoArchivos || erroresArchivos.length > 0} onClick={() => void imprimir()}>
          {cargandoArchivos ? "Preparando imágenes..." : "Imprimir"}
        </button>
      </div>
      {!cargandoArchivos && erroresArchivos.length > 0 ? (
        <p className="pdf-aviso-imagenes no-print">No se pudieron cargar todas las fotos. Revisá la conexión y reintentá.</p>
      ) : null}
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
          <Firmas archivos={archivos} urls={archivosPdf} />
        </div>
        <Fotos archivos={archivos} urls={archivosPdf} />
      </main>
    </div>
  );
}

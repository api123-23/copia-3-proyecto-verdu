"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  horometro: "Horómetro",
};

const ORDEN_FOTOS = ["inicial", "desarrollo", "repuestos", "falla", "horometro", "final"];

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
    vsd: "VSD",
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
      {/* Con cantidad impar, una celda vacía cierra el recuadro de la tabla. */}
      {campos.length % 2 === 1 ? <div className="pdf-fila" aria-hidden="true" /> : null}
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
        <Fila etiqueta="Modelo" valor={informe.modelo} />
        <Fila etiqueta="Número de serie" valor={informe.numero_serie} />
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

function Firmas({ informe, archivos, urls }: { informe: InformeGeneral; archivos: ArchivoLocal[]; urls: Record<string, string | null> }) {
  const tecnico = archivos.find((x) => x.tipo === "firma_tecnico");
  const cliente = archivos.find((x) => x.tipo === "firma_cliente");
  const aclaracion = informe.aclaracion_firma?.trim() || null;
  return (
    <Bloque titulo="Firmas" clase="pdf-firmas">
      <div className="pdf-firmas-grid">
        <div><ArchivoVisual url={tecnico ? urls[tecnico.id] ?? null : null} titulo="Firma Técnico de Air Power S.A." /><span>Firma Técnico de AIR POWER S.A.</span></div>
        <div><ArchivoVisual url={cliente ? urls[cliente.id] ?? null : null} titulo="Firma del cliente" /><span>Firma del Cliente o su representante</span></div>
        <div className="pdf-aclaracion">
          <p>{aclaracion ?? ""}</p>
          <span>Aclaración de firma</span>
        </div>
      </div>
      <p className="pdf-conformidad">Doy conformidad y certifico que el trabajo ha sido efectuado de acuerdo a lo detallado en este informe.</p>
    </Bloque>
  );
}

function Fotos({ archivos, urls }: { archivos: ArchivoLocal[]; urls: Record<string, string | null> }) {
  const fotos = archivos
    .filter((x) => x.tipo === "foto")
    .sort((a, b) => {
      const categoriaA = ORDEN_FOTOS.indexOf(a.categoria ?? "inicial");
      const categoriaB = ORDEN_FOTOS.indexOf(b.categoria ?? "inicial");
      return (categoriaA === -1 ? ORDEN_FOTOS.length : categoriaA) - (categoriaB === -1 ? ORDEN_FOTOS.length : categoriaB)
        || a.creado_en.localeCompare(b.creado_en);
    });
  if (fotos.length === 0) return null;
  const paginas: ArchivoLocal[][] = [];
  // Igual que al imprimir: 6 fotos por hoja (3 filas de 2).
  const fotosPorPagina = 6;
  for (let i = 0; i < fotos.length; i += fotosPorPagina) paginas.push(fotos.slice(i, i + fotosPorPagina));
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
                titulo={CATEGORIAS[foto.categoria ?? ""] || `Fotografía ${paginaIndex * fotosPorPagina + index + 1}`}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// html2canvas no soporta object-fit: dibuja cada imagen estirada a su caja.
// Se calcula el tamaño proporcional y se centra con padding (html2canvas pinta
// la imagen en el content-box), así se conserva el recuadro sin deformar.
function ajustarImagenesSinDeformar(raiz: HTMLElement): void {
  for (const img of Array.from(raiz.querySelectorAll<HTMLImageElement>("[data-pdf-image='true']"))) {
    if (!img.naturalWidth || !img.naturalHeight) continue;
    const estilo = getComputedStyle(img);
    const bordeX = parseFloat(estilo.borderLeftWidth) + parseFloat(estilo.borderRightWidth);
    const bordeY = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth);
    const ancho = img.offsetWidth;
    const alto = img.offsetHeight;
    const cajaAncho = ancho - bordeX;
    const cajaAlto = alto - bordeY;
    if (cajaAncho <= 0 || cajaAlto <= 0) continue;
    const proporcion = img.naturalWidth / img.naturalHeight;
    let ajusteAncho = cajaAncho;
    let ajusteAlto = cajaAncho / proporcion;
    if (ajusteAlto > cajaAlto) {
      ajusteAlto = cajaAlto;
      ajusteAncho = cajaAlto * proporcion;
    }
    img.style.boxSizing = "border-box";
    img.style.width = `${ancho}px`;
    img.style.height = `${alto}px`;
    img.style.objectFit = "fill";
    img.style.padding = `${(cajaAlto - ajusteAlto) / 2}px ${(cajaAncho - ajusteAncho) / 2}px`;
  }
}

const A4_ANCHO_MM = 210;
const A4_ALTO_MM = 297;
// Ancho de una hoja A4 en px CSS: el PDF se arma igual en celular y en PC.
const A4_ANCHO_PX = 794;

export function VistaPdfInforme({
  id,
  modoDescarga = false,
  downloadRootId,
  onDescargaTerminada,
}: {
  id: string;
  modoDescarga?: boolean;
  downloadRootId?: string;
  onDescargaTerminada?: () => void;
}) {
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
  const descargaIniciada = useRef(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      let inf = await db.informes.get(id).catch(() => undefined);
      if (!inf && (typeof navigator === "undefined" || navigator.onLine)) {
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

  const imprimir = useCallback(async () => {
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
  }, [cargandoArchivos, erroresArchivos.length]);

  useEffect(() => {
    if (!modoDescarga || descargaIniciada.current || cargandoArchivos || erroresArchivos.length === 0) return;
    descargaIniciada.current = true;
    window.alert("No se pudieron cargar todas las fotos del informe. Revisá la conexión e intentá nuevamente.");
    onDescargaTerminada?.();
  }, [cargandoArchivos, erroresArchivos.length, modoDescarga, onDescargaTerminada]);

  useEffect(() => {
    if (!modoDescarga || !fallo || descargaIniciada.current) return;
    descargaIniciada.current = true;
    window.alert("No se pudo cargar el informe para descargarlo.");
    onDescargaTerminada?.();
  }, [fallo, modoDescarga, onDescargaTerminada]);

  useEffect(() => {
    if (!modoDescarga || descargaIniciada.current || !informe || cargandoArchivos || erroresArchivos.length > 0) return;
    const root = downloadRootId ? document.getElementById(downloadRootId) : null;
    const hoja = root?.querySelector<HTMLElement>(".pdf-hoja");
    if (!hoja) return;
    descargaIniciada.current = true;
    void (async () => {
      try {
        const imagenes = Array.from(hoja.querySelectorAll<HTMLImageElement>("[data-pdf-image='true']"));
        await Promise.all(imagenes.map((imagen) => {
          if (imagen.complete && imagen.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            imagen.addEventListener("load", () => resolve(), { once: true });
            imagen.addEventListener("error", () => resolve(), { once: true });
          });
        }));
        const equipo = nombreEquipo(informe.tipo_equipo).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
        const cliente = (informe.cliente_nombre || "informe").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
        ajustarImagenesSinDeformar(hoja);
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
        // Cada hoja se dibuja por separado: una sola imagen gigante de todo el
        // informe supera el límite de memoria de los navegadores del celular.
        // Cada hoja se dibuja sola, así que 2x entra en memoria también en el
        // celular y evita que las líneas finas de los recuadros desaparezcan.
        const escala = 2;
        const paginas = Array.from(hoja.querySelectorAll<HTMLElement>(".pdf-contenido-principal, .pdf-fotos"));
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        let primera = true;
        for (const pagina of paginas) {
          const canvas = await html2canvas(pagina, {
            scale: escala,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: A4_ANCHO_PX,
            logging: false,
          });
          // Alto de una hoja A4 en px del canvas; si el contenido es más largo
          // se reparte en varias hojas.
          const altoHojaPx = Math.floor(canvas.width * (A4_ALTO_MM / A4_ANCHO_MM));
          for (let desde = 0; desde < canvas.height; desde += altoHojaPx) {
            const altoTramo = Math.min(altoHojaPx, canvas.height - desde);
            if (desde > 0 && altoTramo < altoHojaPx * 0.02) break;
            const tramo = document.createElement("canvas");
            tramo.width = canvas.width;
            tramo.height = altoTramo;
            const ctx = tramo.getContext("2d");
            if (!ctx) throw new Error("Canvas no soportado");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tramo.width, tramo.height);
            ctx.drawImage(canvas, 0, desde, canvas.width, altoTramo, 0, 0, canvas.width, altoTramo);
            if (!primera) pdf.addPage();
            primera = false;
            pdf.addImage(tramo.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_ANCHO_MM, (altoTramo / canvas.width) * A4_ANCHO_MM);
            tramo.width = 0;
            tramo.height = 0;
          }
          canvas.width = 0;
          canvas.height = 0;
        }
        pdf.save(`Informe-${formatNumero(informe.numero_registro)}-${equipo}-${cliente}.pdf`);
      } catch (error) {
        console.error("[pdf] No se pudo descargar el informe:", error);
        window.alert("No se pudo generar el PDF. Intentá nuevamente.");
      } finally {
        onDescargaTerminada?.();
      }
    })();
  }, [cargandoArchivos, downloadRootId, erroresArchivos.length, informe, modoDescarga, onDescargaTerminada]);

  if (fallo) return <main className="pdf-error"><p>No se pudo cargar el informe.</p><a href="#/">Volver al listado</a></main>;
  if (!informe || !valores || !archivos) return <PantallaCarga mensaje="Preparando informe para imprimir..." />;
  const grupo = informe.tipo_equipo === "grupo_electrogeno";
  const tieneValores = grupo || CAMPOS_POR_TIPO[informe.tipo_equipo].length > 0;

  return (
    <div className={`pdf-shell ${modoDescarga ? "" : "pdf-shell-pantalla"}`}>
      <div className="pdf-acciones no-print">
        <a href="#/">Volver al listado</a>
        <button type="button" disabled={cargandoArchivos || erroresArchivos.length > 0} onClick={() => void imprimir()}>
          {cargandoArchivos ? "Preparando imágenes..." : "Imprimir"}
        </button>
      </div>
      {!cargandoArchivos && erroresArchivos.length > 0 ? (
        <p className="pdf-aviso-imagenes no-print">No se pudieron cargar todas las fotos. Revisá la conexión y reintentá.</p>
      ) : null}
      <main className={`pdf-hoja ${grupo ? "pdf-hoja-ge" : "pdf-hoja-general"}`}>
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
          <Firmas informe={informe} archivos={archivos} urls={archivosPdf} />
        </div>
         <Fotos archivos={archivos} urls={archivosPdf} />
      </main>
    </div>
  );
}

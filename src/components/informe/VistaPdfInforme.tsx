"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, prepararBlob } from "@/lib/db";
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
    no_tiene: "No tiene",
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

// Etiquetas del PDF: dicen lo mismo que el formulario en pantalla
// (SeccionValores), sin los números de ítem. Como el PDF no muestra los
// subtítulos de la pantalla ("NIVELES", "TEMPERATURA (°C)", "PÉRDIDAS"...),
// se agrega ese contexto a la etiqueta. Si un campo no está acá se usa
// CAMPO_LABELS / CAMPO_LABELS_GE.
const ETIQUETAS_PDF: Partial<Record<keyof ValoresBase, string>> = {
  horometro: "Horómetro",
  kilometros: "Kilómetros",
  aceite_motor: "Nivel aceite motor",
  aceite_unidad: "Nivel aceite unidad",
  refrig_radiador: "Nivel refrig. radiador",
  estado_bateria: "Estado batería",
  conec_purga: "Conexión de purga",
  inst_electrica: "Instalación eléctrica",
  carroceria: "Carrocería",
  jabalina: "Jabalina",
  aislacion_suelo: "Aislación de suelo",
  aceite_caja: "Nivel aceite caja",
  aceite_diferencial: "Nivel aceite diferencial",
  aceite_hidraulico: "Nivel aceite hidráulico",
  aceite_convertidor: "Nivel aceite convertidor",
  rpm_min: "RPM mín.",
  rpm_max: "RPM máx.",
  tension_linea: "Tensión de línea",
  tension_gen_f1: "Tensión de gen. F1",
  tension_gen_f2: "Tensión de gen. F2",
  tension_gen_f3: "Tensión de gen. F3",
  cons_carga_f1: "Cons. en carga F1",
  cons_carga_f2: "Cons. en carga F2",
  cons_carga_f3: "Cons. en carga F3",
  cons_descarga_f1: "Cons. en descarga F1",
  cons_descarga_f2: "Cons. en descarga F2",
  cons_descarga_f3: "Cons. en descarga F3",
  temp_ambiente: "Temperatura ambiente",
  temp_refrigerante: "Temperatura refrigerante",
  pto_rocio: "Punto de rocío",
  presion_unidad_comp: "Presión unid. comp.",
  presion_aceite_motor: "Presión aceite motor",
  circuito_refr_m: "Circuito refr. M.",
  circuito_despresuriz: "Circuito despresuriz.",
  circuito_arranque: "Circuito arranque",
  circuito_seguridad: "Circuito seguridad",
  circuito_electr: "Circuito eléctrico",
  tiempo_y_delta: "Tiempo Y-Δ",
  diferencial: "Diferencial",
  perdida_aceite_motor: "Pérdida aceite motor",
  perdida_refrigerante: "Pérdida refrigerante",
  perdida_aire: "Pérdida aire",
  perdida_combustible: "Pérdida combustible",
};

// Etiquetas que en pantalla cambian según el tipo de equipo.
const ETIQUETAS_PDF_POR_TIPO: Partial<Record<TipoEquipo, Partial<Record<keyof ValoresBase, string>>>> = {
  compresor: {
    tension_linea: "Tensión de línea (voltaje general)",
    temp_ambiente: "Temperatura de unidad",
    perdida_aceite_motor: "Pérdida de aceite de unidad",
  },
  motocompresor: {
    perdida_aceite_motor: "Pérdida aceite unidad",
  },
  secadores: {
    jabalina: "Conexión de jabalina",
  },
};

const ETIQUETAS_PDF_GE: Partial<Record<keyof InformeGrupoElectrogeno, string>> = {
  ge_motor_detenido_aceite_motor: "Nivel de aceite de motor",
  ge_motor_detenido_agua_radiador: "Nivel de agua radiador y refriger.",
  ge_motor_detenido_restriccion_aire: "Restricción en el filtro de aire",
  ge_motor_detenido_tension_correas: "Tensión correas vent. alternador",
  ge_motor_detenido_estado_baterias: "Estado baterías",
  ge_motor_detenido_inst_electrica: "Estado inst. eléctrica",
  ge_motor_detenido_cableado_distrib: "Cableado de distrib. de potencia",
  ge_motor_detenido_cubo_ventilador: "Cubo ventilador, polea y bomba agua",
  ge_motor_detenido_ajuste_motor: "Ajuste piezas de montaje de motor",
  ge_motor_detenido_union_tubo_aire: "Estado uniones y tubo admis. aire",
  ge_motor_detenido_lineas_combustible: "Conexiones y líneas de combustible",
  ge_funcionamiento_sistema_arranque: "Sistema de arranque",
  ge_funcionamiento_mangueras: "Mangueras y conexiones",
  ge_funcionamiento_presion_aceite: "Presión de aceite",
  ge_funcionamiento_temp_agua: "Temp. agua motor",
  ge_funcionamiento_diferencial_temp: "Diferencial de temp. de radiador",
  ge_funcionamiento_vibraciones: "Vibraciones inusuales",
  ge_funcionamiento_antivibratorios: "Antivibratorios",
  ge_funcionamiento_llave_termomagnetica: "Llave termomagnética",
  ge_funcionamiento_carga_alternador: "Carga alternador",
  ge_funcionamiento_llave_transferencia: "Llave de transferencia",
  ge_funcionamiento_rpm_max: "R.P.M. motor máxima",
  ge_funcionamiento_circ_seguridad: "Funcionamiento circ. seguridad",
  ge_funcionamiento_ventilacion_aire: "Ventilación de aire generador",
  ge_funcionamiento_perdidas_aceite: "Pérdidas aceite motor",
  ge_funcionamiento_perdidas_combustible: "Pérdidas circuito combustible",
  ge_funcionamiento_restriccion_escape: "Restricc. en el escape",
  ge_funcionamiento_restriccion_aire: "Restricción entrada y salida de aire",
  ge_funcionamiento_frecuencia: "Frecuencia (medición)",
  ge_funcionamiento_tension_linea: "Tensión de línea",
  ge_funcionamiento_amperaje_f1: "Amperaje fase F1",
  ge_funcionamiento_amperaje_f2: "Amperaje fase F2",
  ge_funcionamiento_amperaje_f3: "Amperaje fase F3",
  ge_funcionamiento_tension_linea_carga: "Tensión de línea con carga",
  ge_funcionamiento_temp_ambiente: "Temperatura ambiente",
  ge_funcionamiento_temp_refrigerante: "Temperatura líquido refrigerante",
  ge_funcionamiento_inspeccion_bateria: "Inspección de batería",
  ge_funcionamiento_accion_electrico: "Accionamiento de circ. eléctrico",
};

// Unidades que muestra la pantalla (sufijo, placeholder o título del grupo).
const UNIDADES_PDF: Partial<Record<keyof ValoresBase, string>> = {
  horometro: "HRS",
  kilometros: "KM",
  tension_linea: "V",
  tension_gen_f1: "V",
  tension_gen_f2: "V",
  tension_gen_f3: "V",
  cons_carga_f1: "A",
  cons_carga_f2: "A",
  cons_carga_f3: "A",
  cons_descarga_f1: "A",
  cons_descarga_f2: "A",
  cons_descarga_f3: "A",
  temp_ambiente: "°C",
  temp_refrigerante: "°C",
};

const UNIDADES_PDF_GE: Partial<Record<keyof InformeGrupoElectrogeno, string>> = {
  ge_funcionamiento_amperaje_f1: "A",
  ge_funcionamiento_amperaje_f2: "A",
  ge_funcionamiento_amperaje_f3: "A",
  ge_funcionamiento_temp_ambiente: "°C",
  ge_funcionamiento_temp_refrigerante: "°C",
};

function etiquetaCampo(tipo: TipoEquipo, campo: keyof ValoresBase): string {
  return ETIQUETAS_PDF_POR_TIPO[tipo]?.[campo] ?? ETIQUETAS_PDF[campo] ?? CAMPO_LABELS[campo];
}

function etiquetaCampoGE(campo: keyof InformeGrupoElectrogeno): string {
  return ETIQUETAS_PDF_GE[campo] ?? CAMPO_LABELS_GE[campo];
}

// Números en formato argentino (coma decimal, punto de miles); los enteros
// quedan limpios ("380", no "380,00"). Solo cambia cómo se imprime.
function numeroAR(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}

// Valor con su unidad (solo si hay valor). Los textos libres (horómetro) se
// imprimen tal cual los escribió el técnico (un "1.234" puede ser de miles);
// si ya traen letras no se les agrega la unidad.
function conUnidad(valor: unknown, unidad?: string): unknown {
  if (valor === null || valor === undefined) return valor;
  let base: string;
  if (typeof valor === "number" && Number.isFinite(valor)) base = numeroAR(valor);
  else if (typeof valor === "string") base = valor.trim();
  else return valor;
  if (base === "") return null;
  if (!unidad || /[a-zA-Z°]/.test(base)) return base;
  return `${base} ${unidad}`;
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

function Fila({ etiqueta, valor, unidad }: { etiqueta: string; valor: unknown; unidad?: string }) {
  return (
    <div className="pdf-fila">
      <span>{etiqueta}</span>
      <strong>{texto(conUnidad(valor, unidad))}</strong>
    </div>
  );
}

function TablaValores({ valores, tipo }: { valores: ValoresBase; tipo: TipoEquipo }) {
  const campos = CAMPOS_POR_TIPO[tipo];
  if (campos.length === 0) return null;
  return (
    <div className="pdf-tabla-valores">
      {campos.map((campo) => (
        <Fila key={campo} etiqueta={etiquetaCampo(tipo, campo)} valor={valores[campo]} unidad={UNIDADES_PDF[campo]} />
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
          <Fila key={campo} etiqueta={etiquetaCampoGE(campo)} valor={valores[campo]} unidad={UNIDADES_PDF_GE[campo]} />
        ))}
      </div>
      <div>
        <h3>Verificaciones de funcionamiento</h3>
        {funcionamiento.map((campo) => (
          <Fila key={campo} etiqueta={etiquetaCampoGE(campo)} valor={valores[campo]} unidad={UNIDADES_PDF_GE[campo]} />
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
        <Bloque titulo="Horas trabajadas"><Fila etiqueta="Total" valor={informe.horas_trabajadas} unidad="hs" /></Bloque>
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

// Parte del nombre del archivo: sin acentos ("José Peña" → "Jose-Pena"),
// solo letras, números y guiones, sin guiones repetidos ni en los extremos.
function parteNombreArchivo(valor: string, maximo: number): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximo)
    .replace(/-+$/g, "");
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
      const { copiaLocalVigente, descartarCopiaLocal, traerInformeRemoto } = await import("@/lib/remoto");
      // Una copia local vieja (sin cambios) se reemplaza por la versión actual del servidor.
      if (inf && inf.estado_sync === "sincronizado" && (typeof navigator === "undefined" || navigator.onLine)) {
        if ((await copiaLocalVigente(inf)) === false) {
          await descartarCopiaLocal(id).catch(() => undefined);
          inf = undefined;
        }
      }
      if (!inf && (typeof navigator === "undefined" || navigator.onLine)) {
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
    // Sin archivos la clave es "" (no null): igual se marca como lista para que
    // un informe sin fotos ni firmas también se pueda ver e imprimir.
    if (claveArchivos === null) return;
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
              await prepararBlob(archivo.id, descargado.data).then((r) => db.blobs.put(r)).catch(() => undefined);
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
        const equipo = parteNombreArchivo(nombreEquipo(informe.tipo_equipo), 40) || "equipo";
        const cliente = parteNombreArchivo(informe.cliente_nombre ?? "", 60) || "cliente";
        const numero = informe.numero_registro === null ? "borrador" : formatNumero(informe.numero_registro);
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
        pdf.save(`Informe-${numero}-${equipo}-${cliente}.pdf`);
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

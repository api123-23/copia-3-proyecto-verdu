import { db } from "./db";
import { supabase } from "./supabase";
import { tablaAnexa } from "./sync";
import type { CategoriaFoto, InformeGeneral, TipoEquipo, ValoresBase } from "./types";

const BUCKET = "informe-archivos";

type FilaServidor = Record<string, unknown>;

function normalizar(f: FilaServidor): InformeGeneral {
  return {
    id: String(f.id),
    numero_registro: (f.numero_registro as number) ?? null,
    cliente_id: (f.cliente_id as string) ?? null,
    cliente_nombre: String(f.cliente_nombre ?? ""),
    cliente_telefono: (f.cliente_telefono as string) ?? null,
    cliente_direccion: (f.cliente_direccion as string) ?? null,
    tecnico_id: (f.tecnico_id as string) ?? null,
    fecha_hora: String(f.fecha_hora),
    tipo_equipo: f.tipo_equipo as TipoEquipo,
    observaciones: (f.observaciones as string) ?? null,
    observaciones_ia: (f.observaciones_ia as string) ?? null,
    maquina_operativa: (f.maquina_operativa as boolean) ?? null,
    horas_trabajadas: (f.horas_trabajadas as number) ?? null,
    repuestos_air_power: (f.repuestos_air_power as string) ?? null,
    repuestos_cliente: (f.repuestos_cliente as string) ?? null,
    requiere_cotizacion: Boolean(f.requiere_cotizacion),
    cotizacion_notas: (f.cotizacion_notas as string) ?? null,
    cotizacion_notas_ia: (f.cotizacion_notas_ia as string) ?? null,
    estado_firma: (f.estado_firma as "pendiente" | "firmado") ?? "pendiente",
    cerrado: Boolean(f.cerrado),
    firma_tecnico_url: (f.firma_tecnico_url as string) ?? null,
    firma_cliente_url: (f.firma_cliente_url as string) ?? null,
    aclaracion_firma: (f.aclaracion_firma as string) ?? null,
    firmado_en: (f.firmado_en as string) ?? null,
    creado_en: String(f.creado_en),
    actualizado_en: String(f.actualizado_en),
    sincronizado_en: (f.sincronizado_en as string) ?? null,
    estado_sync: "sincronizado",
    error_sync: null,
  };
}

export async function listarRemotos(): Promise<InformeGeneral[]> {
  const { data, error } = await supabase()
    .from("informes_generales")
    .select("*")
    .order("fecha_hora", { ascending: false });
  if (error || !data) return [];
  return (data as FilaServidor[]).map(normalizar);
}

export async function traerInformeRemoto(id: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from("informes_generales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return false;
  const informe = normalizar(data as FilaServidor);

  const tabla = tablaAnexa(informe.tipo_equipo);
  let anexa: Partial<ValoresBase> | null = null;
  if (tabla) {
    const { data: filaAnexa } = await supabase().from(tabla).select("*").eq("informe_id", id).maybeSingle();
    if (filaAnexa) {
      const resto = { ...(filaAnexa as FilaServidor) };
      delete resto.informe_id;
      anexa = resto as Partial<ValoresBase>;
    }
  }

  const { data: archivos } = await supabase()
    .from("informe_archivos")
    .select("*")
    .eq("informe_id", id);

  await db.transaction(
    "rw",
    [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_grupo_electrogeno, db.archivos, db.blobs],
    async () => {
      await db.informes.put(informe);
      if (anexa) {
        const destino =
          informe.tipo_equipo === "motocompresor"
            ? db.valores_motocompresor
            : informe.tipo_equipo === "compresor"
              ? db.valores_compresor
              : informe.tipo_equipo === "vehiculos"
                ? db.valores_vehiculos
                : db.valores_grupo_electrogeno;
        await destino.put({ informe_id: id, ...anexa } as never);
      }
      for (const a of (archivos ?? []) as FilaServidor[]) {
        const existente = await db.archivos.get(String(a.id));
        if (existente) continue;
        let blob: Blob | null = null;
        try {
          const { data: descargado } = await supabase().storage.from(BUCKET).download(String(a.url));
          blob = descargado ?? null;
        } catch {
          blob = null;
        }
        const idArchivo = String(a.id);
        await db.archivos.put({
          id: idArchivo,
          informe_id: id,
          tipo: a.tipo as "foto" | "firma_tecnico" | "firma_cliente",
          categoria: (a.categoria as CategoriaFoto | null) ?? null,
          url: String(a.url),
          estado_sync: "sincronizado",
          creado_en: String(a.creado_en),
        });
        if (blob) await db.blobs.put({ id: idArchivo, blob });
      }
    }
  );
  return true;
}

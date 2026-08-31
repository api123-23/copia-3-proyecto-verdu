"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import SignaturePad from "signature_pad";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { InformeGeneral, TipoArchivo } from "@/lib/types";
import { Seccion } from "@/components/ui";

function ModalFirma({
  titulo,
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  onConfirmar: (blob: Blob) => void;
  onCerrar: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [puedeConfirmar, setPuedeConfirmar] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const medir = () => {
      const w = canvas.offsetWidth || 320;
      const h = canvas.offsetHeight || 192;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
    };
    medir();

    const pad = new SignaturePad(canvas, {
      minWidth: 1.2,
      maxWidth: 2.6,
      penColor: "#191c1e",
    });
    pad.addEventListener("beginStroke", () => setPuedeConfirmar(true));
    pad.addEventListener("endStroke", () => setPuedeConfirmar(!pad.isEmpty()));
    padRef.current = pad;

    // En pantallas táctiles el layout puede terminar después del primer paint,
    // lo que cambiaría offsetWidth. Se vuelve a medir con un frame de margen.
    const id = window.requestAnimationFrame(() => {
      if (padRef.current === pad) medir();
    });
    return () => {
      window.cancelAnimationFrame(id);
      pad.off();
    };
  }, []);

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || !padRef.current || padRef.current.isEmpty()) return;
    canvas.toBlob((blob) => {
      if (blob) {
        onConfirmar(blob);
        return;
      }
      canvas.toBlob((blobPng) => {
        if (blobPng) onConfirmar(blobPng);
      }, "image/png");
    }, "image/webp");
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-margin">
      <div className="bg-white rounded-xl w-full max-w-lg p-md space-y-md">
        <h3 className="text-title-md font-title-md font-bold text-primary uppercase tracking-wider">
          {titulo}
        </h3>
        <canvas
          ref={canvasRef}
          className="w-full h-64 bg-white rounded-lg border border-outline-variant"
          style={{ touchAction: "none" }}
        />
        <div className="flex items-center justify-between gap-sm">
          <button
            type="button"
            className="text-body-md text-on-surface-variant underline px-2 py-1 min-h-[44px]"
            onClick={() => {
              padRef.current?.clear();
              setPuedeConfirmar(false);
            }}
          >
            Limpiar
          </button>
          <div className="flex gap-sm">
            <button
              type="button"
              className="border border-outline-variant rounded-lg px-md py-1.5 text-title-md"
              onClick={onCerrar}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!puedeConfirmar}
              className="bg-primary text-on-primary rounded-lg px-md py-1.5 text-title-md font-bold uppercase tracking-wider hover:bg-primary-container transition-colors disabled:opacity-40"
              onClick={confirmar}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BloqueFirma({
  titulo,
  tipo,
  informeId,
  onConfirmar,
  onEliminar,
  children,
}: {
  titulo: string;
  tipo: TipoArchivo;
  informeId: string;
  onConfirmar?: () => void;
  onEliminar?: () => void;
  children?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const existente = useLiveQuery(async () => {
    const filas = await db.archivos.where({ informe_id: informeId, tipo }).toArray();
    return filas[0];
  }, [informeId, tipo]);
  const registro = useLiveQuery(
    () => (existente ? db.blobs.get(existente.id) : undefined),
    [existente]
  );
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (registro || remoteUrl || !existente?.url) return;
    let cancelado = false;
    supabase().storage
      .from("informe-archivos")
      .createSignedUrl(existente.url, 3600)
      .then(({ data, error }) => {
        if (!cancelado && data?.signedUrl) setRemoteUrl(data.signedUrl);
        if (!cancelado && error) console.warn("[firmas] Error signed URL:", error.message);
      })
      .catch((e) => console.warn("[firmas] Error fetching signed URL:", e));
    return () => { cancelado = true; };
  }, [registro, remoteUrl, existente?.url]);

  const url = useMemo(() => {
    if (registro) return URL.createObjectURL(registro.blob);
    return remoteUrl;
  }, [registro, remoteUrl]);

  useEffect(
    () => () => {
      if (registro && url) URL.revokeObjectURL(url);
    },
    [registro, url]
  );

  async function guardar(blob: Blob) {
    const id = crypto.randomUUID();
    await db.transaction("rw", [db.archivos, db.blobs], async () => {
      if (existente) {
        await db.archivos.delete(existente.id);
        await db.blobs.delete(existente.id);
      }
      await db.blobs.put({ id, blob });
      await db.archivos.put({
        id,
        informe_id: informeId,
        tipo,
        categoria: null,
        url: null,
        estado_sync: "pendiente",
        creado_en: new Date().toISOString(),
      });
    });
    setAbierto(false);
    onConfirmar?.();
  }

  async function limpiar() {
    if (!existente) return;
    if (!window.confirm("¿Eliminar esta firma?")) return;
    await db.transaction("rw", [db.archivos, db.blobs], async () => {
      await db.archivos.delete(existente.id);
      await db.blobs.delete(existente.id);
    });
    onEliminar?.();
  }

  return (
    <div className="border border-outline-variant rounded-lg p-sm bg-surface-container-low/50">
      <span className="block text-label-caps font-label-caps text-on-surface-variant mb-1">
        {titulo}
      </span>
      {url ? (
        <div className="flex items-center gap-sm">
          <img
            src={url}
            alt={titulo}
            className="h-20 flex-1 object-contain bg-white rounded border border-outline-variant"
          />
          <button
            type="button"
            className="text-body-md text-on-surface-variant underline px-2 py-1 min-h-[44px]"
            onClick={limpiar}
          >
            Rehacer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full h-20 bg-white rounded border border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant opacity-70 min-h-[44px]"
        >
          Tocar para firmar
        </button>
      )}
      {children}
      {abierto ? (
        <ModalFirma titulo={titulo} onCerrar={() => setAbierto(false)} onConfirmar={guardar} />
      ) : null}
    </div>
  );
}

export default function SeccionFirmas({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: Partial<InformeGeneral>) => void;
}) {
  return (
    <Seccion titulo="Firmas Digitales">
      <div className="space-y-sm">
        <BloqueFirma titulo="Firma del Técnico" tipo="firma_tecnico" informeId={informe.id} />
        <BloqueFirma
          titulo="Firma del Cliente"
          tipo="firma_cliente"
          informeId={informe.id}
          onConfirmar={() =>
            onChange({ estado_firma: "firmado", firmado_en: new Date().toISOString() })
          }
          onEliminar={() =>
            onChange({ estado_firma: "pendiente", firmado_en: null })
          }
        >
          <input
            className="input-technical mt-1.5 text-[12px] h-[28px]"
            placeholder="Aclaración de firma"
            type="text"
            value={informe.aclaracion_firma ?? ""}
            onChange={(e) => onChange({ aclaracion_firma: e.target.value || null })}
          />
        </BloqueFirma>
        <p className="text-[10px] text-on-surface-variant text-center mt-2 italic leading-tight">
          Doy conformidad y certifico que el trabajo ha sido efectuado de acuerdo a lo detallado.
        </p>
      </div>
    </Seccion>
  );
}
const MAX_DIM = 1920;
const CALIDAD = 0.8;

function canvasABlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, tipo, CALIDAD);
    } catch {
      resolve(null);
    }
  });
}

export async function comprimirImagenWebp(fuente: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(fuente);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imagen = new Image();
      imagen.onload = () => resolve(imagen);
      imagen.onerror = () => reject(new Error("No se pudo leer la imagen"));
      imagen.src = objectUrl;
    });

    const escala = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, 1));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no soportado en este navegador");
    ctx.drawImage(img, 0, 0, ancho, alto);

    const webp = await canvasABlob(canvas, "image/webp");
    if (webp && webp.type === "image/webp") return webp;

    const jpeg = await canvasABlob(canvas, "image/jpeg");
    if (jpeg) return jpeg;

    throw new Error("No se pudo comprimir la imagen");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
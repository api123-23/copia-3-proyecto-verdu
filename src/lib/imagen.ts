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

/** Libera la memoria del canvas (en iOS los canvas grandes no se liberan solos). */
function liberarCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function cargarImagen(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error("No se pudo leer la imagen"));
    imagen.src = objectUrl;
  });
}

/**
 * Dibuja la fuente en un canvas del tamaño final y lo codifica (WebP y, si el
 * navegador no lo soporta, JPEG), con la misma calidad de siempre.
 */
async function codificar(fuente: CanvasImageSource, ancho: number, alto: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  try {
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no soportado en este navegador");
    ctx.drawImage(fuente, 0, 0, ancho, alto);

    const webp = await canvasABlob(canvas, "image/webp");
    if (webp && webp.type === "image/webp" && webp.size > 0) return webp;

    const jpeg = await canvasABlob(canvas, "image/jpeg");
    if (jpeg && jpeg.size > 0) return jpeg;

    throw new Error("No se pudo comprimir la imagen");
  } finally {
    liberarCanvas(canvas);
  }
}

/**
 * Decodifica la foto YA reducida al tamaño final (createImageBitmap con
 * resizeWidth/resizeHeight), sin pasar por la imagen completa de 12–48 MP en
 * memoria: es lo que hacía caer la app en iPhones viejos. Devuelve null si el
 * navegador no lo soporta o el resultado no tiene el tamaño esperado, para que
 * se use el método de siempre.
 */
async function comprimirConBitmap(fuente: Blob, ancho: number, alto: number, anchoOriginal: number, altoOriginal: number): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap | null = null;
  try {
    // imageOrientation "from-image" respeta la rotación EXIF (igual que <img>).
    // Navegadores viejos que no conocen la opción tiran error → método de siempre.
    bitmap = await createImageBitmap(fuente, {
      resizeWidth: ancho,
      resizeHeight: alto,
      resizeQuality: "high",
      imageOrientation: "from-image",
    });
    if (bitmap.width === ancho && bitmap.height === alto) {
      return await codificar(bitmap, ancho, alto);
    }
    // Ignoró el redimensionado pero respetó la orientación: ya está decodificada,
    // se reduce desde acá (igual que el método de siempre) sin decodificar de nuevo.
    if (bitmap.width === anchoOriginal && bitmap.height === altoOriginal) {
      return await codificar(bitmap, ancho, alto);
    }
    return null;
  } catch (e) {
    console.warn("[imagen] createImageBitmap con redimensionado no disponible, se usa el método de siempre:", e);
    return null;
  } finally {
    bitmap?.close();
  }
}

export async function comprimirImagenWebp(fuente: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(fuente);
  let img: HTMLImageElement | null = null;
  try {
    // Solo para conocer el tamaño real (ya orientado según EXIF). Cargar el
    // <img> sin dibujarlo no obliga al navegador a decodificar la foto entera.
    img = await cargarImagen(objectUrl);

    const escala = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, 1));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));

    if (escala < 1) {
      const reducida = await comprimirConBitmap(fuente, ancho, alto, img.naturalWidth, img.naturalHeight);
      if (reducida) return reducida;
    }

    // Método de siempre: dibujar el <img> completo escalado en el canvas.
    return await codificar(img, ancho, alto);
  } finally {
    if (img) img.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}

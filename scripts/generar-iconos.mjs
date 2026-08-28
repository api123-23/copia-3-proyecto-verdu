import sharp from "sharp";
import { mkdirSync } from "fs";

const ORIGEN = "public/icons/logo-origen.jpg";
const DESTINO = "public/icons";

mkdirSync(DESTINO, { recursive: true });
for (const size of [180, 192, 512]) {
  await sharp(ORIGEN)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(`${DESTINO}/icon-${size}.png`);
}
console.log("íconos generados desde", ORIGEN);
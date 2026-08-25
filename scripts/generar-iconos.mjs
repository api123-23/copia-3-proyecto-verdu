import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#003e7a"/>
  <path d="M282 76 L150 292 h84 l-26 144 L362 212 h-86 z" fill="#ffffff"/>
</svg>`);

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  await sharp(svg(size)).png().toFile(`public/icons/icon-${size}.png`);
}
console.log("íconos generados");

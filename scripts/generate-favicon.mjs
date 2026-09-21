import fs from "fs";
import path from "path";
import sharp from "sharp";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const publicIconsDir = path.join(publicDir, "icons");
const appDir = path.join(rootDir, "src", "app");

// Helper to assemble standard multi-resolution ICO file from PNG buffers
function createIco(images) {
  // images: Array<{ buffer: Buffer, size: number }>
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // Reserved
  header.writeUInt16LE(1, 2);       // 1 = ICO format
  header.writeUInt16LE(count, 4);   // Number of images

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (let i = 0; i < count; i++) {
    const { buffer, size } = images[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2);                      // Color palette count (0 for >=8bpp)
    entry.writeUInt8(0, 3);                      // Reserved
    entry.writeUInt16LE(1, 4);                   // Color planes
    entry.writeUInt16LE(32, 6);                  // Bits per pixel (32-bit RGBA)
    entry.writeUInt32LE(buffer.length, 8);       // Image data size
    entry.writeUInt32LE(offset, 12);             // Image data offset
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.buffer)]);
}

// Generate SVG string with high quality rendering and crisp strokes
function getSvg(size, paddingRatio = 0.16) {
  const padding = size * paddingRatio;
  const logoSize = size - padding * 2;
  const radius = Math.round(size * 0.22); // Consistent smooth squircle
  const strokeWidth = size <= 32 ? 2.0 : size <= 48 ? 1.8 : 1.6;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#242424" />
          <stop offset="50%" stop-color="#171717" />
          <stop offset="100%" stop-color="#0a0a0a" />
        </linearGradient>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
        <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="${size <= 32 ? 0.5 : 2}" flood-color="#ffffff" flood-opacity="0.2" />
        </filter>
      </defs>

      <!-- Rounded Background matching Akshra AI Project Icon -->
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />

      <!-- Centered Akshra Logo -->
      <g transform="translate(${padding}, ${padding}) scale(${logoSize / 24})" filter="url(#subtleGlow)">
        <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"
              fill="none" stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 6a6 6 0 0 1 6 6 6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"
              fill="none" stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 9.5a2.5 2.5 0 0 1 2.5 2.5 2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5z"
              fill="none" stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M4.93 4.93l4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <path d="M14.83 14.83l4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <path d="M19.07 4.93l-4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <path d="M9.17 14.83l-4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="${strokeWidth}" stroke-linecap="round" />
      </g>
    </svg>
  `;
}

async function run() {
  console.log("Generating multi-resolution Favicon and icons identical to Project Icon...");

  const sizes = [16, 32, 48, 64];
  const images = [];

  for (const size of sizes) {
    const svgStr = getSvg(size, size <= 32 ? 0.14 : 0.18);
    const pngBuffer = await sharp(Buffer.from(svgStr)).png().toBuffer();
    images.push({ size, buffer: pngBuffer });
  }

  // 1. Create the composite multi-resolution ICO file
  const icoBuffer = createIco(images);

  // Write to src/app/favicon.ico (Next.js App Router default)
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer);
  console.log("✓ Updated src/app/favicon.ico (multi-res 16, 32, 48, 64)");

  // Write to public/favicon.ico (Static root direct access)
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
  console.log("✓ Updated public/favicon.ico");

  // 2. High-res individual PNG favicons
  const png16 = images.find((img) => img.size === 16).buffer;
  const png32 = images.find((img) => img.size === 32).buffer;
  const png48 = images.find((img) => img.size === 48).buffer;

  fs.writeFileSync(path.join(publicIconsDir, "favicon-16x16.png"), png16);
  fs.writeFileSync(path.join(publicIconsDir, "favicon-32x32.png"), png32);
  fs.writeFileSync(path.join(publicIconsDir, "favicon-48x48.png"), png48);
  console.log("✓ Updated public/icons/favicon-16x16.png, 32x32.png, 48x48.png");

  // 3. Native App Router icon files in src/app/
  fs.writeFileSync(path.join(appDir, "icon.png"), png32);
  console.log("✓ Created src/app/icon.png");

  // 4. Save SVG Favicon
  fs.writeFileSync(path.join(publicIconsDir, "favicon.svg"), getSvg(128, 0.18));
  console.log("✓ Created public/icons/favicon.svg");

  console.log("All Favicon icons successfully updated to match Project Icon!");
}

run().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import sharp from "sharp";

const outputDir = path.resolve(process.cwd(), "public/icons");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG string with high quality rendering
function getSvg(size, paddingRatio = 0.22, isMaskable = false) {
  const padding = size * paddingRatio;
  const logoSize = size - padding * 2;
  const radius = isMaskable ? 0 : Math.round(size * 0.22); // Squircle for standard, full bleed for maskable

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
          <stop offset="100%" stop-color="#e0e0e0" />
        </linearGradient>
        <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#ffffff" flood-opacity="0.15" />
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />

      <!-- Centered Akshra Logo -->
      <g transform="translate(${padding}, ${padding}) scale(${logoSize / 24})" filter="url(#subtleGlow)">
        <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z"
              fill="none" stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 6a6 6 0 0 1 6 6 6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"
              fill="none" stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 9.5a2.5 2.5 0 0 1 2.5 2.5 2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5z"
              fill="none" stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M4.93 4.93l4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" />
        <path d="M14.83 14.83l4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" />
        <path d="M19.07 4.93l-4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" />
        <path d="M9.17 14.83l-4.24 4.24"
              stroke="url(#logoGrad)" stroke-width="1.6" stroke-linecap="round" />
      </g>
    </svg>
  `;
}

async function buildIcons() {
  console.log("Generating PWA icons...");

  // 1. Standard 192x192
  await sharp(Buffer.from(getSvg(192, 0.20, false)))
    .png()
    .toFile(path.join(outputDir, "icon-192x192.png"));

  // 2. Standard 512x512
  await sharp(Buffer.from(getSvg(512, 0.20, false)))
    .png()
    .toFile(path.join(outputDir, "icon-512x512.png"));

  // 3. Maskable 192x192 (safe zone ratio 0.28 ensures 40% margin as per W3C maskable spec)
  await sharp(Buffer.from(getSvg(192, 0.28, true)))
    .png()
    .toFile(path.join(outputDir, "icon-maskable-192x192.png"));

  // 4. Maskable 512x512
  await sharp(Buffer.from(getSvg(512, 0.28, true)))
    .png()
    .toFile(path.join(outputDir, "icon-maskable-512x512.png"));

  // 5. Apple Touch Icon 180x180 (solid background for iOS)
  await sharp(Buffer.from(getSvg(180, 0.22, true)))
    .png()
    .toFile(path.join(outputDir, "apple-touch-icon.png"));

  // 6. Favicon 32x32
  await sharp(Buffer.from(getSvg(32, 0.15, false)))
    .png()
    .toFile(path.join(outputDir, "favicon-32x32.png"));

  // 7. Save master SVG icon
  fs.writeFileSync(path.join(outputDir, "icon.svg"), getSvg(512, 0.20, false));

  console.log("Successfully generated all PWA icons in public/icons!");
}

buildIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});

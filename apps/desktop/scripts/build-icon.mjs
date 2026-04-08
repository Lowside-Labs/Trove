import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  throw new Error("Icon generation is only supported on macOS.");
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(dirname, "..");
const sourceIconPath = path.join(desktopRoot, "build", "icon.svg");
const outDir = path.join(desktopRoot, "out");
const iconsetDir = path.join(outDir, "icon.iconset");
const previewPngPath = path.join(outDir, "icon.svg.png");
const iconPath = path.join(outDir, "icon.icns");

const iconSizes = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

if (!fs.existsSync(sourceIconPath)) {
  throw new Error(`Missing icon source at ${sourceIconPath}.`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.mkdirSync(iconsetDir, { recursive: true });
fs.rmSync(previewPngPath, { force: true });
fs.rmSync(iconPath, { force: true });

execFileSync("qlmanage", ["-t", "-s", "1024", "-o", outDir, sourceIconPath], {
  stdio: "ignore",
});

if (!fs.existsSync(previewPngPath)) {
  throw new Error("Failed to render the icon preview PNG with qlmanage.");
}

for (const { name, size } of iconSizes) {
  execFileSync("sips", ["-z", String(size), String(size), previewPngPath, "--out", path.join(iconsetDir, name)], {
    stdio: "ignore",
  });
}

execFileSync("iconutil", ["-c", "icns", iconsetDir, "-o", iconPath], {
  stdio: "ignore",
});

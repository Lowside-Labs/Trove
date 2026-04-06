import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rebuild } from "@electron/rebuild";

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(dirname, "../../..");
const troveCoreRoot = path.join(workspaceRoot, "packages/trove-core");
const electronPackage = require("electron/package.json");

try {
  await rebuild({
    buildPath: troveCoreRoot,
    electronVersion: electronPackage.version,
    projectRootPath: workspaceRoot,
    onlyModules: ["better-sqlite3"],
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  throw new Error(
    [
      "Failed to rebuild better-sqlite3 for Electron.",
      "Prebuilt binaries are available for most platforms (macOS, Linux, Windows).",
      "If prebuilts failed to download, a C++ toolchain is needed as a fallback:",
      "  macOS: xcode-select --install",
      "  Linux: sudo apt install build-essential",
      "  Windows: npm install -g windows-build-tools",
      `Original error: ${message}`,
    ].join("\n"),
  );
}

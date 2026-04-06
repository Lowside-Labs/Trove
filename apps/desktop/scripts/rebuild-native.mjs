import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(dirname, "../../..");
const troveCoreRequire = createRequire(path.join(workspaceRoot, "packages/trove-core/package.json"));
const betterSqlitePackageJsonPath = troveCoreRequire.resolve("better-sqlite3/package.json");
const betterSqliteRoot = path.dirname(betterSqlitePackageJsonPath);
const electronPackage = require("electron/package.json");
const nativeBinaryPath = path.join(betterSqliteRoot, "build/Release/better_sqlite3.node");

try {
  fs.rmSync(nativeBinaryPath, { force: true });

  execFileSync(
    "pnpm",
    ["run", "install"],
    {
      cwd: betterSqliteRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_runtime: "electron",
        npm_config_target: electronPackage.version,
        npm_config_disturl: "https://electronjs.org/headers",
        npm_config_build_from_source: "false",
      },
    },
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  throw new Error(
    [
      "Failed to rebuild better-sqlite3 for Electron.",
      "The desktop app expects a native module binary compiled for Electron, not plain Node.js.",
      "Trove now rebuilds by running better-sqlite3's own install script in the resolved package directory.",
      "If prebuilt binaries are unavailable, a local build toolchain is still required as a fallback.",
      `Original error: ${message}`,
    ].join("\n"),
  );
}

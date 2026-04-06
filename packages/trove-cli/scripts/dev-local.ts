import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const sandboxRoot = path.join(repoRoot, ".tmp", "local-dev");
const workspaceRoot = path.join(sandboxRoot, "workspace");
const configHome = path.join(sandboxRoot, "config");
const cliPath = path.join(packageRoot, "src", "cli.ts");
const tsxFileName = process.platform === "win32" ? "tsx.cmd" : "tsx";
const tsxCandidates = [
  path.join(packageRoot, "node_modules", ".bin", tsxFileName),
  path.join(repoRoot, "node_modules", ".bin", tsxFileName),
];
const tsxPath = tsxCandidates.find((candidate) => fs.existsSync(candidate));
const forwardedArgs = process.argv.slice(2);

const command = forwardedArgs[0];

if (!command) {
  printUsage();
  process.exit(1);
}

if (command === "reset") {
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
  console.log(`Removed local dev sandbox at ${sandboxRoot}`);
  process.exit(0);
}

if (command === "where") {
  printLocations();
  process.exit(0);
}

fs.mkdirSync(sandboxRoot, { recursive: true });
fs.mkdirSync(configHome, { recursive: true });

if (command !== "init" && !workspaceExists(workspaceRoot)) {
  runCli(["init", "--path", workspaceRoot], "Failed to initialize the local dev workspace.");
}

const args =
  command === "init"
    ? forwardedArgs.length === 1
      ? ["init", "--path", workspaceRoot]
      : forwardedArgs
    : forwardedArgs.includes("--home")
      ? forwardedArgs
      : ["--home", workspaceRoot, ...forwardedArgs];

const exitCode = runCli(args);
process.exit(exitCode);

function runCli(args: string[], message?: string): number {
  if (!tsxPath) {
    throw new Error("Could not find the tsx executable. Run `pnpm install` first.");
  }

  const result = spawnSync(tsxPath, [cliPath, ...args], {
    cwd: packageRoot,
    env: {
      ...process.env,
      XDG_CONFIG_HOME: configHome,
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number") {
    if (result.status !== 0 && message) {
      console.error(message);
    }

    return result.status;
  }

  return 1;
}

function workspaceExists(root: string): boolean {
  return fs.existsSync(path.join(root, "data", "trove.db"));
}

function printLocations(): void {
  console.log(`Package root:     ${packageRoot}`);
  console.log(`Repo root:        ${repoRoot}`);
  console.log(`Dev sandbox:      ${sandboxRoot}`);
  console.log(`Dev workspace:    ${workspaceRoot}`);
  console.log(`XDG_CONFIG_HOME:  ${configHome}`);
  console.log(`Real HOME:        ${process.env.HOME ?? "(unset)"}`);
}

function printUsage(): void {
  console.log("Usage: pnpm dev:local -- <trove command>");
  console.log("Examples:");
  console.log("  pnpm dev:local -- sync substack");
  console.log("  pnpm dev:local -- stats");
  console.log("  pnpm dev:local -- search browser");
  console.log("  pnpm dev:local -- where");
  console.log("  pnpm dev:local -- reset");
}

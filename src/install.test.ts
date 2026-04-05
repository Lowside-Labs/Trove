import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");
const installScriptPath = path.join(repoRoot, "install.sh");

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("install.sh", () => {
  it("installs trove into a user-owned location and links the trove binary", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-install-test-"));
    const home = path.join(root, "home");
    const installRoot = path.join(home, "Library Space", "trove install");
    const binDir = path.join(home, "Bin Space");
    const stubsDir = path.join(root, "stubs");
    const sourceRoot = path.join(root, "Trove-main");
    const archivePath = path.join(root, "trove.tar.gz");
    const npmLogPath = path.join(root, "npm.log");
    roots.push(root);

    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(stubsDir, { recursive: true });
    fs.mkdirSync(sourceRoot, { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, "package.json"), JSON.stringify({ name: "trove-fixture" }), "utf8");

    createArchive(root, archivePath);
    writeExecutable(path.join(stubsDir, "node"), buildNodeStub("22"));
    writeExecutable(path.join(stubsDir, "npm"), buildNpmStub());

    const result = spawnSync("bash", [installScriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: home,
        PATH: `${stubsDir}:${process.env.PATH}`,
        TEST_NPM_LOG: npmLogPath,
        TROVE_ARCHIVE_URL: `file://${archivePath}`,
        TROVE_BIN_DIR: binDir,
        TROVE_INSTALL_ROOT: installRoot,
      },
      encoding: "utf8",
    });

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed Trove.");
    expect(result.stdout).toContain("cd ~/Trove");
    expect(fs.lstatSync(path.join(binDir, "trove")).isSymbolicLink()).toBe(true);
    expect(execFileSync(path.join(binDir, "trove"), { encoding: "utf8" })).toBe("trove stub\n");

    const npmLog = fs.readFileSync(npmLogPath, "utf8");
    expect(npmLog).toContain("ci --silent");
    expect(npmLog).toContain("run --silent build");
    expect(npmLog).toContain("prune --omit=dev --silent");
  });

  it("fails early when Node is too old", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trove-install-node-test-"));
    const home = path.join(root, "home");
    const installRoot = path.join(home, "trove");
    const binDir = path.join(home, ".local", "bin");
    const stubsDir = path.join(root, "stubs");
    roots.push(root);

    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(stubsDir, { recursive: true });
    writeExecutable(path.join(stubsDir, "node"), buildNodeStub("20"));
    writeExecutable(path.join(stubsDir, "npm"), buildNpmStub());

    const result = spawnSync("bash", [installScriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: home,
        PATH: `${stubsDir}:${process.env.PATH}`,
        TROVE_INSTALL_ROOT: installRoot,
        TROVE_BIN_DIR: binDir,
      },
      encoding: "utf8",
    });

    if (result.error) {
      throw result.error;
    }

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Trove requires Node 22 or newer.");
    expect(fs.existsSync(installRoot)).toBe(false);
  });
});

function createArchive(root: string, archivePath: string): void {
  const result = spawnSync("tar", ["-czf", archivePath, "-C", root, "Trove-main"], {
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  expect(result.status).toBe(0);
}

function writeExecutable(filePath: string, contents: string): void {
  fs.writeFileSync(filePath, contents, { encoding: "utf8", mode: 0o755 });
}

function buildNodeStub(majorVersion: string): string {
  return `#!/usr/bin/env bash
set -euo pipefail

if [ "\${1-}" = "-p" ]; then
  printf '%s\\n' "${majorVersion}"
  exit 0
fi

if [ "\${1-}" = "--version" ]; then
  printf 'v%s.0.0\\n' "${majorVersion}"
  exit 0
fi

printf 'unexpected node args: %s\\n' "$*" >&2
exit 1
`;
}

function buildNpmStub(): string {
  return `#!/usr/bin/env bash
set -euo pipefail

printf '%s\\n' "$*" >>"$TEST_NPM_LOG"

if [ "\${1-}" = "ci" ]; then
  exit 0
fi

if [ "\${1-}" = "run" ] && [ "\${2-}" = "--silent" ] && [ "\${3-}" = "build" ]; then
  mkdir -p dist
  cat > dist/cli.js <<'EOF'
#!/usr/bin/env bash
printf 'trove stub\\n'
EOF
  chmod +x dist/cli.js
  exit 0
fi

if [ "\${1-}" = "prune" ]; then
  exit 0
fi

printf 'unexpected npm args: %s\\n' "$*" >&2
exit 1
`;
}

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const VALID_SOURCES = new Set([
  "chatgpt",
  "claude",
  "github",
  "hn",
  "instagram",
  "substack",
  "x",
]);

const DEFAULT_WORKSPACE = path.resolve(".tmp/local-dev/workspace");

function main() {
  const { source, workspace, keepArtifacts } = parseArgs(process.argv.slice(2));

  if (!source) {
    printUsage("Missing required <source> argument.");
    process.exit(1);
  }

  if (!VALID_SOURCES.has(source)) {
    printUsage(`Unknown source "${source}".`);
    process.exit(1);
  }

  const dbPath = path.join(workspace, "data", "trove.db");

  if (!fs.existsSync(dbPath)) {
    console.error(`No local dev database found at ${dbPath}`);
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);

  try {
    db.exec("BEGIN");
    db.prepare("DELETE FROM items WHERE source = ?").run(source);
    db.prepare("DELETE FROM sync_state WHERE source = ?").run(source);
    db.exec("DELETE FROM items_fts WHERE rowid NOT IN (SELECT id FROM items)");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  if (!keepArtifacts) {
    removeIfExists(path.join(workspace, "raw", source));
    removeIfExists(path.join(workspace, "content", source));
  }

  console.log(`Reset local dev source "${source}" in ${workspace}`);
  if (!keepArtifacts) {
    console.log("Removed source items, sync state, and local raw/content artifacts.");
  } else {
    console.log("Removed source items and sync state. Left raw/content artifacts intact.");
  }
}

function parseArgs(args) {
  let source;
  let workspace = DEFAULT_WORKSPACE;
  let keepArtifacts = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) continue;

    if (arg === "--workspace") {
      workspace = path.resolve(args[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--keep-artifacts") {
      keepArtifacts = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (!source) {
      source = arg;
      continue;
    }

    printUsage(`Unexpected argument "${arg}".`);
    process.exit(1);
  }

  return { source, workspace, keepArtifacts };
}

function printUsage(error) {
  if (error) {
    console.error(error);
    console.error("");
  }

  console.error("Usage: pnpm reset-local:source <source> [--workspace <path>] [--keep-artifacts]");
  console.error("");
  console.error("Resets one source in the local dev workspace without wiping the full archive.");
  console.error("");
  console.error(`Default workspace: ${DEFAULT_WORKSPACE}`);
  console.error(`Supported sources: ${Array.from(VALID_SOURCES).join(", ")}`);
}

function removeIfExists(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

main();

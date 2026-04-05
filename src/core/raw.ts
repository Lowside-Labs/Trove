import fs from "node:fs";
import path from "node:path";
import { ensureTroveDirs } from "./fs.js";

export interface JsonlSink {
  path: string;
  append(entry: Record<string, unknown>): void;
}

export function createJsonlSink(source: string, fileName: string, root?: string): JsonlSink {
  const paths = ensureTroveDirs(root);
  const sourceDir = path.join(paths.rawDir, source);
  fs.mkdirSync(sourceDir, { recursive: true });

  const outputPath = path.join(sourceDir, fileName);

  return {
    path: outputPath,
    append(entry) {
      fs.appendFileSync(outputPath, `${JSON.stringify(entry)}\n`, "utf8");
    },
  };
}

export function createTimestampedFileName(prefix: string, extension = "jsonl"): string {
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  return `${prefix}-${timestamp}.${extension}`;
}

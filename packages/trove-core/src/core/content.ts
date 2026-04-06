import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { TroveItem } from "../types/item.js";
import type { TrovePaths } from "./paths.js";

export function slugify(value: string, fallback = "item"): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : fallback;
}

export function buildHydratedContentRelativePath(
  item: Pick<TroveItem, "source" | "title" | "externalId">,
): string {
  const hash = crypto
    .createHash("sha1")
    .update(`${item.source}:${item.externalId}`)
    .digest("hex")
    .slice(0, 10);
  const fileName = `${slugify(item.title, item.source)}-${hash}.md`;
  return path.posix.join("content", item.source, fileName);
}

export function buildHydratedContentPath(
  paths: TrovePaths,
  item: Pick<TroveItem, "source" | "title" | "externalId">,
): string {
  return path.join(paths.root, buildHydratedContentRelativePath(item));
}

export function writeHydratedMarkdown(
  paths: TrovePaths,
  item: Pick<TroveItem, "source" | "title" | "externalId">,
  markdown: string,
): string {
  const outputPath = buildHydratedContentPath(paths, item);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");
  return outputPath;
}

export function renderMarkdownFrontmatter(
  fields: Record<string, string | string[] | undefined>,
): string {
  const lines = ["---"];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }

      lines.push(`${key}:`);
      for (const entry of value) {
        lines.push(`  - ${quoteYaml(entry)}`);
      }
      continue;
    }

    lines.push(`${key}: ${quoteYaml(value)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

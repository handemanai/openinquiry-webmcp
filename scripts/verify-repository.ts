// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const retiredNames = [
  ["he", "lix"].join(""),
  ["arca", "dia"].join(""),
  ["west", "bridge"].join(""),
];
const textExtensions = new Set([
  "", ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".ts",
  ".tsx", ".txt", ".yaml", ".yml",
]);

async function repositoryFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await repositoryFiles(absolute));
    if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolute);
    }
  }
  return files;
}

const findings: string[] = [];
for (const absolute of await repositoryFiles(repositoryRoot)) {
  const relative = path.relative(repositoryRoot, absolute).replaceAll(path.sep, "/");
  const searchable = `${relative}\n${await readFile(absolute, "utf8")}`.toLocaleLowerCase("en-US");
  for (const retiredName of retiredNames) {
    if (new RegExp(`\\b${retiredName}\\b`, "u").test(searchable)) {
      findings.push(`${relative}: contains retired fictional-organization language`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Repository language check passed.\n");
}

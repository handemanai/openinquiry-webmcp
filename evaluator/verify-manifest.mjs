// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = fileURLToPath(new URL("./manifest.json", import.meta.url));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function evaluatorFiles(directory, prefix = "evaluator") {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = `${prefix}/${entry.name}`;
    if (relative === "evaluator/manifest.json") continue;
    if (entry.isDirectory()) {
      paths.push(...await evaluatorFiles(path.join(directory, entry.name), relative));
    } else if (entry.isFile()) {
      paths.push(relative);
    } else {
      throw new Error(`Evaluator pack contains unsupported filesystem entry: ${relative}`);
    }
  }
  return paths;
}

function safeRepositoryPath(relative) {
  if (typeof relative !== "string" || relative.length === 0 || path.isAbsolute(relative)) {
    throw new Error(`Manifest path must be a non-empty relative path: ${String(relative)}`);
  }
  const normalized = path.posix.normalize(relative.replaceAll("\\", "/"));
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Manifest path escapes the repository: ${relative}`);
  }
  return path.join(repositoryRoot, normalized);
}

async function verifyRuntime(manifest, errors) {
  const minimumNodeMajor = manifest.runtime?.minimumNodeMajor;
  const runningNodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);
  if (
    !Number.isInteger(minimumNodeMajor)
    || !Number.isInteger(runningNodeMajor)
    || runningNodeMajor < minimumNodeMajor
  ) {
    errors.push(
      `Node.js ${String(minimumNodeMajor)} or newer is required; running ${process.version}`,
    );
  }

  for (const [packageName, expectedVersion] of Object.entries(
    manifest.runtime?.existingDependencies ?? {},
  )) {
    try {
      const packageJson = JSON.parse(await readFile(
        path.join(repositoryRoot, "node_modules", packageName, "package.json"),
        "utf8",
      ));
      if (packageJson.version !== expectedVersion) {
        errors.push(
          `${packageName}: expected installed version ${expectedVersion}, received ${String(packageJson.version)}`,
        );
      }
    } catch (error) {
      errors.push(
        `${packageName}: installed dependency could not be verified (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
}

export async function verifyManifest({ expectedDigest } = {}) {
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const declared = new Map();
  const errors = [];

  for (const entry of manifest.files ?? []) {
    if (declared.has(entry.path)) {
      errors.push(`duplicate manifest path: ${entry.path}`);
      continue;
    }
    declared.set(entry.path, entry.sha256);
    try {
      const digest = sha256(await readFile(safeRepositoryPath(entry.path)));
      if (digest !== entry.sha256) {
        errors.push(`${entry.path}: expected ${entry.sha256}, received ${digest}`);
      }
    } catch (error) {
      errors.push(`${entry.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const actualPackFiles = await evaluatorFiles(path.join(repositoryRoot, "evaluator"));
  const declaredPackFiles = [...declared.keys()]
    .filter((candidate) => candidate.startsWith("evaluator/"))
    .sort();
  if (JSON.stringify(actualPackFiles.sort()) !== JSON.stringify(declaredPackFiles)) {
    const missing = actualPackFiles.filter((candidate) => !declared.has(candidate));
    const absent = declaredPackFiles.filter((candidate) => !actualPackFiles.includes(candidate));
    if (missing.length > 0) errors.push(`unlisted evaluator files: ${missing.join(", ")}`);
    if (absent.length > 0) errors.push(`manifest lists absent evaluator files: ${absent.join(", ")}`);
  }

  const unsigned = structuredClone(manifest);
  delete unsigned.manifestDigest;
  const computedManifestDigest = sha256(canonicalJson(unsigned));
  if (computedManifestDigest !== manifest.manifestDigest) {
    errors.push(`manifest digest: expected ${manifest.manifestDigest}, received ${computedManifestDigest}`);
  }
  if (expectedDigest && computedManifestDigest !== expectedDigest) {
    errors.push(
      `external digest pin: expected ${expectedDigest}, received ${computedManifestDigest}`,
    );
  }
  await verifyRuntime(manifest, errors);

  return {
    ok: errors.length === 0,
    errors,
    manifest,
    manifestDigest: computedManifestDigest,
    externallyPinned: Boolean(expectedDigest),
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
  };
}

function expectedDigestFromArgs(args) {
  const marker = args.indexOf("--expected-digest");
  if (marker === -1) return undefined;
  const digest = args[marker + 1];
  if (!/^[a-f0-9]{64}$/u.test(digest ?? "")) {
    throw new Error("--expected-digest requires a lowercase SHA-256 digest");
  }
  return digest;
}

async function main() {
  const result = await verifyManifest({
    expectedDigest: expectedDigestFromArgs(process.argv.slice(2)),
  });
  process.stdout.write(`${JSON.stringify({
    pack: result.manifest.pack,
    manifestDigest: result.manifestDigest,
    externallyPinned: result.externallyPinned,
    runtime: result.runtime,
    filesVerified: result.manifest.files?.length ?? 0,
    ok: result.ok,
    errors: result.errors,
  }, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

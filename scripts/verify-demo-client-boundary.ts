// SPDX-License-Identifier: Apache-2.0

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const FORBIDDEN_CLIENT_PATHS = Object.freeze([
  "app/api/",
  "src/data/",
  "src/lib/application/",
  "src/lib/demo/relevant-sources.ts",
  "src/lib/integration/server-demo-session.ts",
  "src/lib/session/demo-session.ts",
] as const);

export const DEMO_CLIENT_BUNDLE_CANARIES = Object.freeze([
  Object.freeze({
    id: "physical-activity-protected-section",
    text:
      "The panel distinguished certainty in the recommendations from certainty in every implementation choice.",
  }),
  Object.freeze({
    id: "blood-pressure-protected-section",
    text:
      "An elevated value should be repeated using a reliable technique before it is treated as an established pattern.",
  }),
  Object.freeze({
    id: "diabetes-protected-section",
    text:
      "The value of screening depends on what happens after the test.",
  }),
  Object.freeze({
    id: "vaccination-protected-section",
    text:
      "The panel identified uncertainty about how best to reconcile records across organizations",
  }),
] as const);

const SOURCE_EXTENSIONS = Object.freeze([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const);

const NON_SCRIPT_IMPORT = /\.(?:css|less|sass|scss|svg|png|jpe?g|gif|webp|woff2?|ico)$/iu;
const PUBLIC_CLIENT_ASSET = /\.(?:m?js|m?js\.map)$/iu;

export interface ClientSourceBoundaryViolation {
  readonly forbiddenPath: string;
  readonly importChain: readonly string[];
}

export interface ClientSourceBoundaryReport {
  readonly visitedFiles: readonly string[];
  readonly violations: readonly ClientSourceBoundaryViolation[];
}

export interface ClientBundleCanaryViolation {
  readonly canaryId: (typeof DEMO_CLIENT_BUNDLE_CANARIES)[number]["id"];
  readonly assetPath: string;
}

export interface ClientBundleCanaryReport {
  readonly scannedAssets: readonly string[];
  readonly scannedRoots: readonly string[];
  readonly missingRequiredRoots: readonly string[];
  readonly violations: readonly ClientBundleCanaryViolation[];
}

interface SourceBoundaryOptions {
  readonly repositoryRoot?: string;
  /** Defaults to every `use client` module under app/ and src/. */
  readonly entryPaths?: readonly string[];
}

interface BundleCanaryOptions {
  readonly repositoryRoot?: string;
  readonly includeProduction?: boolean;
  readonly includeDevelopment?: boolean;
  readonly requireProduction?: boolean;
  readonly requireDevelopment?: boolean;
}

/**
 * Follows every runtime TypeScript/JavaScript import from every client entry.
 * Type-only imports are erased and therefore do not create a browser module
 * edge. Runtime imports of a corpus or server authority module fail closed.
 */
export function inspectDemoClientSourceBoundary(
  options: SourceBoundaryOptions = {},
): ClientSourceBoundaryReport {
  const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
  const entryPaths = options.entryPaths ?? discoverUseClientEntryPaths(repositoryRoot);
  const queue: string[] = [];
  const visited = new Set<string>();
  const parentByFile = new Map<string, string | null>();
  const violations: ClientSourceBoundaryViolation[] = [];
  const recordedForbidden = new Set<string>();

  for (const entryPath of entryPaths) {
    const absoluteEntry = resolve(repositoryRoot, entryPath);
    if (!existsSync(absoluteEntry)) {
      throw new Error(`Demo client entry does not exist: ${entryPath}`);
    }
    queue.push(absoluteEntry);
    parentByFile.set(absoluteEntry, null);
  }

  while (queue.length > 0) {
    const filePath = queue.shift()!;
    if (visited.has(filePath)) continue;
    visited.add(filePath);

    const sourceText = readFileSync(filePath, "utf8");
    for (const moduleSpecifier of runtimeModuleSpecifiers(filePath, sourceText)) {
      const dependency = resolveLocalModule(
        repositoryRoot,
        filePath,
        moduleSpecifier,
      );
      if (!dependency) continue;

      if (!parentByFile.has(dependency)) parentByFile.set(dependency, filePath);
      const repositoryPath = portableRelative(repositoryRoot, dependency);
      if (isForbiddenClientPath(repositoryPath)) {
        if (!recordedForbidden.has(repositoryPath)) {
          recordedForbidden.add(repositoryPath);
          violations.push(Object.freeze({
            forbiddenPath: repositoryPath,
            importChain: Object.freeze(
              buildImportChain(repositoryRoot, dependency, parentByFile),
            ),
          }));
        }
        continue;
      }

      if (SOURCE_EXTENSIONS.includes(extname(dependency) as (typeof SOURCE_EXTENSIONS)[number])) {
        queue.push(dependency);
      }
    }
  }

  return Object.freeze({
    visitedFiles: Object.freeze(
      [...visited].map((path) => portableRelative(repositoryRoot, path)).sort(),
    ),
    violations: Object.freeze(violations),
  });
}

/** Finds the actual React client boundaries instead of maintaining a hand list. */
export function discoverUseClientEntryPaths(
  repositoryRoot: string = process.cwd(),
): readonly string[] {
  const normalizedRoot = resolve(repositoryRoot);
  const candidates: string[] = [];
  for (const sourceRoot of ["app", "src"] as const) {
    const absoluteRoot = join(normalizedRoot, sourceRoot);
    if (existsSync(absoluteRoot)) collectSourceFiles(absoluteRoot, candidates);
  }
  return Object.freeze(
    candidates
      .filter((path) => hasUseClientDirective(path))
      .map((path) => portableRelative(normalizedRoot, path))
      .sort(),
  );
}

/** Scans every publicly served production/dev JavaScript asset and source map. */
export function inspectDemoClientBundleCanaries(
  options: BundleCanaryOptions = {},
): ClientBundleCanaryReport {
  const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
  const includeProduction = options.includeProduction !== false;
  const includeDevelopment = options.includeDevelopment !== false;
  const candidates = [
    Object.freeze({
      kind: "production",
      path: join(repositoryRoot, ".next", "static"),
      required: options.requireProduction === true,
    }),
    Object.freeze({
      kind: "development",
      path: join(repositoryRoot, ".next", "dev", "static"),
      required: options.requireDevelopment === true,
    }),
  ] as const;
  const scannedRoots: string[] = [];
  const missingRequiredRoots: string[] = [];
  const assets: string[] = [];

  for (const candidate of candidates) {
    if (
      (candidate.kind === "production" && !includeProduction) ||
      (candidate.kind === "development" && !includeDevelopment)
    ) {
      continue;
    }
    if (!existsSync(candidate.path)) {
      if (candidate.required) missingRequiredRoots.push(candidate.kind);
      continue;
    }
    scannedRoots.push(portableRelative(repositoryRoot, candidate.path));
    collectPublicClientAssets(candidate.path, assets);
  }

  const violations: ClientBundleCanaryViolation[] = [];
  for (const asset of [...new Set(assets)].sort()) {
    const contents = readFileSync(asset, "utf8");
    for (const canary of DEMO_CLIENT_BUNDLE_CANARIES) {
      if (!contents.includes(canary.text)) continue;
      violations.push(Object.freeze({
        canaryId: canary.id,
        assetPath: portableRelative(repositoryRoot, asset),
      }));
    }
  }

  return Object.freeze({
    scannedAssets: Object.freeze(
      [...new Set(assets)]
        .map((path) => portableRelative(repositoryRoot, path))
        .sort(),
    ),
    scannedRoots: Object.freeze(scannedRoots),
    missingRequiredRoots: Object.freeze(missingRequiredRoots),
    violations: Object.freeze(violations),
  });
}

function runtimeModuleSpecifiers(
  filePath: string,
  sourceText: string,
): readonly string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (
        ts.isStringLiteral(statement.moduleSpecifier) &&
        importDeclarationHasRuntimeEdge(statement)
      ) {
        specifiers.push(statement.moduleSpecifier.text);
      }
      continue;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      exportDeclarationHasRuntimeEdge(statement)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  return Object.freeze([...new Set(specifiers)]);
}

function importDeclarationHasRuntimeEdge(
  declaration: ts.ImportDeclaration,
): boolean {
  const clause = declaration.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function exportDeclarationHasRuntimeEdge(
  declaration: ts.ExportDeclaration,
): boolean {
  if (declaration.isTypeOnly) return false;
  if (!declaration.exportClause) return true;
  if (!ts.isNamedExports(declaration.exportClause)) return true;
  return declaration.exportClause.elements.some((element) => !element.isTypeOnly);
}

function resolveLocalModule(
  repositoryRoot: string,
  importer: string,
  moduleSpecifier: string,
): string | null {
  if (NON_SCRIPT_IMPORT.test(moduleSpecifier)) return null;
  let candidate: string;
  if (moduleSpecifier.startsWith("@/")) {
    candidate = resolve(repositoryRoot, moduleSpecifier.slice(2));
  } else if (moduleSpecifier.startsWith(".")) {
    candidate = resolve(dirname(importer), moduleSpecifier);
  } else {
    return null;
  }

  const candidates = [candidate];
  if (!extname(candidate)) {
    for (const extension of SOURCE_EXTENSIONS) candidates.push(`${candidate}${extension}`);
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(join(candidate, `index${extension}`));
    }
  }
  for (const path of candidates) {
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  throw new Error(
    `Could not resolve local runtime import ${JSON.stringify(moduleSpecifier)} from ${portableRelative(repositoryRoot, importer)}.`,
  );
}

function isForbiddenClientPath(repositoryPath: string): boolean {
  return FORBIDDEN_CLIENT_PATHS.some((forbidden) =>
    forbidden.endsWith("/")
      ? repositoryPath.startsWith(forbidden)
      : repositoryPath === forbidden
  );
}

function buildImportChain(
  repositoryRoot: string,
  target: string,
  parentByFile: ReadonlyMap<string, string | null>,
): string[] {
  const chain: string[] = [];
  let current: string | null = target;
  while (current) {
    chain.push(portableRelative(repositoryRoot, current));
    current = parentByFile.get(current) ?? null;
  }
  return chain.reverse();
}

function collectPublicClientAssets(directory: string, output: string[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectPublicClientAssets(path, output);
    else if (entry.isFile() && PUBLIC_CLIENT_ASSET.test(entry.name)) output.push(path);
  }
}

function collectSourceFiles(directory: string, output: string[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(path, output);
    else if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.includes(extname(entry.name) as (typeof SOURCE_EXTENSIONS)[number]) &&
      !entry.name.endsWith(".d.ts")
    ) {
      output.push(path);
    }
  }
}

function hasUseClientDirective(filePath: string): boolean {
  const sourceFile = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      return false;
    }
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function assertSourceReport(report: ClientSourceBoundaryReport): void {
  if (report.violations.length === 0) return;
  const details = report.violations.map((violation) =>
    `- ${violation.forbiddenPath}\n  ${violation.importChain.join(" -> ")}`
  ).join("\n");
  throw new Error(
    `Judge-demo client code reaches corpus/server modules:\n${details}`,
  );
}

function assertBundleReport(report: ClientBundleCanaryReport): void {
  if (report.missingRequiredRoots.length > 0) {
    throw new Error(
      `Required client build output is missing: ${report.missingRequiredRoots.join(", ")}.`,
    );
  }
  if (report.violations.length === 0) return;
  const details = report.violations.map((violation) =>
    `- ${violation.canaryId}: ${violation.assetPath}`
  ).join("\n");
  throw new Error(
    `Protected corpus canary found in publicly served JavaScript or source maps:\n${details}`,
  );
}

function runCli(): void {
  const args = new Set(process.argv.slice(2));
  const knownArgs = new Set(["--source", "--bundle", "--dev-bundle"]);
  const unknownArgs = [...args].filter((argument) => !knownArgs.has(argument));
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
  }
  const noMode = args.size === 0;
  const runSource = noMode || args.has("--source");
  const runBundle = noMode || args.has("--bundle") || args.has("--dev-bundle");

  if (runSource) {
    const report = inspectDemoClientSourceBoundary();
    assertSourceReport(report);
    console.log(
      `Demo client source boundary passed (${report.visitedFiles.length} runtime modules).`,
    );
  }

  if (runBundle) {
    const report = inspectDemoClientBundleCanaries({
      includeProduction: noMode || args.has("--bundle"),
      includeDevelopment: noMode || args.has("--dev-bundle"),
      requireProduction: args.has("--bundle"),
      requireDevelopment: args.has("--dev-bundle"),
    });
    assertBundleReport(report);
    console.log(
      `Demo client bundle canary scan passed (${report.scannedAssets.length} public JS/map assets across ${report.scannedRoots.length} build root(s)).`,
    );
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

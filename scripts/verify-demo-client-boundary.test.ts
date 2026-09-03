// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  DEMO_CLIENT_BUNDLE_CANARIES,
  discoverUseClientEntryPaths,
  inspectDemoClientBundleCanaries,
  inspectDemoClientSourceBoundary,
} from "./verify-demo-client-boundary";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { force: true, recursive: true })
    ),
  );
});

describe("judge-demo client corpus boundary", () => {
  it("keeps the real journal client graph corpus-free", () => {
    const entries = discoverUseClientEntryPaths();
    const report = inspectDemoClientSourceBoundary();

    expect(entries).toContain(
      "src/components/demo/publisher-decides-live.tsx",
    );
    expect(entries).toContain(
      "src/components/webmcp/knowledge-provider-bridge.tsx",
    );
    expect(entries.length).toBeGreaterThanOrEqual(5);
    expect(report.violations).toEqual([]);
    expect(report.visitedFiles).toContain("src/lib/demo/journal-guidelines-catalog.ts");
    expect(report.visitedFiles.some((path) => path.startsWith("src/data/")))
      .toBe(false);
  });

  it("reports the complete runtime import chain to a forbidden corpus module", async () => {
    const repositoryRoot = await makeTemporaryRepository();
    await writeSource(
      repositoryRoot,
      "src/client.tsx",
      '"use client";\nimport { value } from "./safe";\nvoid value;\n',
    );
    await writeSource(
      repositoryRoot,
      "src/safe.ts",
      'export { secret as value } from "@/src/data";\n',
    );
    await writeSource(
      repositoryRoot,
      "src/data/index.ts",
      'export const secret = "protected";\n',
    );

    const report = inspectDemoClientSourceBoundary({
      repositoryRoot,
      entryPaths: ["src/client.tsx"],
    });

    expect(report.violations).toEqual([
      {
        forbiddenPath: "src/data/index.ts",
        importChain: [
          "src/client.tsx",
          "src/safe.ts",
          "src/data/index.ts",
        ],
      },
    ]);
  });

  it("scans public production JavaScript and development source maps", async () => {
    const repositoryRoot = await makeTemporaryRepository();
    await writeSource(
      repositoryRoot,
      ".next/static/chunks/demo.js",
      `const leaked = ${JSON.stringify([
        DEMO_CLIENT_BUNDLE_CANARIES[0].text,
        DEMO_CLIENT_BUNDLE_CANARIES[2].text,
      ])};\n`,
    );
    await writeSource(
      repositoryRoot,
      ".next/dev/static/chunks/demo.js.map",
      JSON.stringify({
        sourcesContent: [
          DEMO_CLIENT_BUNDLE_CANARIES[1].text,
          DEMO_CLIENT_BUNDLE_CANARIES[3].text,
        ],
      }),
    );

    const report = inspectDemoClientBundleCanaries({
      repositoryRoot,
      requireProduction: true,
      requireDevelopment: true,
    });

    expect(report.missingRequiredRoots).toEqual([]);
    expect(report.violations).toEqual([
      {
        canaryId: "blood-pressure-protected-section",
        assetPath: ".next/dev/static/chunks/demo.js.map",
      },
      {
        canaryId: "vaccination-protected-section",
        assetPath: ".next/dev/static/chunks/demo.js.map",
      },
      {
        canaryId: "physical-activity-protected-section",
        assetPath: ".next/static/chunks/demo.js",
      },
      {
        canaryId: "diabetes-protected-section",
        assetPath: ".next/static/chunks/demo.js",
      },
    ]);
  });
});

async function makeTemporaryRepository(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "openinquiry-client-boundary-"));
  temporaryDirectories.push(path);
  return path;
}

async function writeSource(
  repositoryRoot: string,
  path: string,
  contents: string,
): Promise<void> {
  const target = join(repositoryRoot, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
}

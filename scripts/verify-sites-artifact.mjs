// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";

import { DEMO_CLIENT_BUNDLE_CANARIES } from "./verify-demo-client-boundary.ts";

const sourceConfigPath = ".openai/hosting.json";
const builtConfigPath = "dist/.openai/hosting.json";
const workerPath = "dist/server/index.js";
const publicAssetsPath = "dist/client";

await Promise.all([
  access(workerPath),
  access(builtConfigPath),
]);

const [sourceConfigText, builtConfigText] = await Promise.all([
  readFile(sourceConfigPath, "utf8"),
  readFile(builtConfigPath, "utf8"),
]);
const sourceConfig = JSON.parse(sourceConfigText);
const builtConfig = JSON.parse(builtConfigText);

assert.deepEqual(
  builtConfig,
  sourceConfig,
  "The Sites artifact must contain the current hosting configuration.",
);

const allowedKeys = new Set(["project_id", "d1", "r2", "capabilities"]);
for (const key of Object.keys(sourceConfig)) {
  assert.ok(allowedKeys.has(key), `Unsupported Sites hosting key: ${key}`);
}
assert.ok(
  sourceConfig.project_id === undefined
    || (typeof sourceConfig.project_id === "string" && sourceConfig.project_id.length > 0),
  "project_id must be absent during preparation or contain the Sites-issued ID.",
);
for (const binding of ["d1", "r2"]) {
  assert.ok(
    sourceConfig[binding] === null
      || (typeof sourceConfig[binding] === "string" && sourceConfig[binding].length > 0),
    `${binding} must be null or a non-empty logical binding name.`,
  );
}

const publicScripts = [];
const pendingDirectories = [publicAssetsPath];
while (pendingDirectories.length > 0) {
  const directory = pendingDirectories.pop();
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) pendingDirectories.push(path);
    else if (/\.(?:m?js|m?js\.map)$/iu.test(entry.name)) publicScripts.push(path);
  }
}

const clientCanaryViolations = [];
for (const path of publicScripts) {
  const contents = await readFile(path, "utf8");
  for (const canary of DEMO_CLIENT_BUNDLE_CANARIES) {
    if (contents.includes(canary.text)) {
      clientCanaryViolations.push(`${canary.id} in ${path}`);
    }
  }
}
assert.deepEqual(
  clientCanaryViolations,
  [],
  "Protected synthetic passages must not appear in the public Sites bundle.",
);

console.log(
  `Sites artifact boundary passed (${publicScripts.length} public JS/map assets scanned).`,
);

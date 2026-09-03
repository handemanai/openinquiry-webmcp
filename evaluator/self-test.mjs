// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { runEvaluator } from "./run.mjs";
import { verifyManifest } from "./verify-manifest.mjs";

const referenceAdapter = fileURLToPath(new URL("./adapters/reference-adapter.mjs", import.meta.url));
const rewritingAdapter = fileURLToPath(new URL("./adapters/rewriting-adapter.mjs", import.meta.url));
const processFailureAdapter = fileURLToPath(
  new URL("./adapters/process-failure-adapter.mjs", import.meta.url),
);

const integrity = await verifyManifest();
assert.equal(integrity.ok, true, `Manifest errors:\n${integrity.errors.join("\n")}`);

const priorProbe = process.env.OPENINQUIRY_EVALUATOR_PRIVATE_TEST;
process.env.OPENINQUIRY_EVALUATOR_PRIVATE_TEST = "must-not-reach-adapter";
let referenceReport;
let repeatedReferenceReport;
try {
  referenceReport = await runEvaluator({
    adapterCommand: [process.execPath, "--experimental-strip-types", referenceAdapter],
  });
  repeatedReferenceReport = await runEvaluator({
    adapterCommand: [process.execPath, "--experimental-strip-types", referenceAdapter],
  });
} finally {
  if (priorProbe === undefined) delete process.env.OPENINQUIRY_EVALUATOR_PRIVATE_TEST;
  else process.env.OPENINQUIRY_EVALUATOR_PRIVATE_TEST = priorProbe;
}
assert.equal(referenceReport.summary.result, "vectors_passed");
assert.equal(referenceReport.summary.failed, 0);
assert.equal(referenceReport.adapter.environmentProbe, "not_present");
assert.deepEqual(repeatedReferenceReport, referenceReport);

const negativeControlReport = await runEvaluator({
  adapterCommand: [process.execPath, "--experimental-strip-types", rewritingAdapter],
});
assert.equal(negativeControlReport.summary.result, "vectors_failed");
assert.equal(negativeControlReport.summary.failed, 1);
const negativeControlCase = negativeControlReport.cases.find(
  (candidate) => candidate.id === "client-unknown-field-rejected-not-sanitized",
);
assert.equal(negativeControlCase?.result, "fail");
assert.ok(negativeControlCase?.failures.includes("expected reject, received accept"));
assert.ok(
  negativeControlCase?.failures.includes(
    "rejected input was returned in rewritten or normalized form",
  ),
);
assert.ok(
  negativeControlReport.cases
    .filter((candidate) => candidate.id !== "client-unknown-field-rejected-not-sanitized")
    .every((candidate) => candidate.result === "pass"),
  "The rewriting negative control failed an unrelated vector",
);

await assert.rejects(
  runEvaluator({
    adapterCommand: [
      process.execPath,
      "--experimental-strip-types",
      processFailureAdapter,
      "nonzero",
    ],
  }),
  /Adapter did not exit cleanly/u,
);
await assert.rejects(
  runEvaluator({
    adapterCommand: [
      process.execPath,
      "--experimental-strip-types",
      processFailureAdapter,
      "oversized",
    ],
  }),
  /stdout line exceeded the 1 MiB protocol limit/u,
);

process.stdout.write(`${JSON.stringify({
  pack: integrity.manifest.pack,
  manifestDigest: integrity.manifestDigest,
  referenceAdapter: referenceReport.summary,
  deterministicRepeat: repeatedReferenceReport.reportDigest === referenceReport.reportDigest,
  adapterEnvironmentSanitized: referenceReport.adapter.environmentProbe === "not_present",
  negativeControlDetected: true,
  processControlsDetected: true,
  result: "self_test_passed",
}, null, 2)}\n`);

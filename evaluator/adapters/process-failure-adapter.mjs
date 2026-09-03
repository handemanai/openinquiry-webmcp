// SPDX-License-Identifier: Apache-2.0

// Deliberately non-conforming process controls used only by self-test.
import { serveAdapter } from "../adapter-runtime.mjs";
import {
  canonicalDiagnostics,
  evaluateCanonicalResponse,
} from "../canonical-validation.mjs";

const mode = process.argv.at(-1);

if (mode === "oversized") {
  process.stdin.once("data", () => {
    process.stdout.write(`${"x".repeat(1_048_577)}\n`);
  });
} else if (mode === "nonzero") {
  process.stdin.on("end", () => {
    process.exitCode = 7;
  });
  serveAdapter({
    implementation: {
      name: "OpenInquiry evaluator nonzero-exit control",
      version: "0.0.0",
      capabilities: ["response-validation", "lossless-forwarding"],
    },
    evaluate(response) {
      const result = evaluateCanonicalResponse(response);
      if (!result.accepted) {
        return { decision: "reject", diagnostics: canonicalDiagnostics(result) };
      }
      return { decision: "accept", response, diagnostics: [] };
    },
  });
} else {
  throw new Error("Expected process-failure mode: oversized or nonzero");
}

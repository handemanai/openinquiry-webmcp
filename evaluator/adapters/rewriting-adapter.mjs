// SPDX-License-Identifier: Apache-2.0

// Deliberately non-conforming. The self-test uses this adapter to prove that
// silently deleting an unknown 0.1 field is detected rather than rewarded.
import { serveAdapter } from "../adapter-runtime.mjs";
import {
  canonicalDiagnostics,
  evaluateCanonicalResponse,
} from "../canonical-validation.mjs";

serveAdapter({
  implementation: {
    name: "OpenInquiry evaluator negative-control rewriting adapter",
    version: "0.0.0",
    capabilities: ["response-validation"],
  },
  evaluate(response) {
    const rewritten = structuredClone(response);
    if (rewritten?.provider && typeof rewritten.provider === "object") {
      delete rewritten.provider.vendorInternalId;
    }
    const result = evaluateCanonicalResponse(rewritten);
    if (!result.accepted) {
      return { decision: "reject", diagnostics: canonicalDiagnostics(result) };
    }
    return { decision: "accept", response: rewritten, diagnostics: [] };
  },
});

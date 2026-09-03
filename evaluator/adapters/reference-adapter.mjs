// SPDX-License-Identifier: Apache-2.0

import { serveAdapter } from "../adapter-runtime.mjs";
import {
  canonicalDiagnostics,
  evaluateCanonicalResponse,
} from "../canonical-validation.mjs";

serveAdapter({
  implementation: {
    name: "OpenInquiry 0.1 reference evaluator adapter",
    version: "0.1.0",
    capabilities: ["response-validation", "lossless-forwarding"],
    environmentProbe: process.env.OPENINQUIRY_EVALUATOR_PRIVATE_TEST === undefined
      ? "not_present"
      : "unexpectedly_present",
  },
  evaluate(response) {
    const result = evaluateCanonicalResponse(response);
    if (!result.accepted) {
      return {
        decision: "reject",
        diagnostics: canonicalDiagnostics(result),
      };
    }
    return {
      decision: "accept",
      response,
      diagnostics: [],
    };
  },
});

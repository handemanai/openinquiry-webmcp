// SPDX-License-Identifier: Apache-2.0

import {
  CANONICAL_PROFILE_SCHEMA_ID,
  CANONICAL_PROFILE_VALIDATOR,
  formatCanonicalProfileErrors,
  validateCanonicalProfileResponse,
} from "../tests/verification/profile-schema-validator.mjs";
import { validateKnowledgeResponse } from "../src/lib/profile/validation.ts";

export {
  CANONICAL_PROFILE_SCHEMA_ID,
  CANONICAL_PROFILE_VALIDATOR,
};

export function evaluateCanonicalResponse(response) {
  const schema = validateCanonicalProfileResponse(response);
  const semantic = validateKnowledgeResponse(response);
  return {
    accepted: schema.length === 0 && semantic.length === 0,
    schema,
    semantic,
  };
}

export function canonicalDiagnostics(result) {
  return [
    ...formatCanonicalProfileErrors(result.schema).map((message) => ({
      layer: "schema",
      message,
    })),
    ...result.semantic.map((message) => ({
      layer: "semantic",
      message,
    })),
  ];
}

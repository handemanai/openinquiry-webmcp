// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const canonicalSchemaUrl = new URL(
  "../../schemas/openinquiry-profile-0.1.schema.json",
  import.meta.url,
);
const canonicalSchema = JSON.parse(await readFile(canonicalSchemaUrl, "utf8"));

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: true,
});
addFormats(ajv, { mode: "full" });

const validateResponse = ajv.compile(canonicalSchema);

export const CANONICAL_PROFILE_SCHEMA_ID = canonicalSchema.$id;
export const CANONICAL_PROFILE_VALIDATOR = "ajv-2020+ajv-formats";

function decodePointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function instancePathToDisplayPath(instancePath) {
  if (!instancePath) return "response";
  return instancePath
    .split("/")
    .slice(1)
    .map(decodePointerToken)
    .reduce((path, token) => (/^\d+$/u.test(token) ? `${path}[${token}]` : `${path}.${token}`), "response");
}

function errorPath(error) {
  const base = instancePathToDisplayPath(error.instancePath);
  if (error.keyword === "required") return `${base}.${error.params.missingProperty}`;
  if (error.keyword === "additionalProperties") return `${base}.${error.params.additionalProperty}`;
  return base;
}

export function validateCanonicalProfileResponse(value) {
  if (validateResponse(value)) return [];
  return (validateResponse.errors ?? []).map((error) => ({
    path: errorPath(error),
    keyword: error.keyword,
    message: error.message ?? "schema validation failed",
    schemaPath: error.schemaPath,
  }));
}

export function formatCanonicalProfileErrors(errors) {
  return errors.map(({ path, keyword, message, schemaPath }) =>
    `${path}: ${message} (${keyword} at ${schemaPath})`);
}

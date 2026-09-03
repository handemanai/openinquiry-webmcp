// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { validateCanonicalProfileResponse } from "./profile-schema-validator.mjs";

const fixtures = JSON.parse(await readFile(
  new URL("../../evaluator/fixtures/base-responses.json", import.meta.url),
  "utf8",
));
const entitled = fixtures.publisher;
const canonicalSchema = JSON.parse(await readFile(
  new URL("../../schemas/openinquiry-profile-0.1.schema.json", import.meta.url),
  "utf8",
));
const requestAjv = new Ajv2020({ allErrors: true, strict: true });
addFormats(requestAjv, { mode: "full" });
requestAjv.addSchema(canonicalSchema);

function requestValidator(definitionName) {
  const validator = requestAjv.getSchema(`${canonicalSchema.$id}#/$defs/${definitionName}`);
  assert.ok(validator, `missing request validator ${definitionName}`);
  return validator;
}

function invalidMutation(mutate) {
  const payload = structuredClone(entitled);
  mutate(payload);
  return validateCanonicalProfileResponse(payload);
}

describe("canonical OpenInquiry Draft 2020-12 evaluation", () => {
  it("resolves $ref/$defs constraints instead of accepting an invalid identifier", () => {
    const errors = invalidMutation((payload) => {
      payload.provider.id = "identifier with spaces";
    });
    assert.ok(errors.some(({ path, keyword, schemaPath }) =>
      path === "response.provider.id"
      && keyword === "pattern"
      && schemaPath.includes("/$defs/Identifier/pattern")));
  });

  it("asserts date-time formats", () => {
    const errors = invalidMutation((payload) => {
      payload.receipt.issuedAt = "2026-08-26";
    });
    assert.ok(errors.some(({ path, keyword }) =>
      path === "response.receipt.issuedAt" && keyword === "format"));
  });

  it("rejects nested additional properties through a referenced definition", () => {
    const errors = invalidMutation((payload) => {
      payload.resources[0].authors[0].credential = "MD";
    });
    assert.ok(errors.some(({ path, keyword }) =>
      path === "response.resources[0].authors[0].credential"
      && keyword === "additionalProperties"));
  });

  it("enforces the link_only conditional that forbids content", () => {
    const errors = invalidMutation((payload) => {
      payload.grants[0].representation = "link_only";
    });
    assert.ok(errors.some(({ path, keyword, schemaPath }) =>
      path === "response.grants[0]"
      && keyword === "not"
      && schemaPath.includes("/allOf/0/then/not")));
  });

  it("allows versionless discovery while keeping later requests versioned", () => {
    const describe = requestValidator("KnowledgeDescribeRequest");
    const access = requestValidator("KnowledgeAccessRequest");

    assert.equal(describe({}), true);
    assert.equal(describe({ profileVersion: "0.1", requestId: "describe-001" }), true);
    assert.equal(describe({ profileVersion: "9.9" }), false);
    assert.equal(access({}), false);
    assert.equal(access({ profileVersion: "0.1" }), true);
  });

  it("requires focus for passage-level retrieval and rejects no-op context", () => {
    const retrieve = requestValidator("KnowledgeRetrieveRequest");
    const search = requestValidator("KnowledgeSearchRequest");
    const base = {
      profileVersion: "0.1",
      resourceId: "journal-guideline-2026-041",
    };

    assert.equal(retrieve({ ...base, requestedRepresentation: "quotation" }), false);
    assert.equal(retrieve({ ...base, requestedRepresentation: "full_text" }), false);
    assert.equal(retrieve({
      ...base,
      requestedRepresentation: "full_text",
      focusedQuery: "weekly physical activity",
      maxCharacters: 20_000,
    }), true);
    assert.equal(retrieve({
      ...base,
      requestedRepresentation: "quotation",
      focusedQuery: "weekly physical activity",
    }), true);
    assert.equal(retrieve({
      ...base,
      requestedRepresentation: "quotation",
      locator: {
        sectionId: "weekly-activity-recommendation",
        sectionTitle: "Recommendations for adults",
        page: "4",
      },
    }), true);
    assert.equal(retrieve({
      ...base,
      requestedRepresentation: "quotation",
      locator: { sectionTitle: "Display text is not authority" },
    }), false);
    assert.equal(retrieve({ ...base, requestedRepresentation: "abstract" }), true);
    assert.equal(search({
      profileVersion: "0.1",
      query: "physical activity",
      locale: "en-US",
    }), false);
  });

  it("does not impose the retired 1,500-character profile ceiling", () => {
    const payload = structuredClone(entitled);
    payload.grants[0].representation = "full_text";
    payload.grants[0].content = "Complete provider-supplied article text. ".repeat(100);
    delete payload.grants[0].locator;

    assert.deepEqual(validateCanonicalProfileResponse(payload), []);
  });
});

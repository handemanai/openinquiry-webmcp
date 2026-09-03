/**
 * Dependency-free conformance smoke test.
 *
 * Run from the repository root:
 *   node --experimental-strip-types src/lib/profile/conformance.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { evaluateRetrieval } from "./policy.ts";
import { receiptHasOnlyMinimizedFields } from "./receipts.ts";
import {
  PROFILE_VERSION,
  type KnowledgeResource,
  type ProviderIdentity,
  type ResourcePolicy,
  type RetrievalEvaluationInput,
  type TrustedAccessContext,
} from "./types.ts";
import { validateKnowledgeResponse } from "./validation.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(`${repositoryRoot}/${relativePath}`, "utf8"));
}

const schemaPaths = [
  "schemas/openinquiry-profile-0.1.schema.json",
  "schemas/odrl-conceptual-mapping.json",
  "schemas/response.schema.json",
  "schemas/requests/knowledge-describe.schema.json",
  "schemas/requests/knowledge-access.schema.json",
  "schemas/requests/knowledge-search.schema.json",
  "schemas/requests/knowledge-retrieve.schema.json",
  "schemas/requests/knowledge-resolve.schema.json",
  "schemas/requests/knowledge-open.schema.json",
  "schemas/requests/knowledge-status.schema.json",
  "schemas/objects/provider.schema.json",
  "schemas/objects/resource.schema.json",
  "schemas/objects/access.schema.json",
  "schemas/objects/rights.schema.json",
  "schemas/objects/content-grant.schema.json",
  "schemas/objects/action.schema.json",
  "schemas/objects/error.schema.json",
  "schemas/objects/source-receipt.schema.json",
];

const fixtureCollection = readJson(
  "evaluator/fixtures/base-responses.json",
) as Record<string, unknown>;
const fixtures = Object.entries(fixtureCollection)
  .filter(([name]) => name !== "$license");

const bundle = readJson(schemaPaths[0]) as Record<string, unknown>;
assert.equal(bundle.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.ok(bundle.$defs && typeof bundle.$defs === "object");
const definitions = bundle.$defs as Record<string, unknown>;

function collectObjectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, keys));
    return keys;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key);
    collectObjectKeys(child, keys);
  }
  return keys;
}

const forbiddenClientAuthorityFields = [
  "accessState",
  "accessBasis",
  "authToken",
  "authenticationToken",
  "entitlement",
  "entitlementKeys",
  "userId",
];
for (const [name, schema] of Object.entries(definitions)) {
  if (!name.endsWith("Request") && name !== "RequestContextBase") continue;
  const keys = collectObjectKeys(schema);
  for (const forbidden of forbiddenClientAuthorityFields) {
    assert.equal(keys.has(forbidden), false, `${name} must not accept client authority field ${forbidden}`);
  }
}

for (const path of schemaPaths) {
  const schema = readJson(path) as Record<string, unknown>;
  assert.ok(schema && typeof schema === "object", `${path} must contain a JSON object`);
  if (typeof schema.$ref === "string" && schema.$ref.includes("#/$defs/")) {
    const definitionName = schema.$ref.split("#/$defs/")[1];
    assert.ok(definitions[definitionName], `${path} references missing definition ${definitionName}`);
  }
}

for (const [name, fixture] of fixtures) {
  const errors = validateKnowledgeResponse(fixture);
  assert.deepEqual(
    errors,
    [],
    `evaluator fixture ${name} failed profile validation:\n${errors.join("\n")}`,
  );
}

const entitledFixture = fixtureCollection.publisher as Record<string, unknown>;
const minimizedReceipt = entitledFixture.receipt as Record<string, unknown>;
assert.equal(receiptHasOnlyMinimizedFields(minimizedReceipt), true);
assert.equal(receiptHasOnlyMinimizedFields({ ...minimizedReceipt, rawQuery: "forbidden" }), false);
assert.ok(
  validateKnowledgeResponse({
    ...entitledFixture,
    receipt: { ...minimizedReceipt, prompt: "forbidden" },
  }).some((error) => error.includes("non-minimized")),
  "runtime validation must reject accidental prompt retention",
);

const provider: ProviderIdentity = {
  id: "journal-of-guidelines",
  name: "The Journal of Guidelines",
  role: "publisher",
  canonicalUrl: "https://openinquiry.example/publisher",
  policyUrl: "https://openinquiry.example/publisher/agent-access",
};

const resource: KnowledgeResource = {
  id: "journal-policy-test",
  type: "journal_article",
  title: "Synthetic Policy Conformance Record",
  authors: [{ name: "Journal Demonstration Authors" }],
  responsibleOrganization: "The Journal of Guidelines",
  canonicalUrl: "https://openinquiry.example/demo/article/journal-policy-test",
  deepLink: "https://openinquiry.example/demo/article/journal-policy-test#unit",
  locator: { sectionTitle: "Bounded unit", sectionId: "unit" },
  dates: { published: "2026-08-01", checked: "2026-08-26T20:00:00Z" },
  version: "1.0",
  status: "current",
};

const policy: ResourcePolicy = {
  policyId: "journal-test-policy-0.1",
  providerId: provider.id,
  policyUrl: provider.policyUrl,
  requiredEntitlement: "journal-test-entitlement",
  publicRepresentations: ["metadata", "abstract", "link_only"],
  entitledRepresentations: ["metadata", "abstract", "quotation"],
  fallbackRepresentation: "abstract",
  allowedUses: ["display", "link", "quote", "summarize", "compare"],
  representationAllowedUses: {
    abstract: ["display", "link", "summarize", "compare"],
    quotation: ["display", "link", "quote", "summarize", "compare"],
  },
  prohibitedUses: ["bulk_export", "redistribute", "persistent_storage", "model_training"],
  maxCharacters: 120,
  maxSegments: 1,
  attribution: {
    required: true,
    text: "The Journal of Guidelines synthetic record.",
    mustLinkToCanonical: true,
  },
  requestedHandling: {
    retention: "transient_only",
    training: "not_permitted",
    verification: "not_verified_by_webmcp",
  },
  accessActions: [
    {
      type: "institutional_access",
      label: "Check institutional access",
      url: "https://openinquiry.example/publisher/institution-access",
      providerId: provider.id,
    },
  ],
};

const entitledAccess: TrustedAccessContext = {
  providerId: provider.id,
  state: "entitled",
  basis: "institutional_license",
  basisLabel: "Fictional full-article access",
  validUntil: "2026-09-01T00:00:00Z",
  entitlementKeys: ["journal-test-entitlement"],
};

const baseInput: RetrievalEvaluationInput = {
  request: {
    profileVersion: PROFILE_VERSION,
    requestId: "policy-test-001",
    requestedUse: ["quote"],
    resourceId: resource.id,
    requestedRepresentation: "quotation",
    maxCharacters: 120,
  },
  provider,
  resource,
  policy,
  trustedAccess: entitledAccess,
  availableContent: {
    abstract: "Public synthetic abstract. Not for clinical use.",
    quotation: "Entitled synthetic bounded unit. Not for clinical use.",
  },
  receipt: { receiptId: "policy-test-receipt-001", issuedAt: "2026-08-26T20:00:00Z" },
};

const entitled = evaluateRetrieval(baseInput);
assert.equal(entitled.status, "ok");
assert.equal(entitled.access?.state, "entitled");
assert.equal(entitled.grants?.[0]?.representation, "quotation");
assert.deepEqual(validateKnowledgeResponse(entitled), []);

const limited = evaluateRetrieval({
  ...baseInput,
  trustedAccess: {
    providerId: provider.id,
    state: "not_entitled",
    basis: "public_web",
    entitlementKeys: [],
  },
  receipt: { receiptId: "policy-test-receipt-002", issuedAt: "2026-08-26T20:01:00Z" },
});
assert.equal(limited.status, "limited");
assert.equal(limited.access?.state, "not_entitled");
assert.equal(limited.grants?.[0]?.representation, "abstract");
assert.equal(limited.error?.code, "ENTITLEMENT_REQUIRED");
assert.deepEqual(validateKnowledgeResponse(limited), []);

const denied = evaluateRetrieval({
  ...baseInput,
  policy: {
    ...policy,
    allowedUses: ["display", "link", "summarize"],
    representationAllowedUses: {
      ...policy.representationAllowedUses,
      quotation: ["display", "link", "summarize"],
    },
  },
  receipt: { receiptId: "policy-test-receipt-003", issuedAt: "2026-08-26T20:02:00Z" },
});
assert.equal(denied.status, "denied");
assert.equal(denied.error?.code, "USE_NOT_PERMITTED");
assert.equal(denied.grants, undefined);
assert.deepEqual(validateKnowledgeResponse(denied), []);

const corrected = evaluateRetrieval({
  ...baseInput,
  resource: {
    ...resource,
    status: "corrected",
    statusNote: "The provider supplied the corrected current unit.",
    statusUrl: `${resource.canonicalUrl}/status`,
  },
  receipt: { receiptId: "policy-test-receipt-004", issuedAt: "2026-08-26T20:03:00Z" },
});
assert.equal(corrected.status, "ok");
assert.equal(corrected.warnings?.[0]?.code, "RESOURCE_CORRECTED");
assert.deepEqual(validateKnowledgeResponse(corrected), []);

const retracted = evaluateRetrieval({
  ...baseInput,
  resource: {
    ...resource,
    status: "retracted",
    statusNote: "The provider retracted this synthetic record.",
    statusUrl: `${resource.canonicalUrl}/retraction`,
  },
  receipt: { receiptId: "policy-test-receipt-005", issuedAt: "2026-08-26T20:04:00Z" },
});
assert.equal(retracted.status, "denied");
assert.equal(retracted.error?.code, "RESOURCE_RETRACTED");
assert.equal(retracted.grants, undefined);
assert.deepEqual(validateKnowledgeResponse(retracted), []);

process.stdout.write(
  `OpenInquiry 0.1 conformance passed: ${schemaPaths.length} schemas, ${fixtures.length} fixtures, 5 policy cases, receipt minimization.\n`,
);

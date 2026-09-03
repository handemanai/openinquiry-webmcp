<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Verification guide

OpenInquiry verifies the visible physician and judge experience together with
the publisher decision beneath it. A green build alone is not enough.

## One-command repository check

```sh
npm run check
```

This runs:

1. ESLint with no warnings.
2. Next.js route type generation and TypeScript checking.
3. Vitest unit and integration tests.
4. A repository-language scan that rejects retired fictional organizations.
5. A scan that keeps protected synthetic passages out of client source.
6. Runtime profile conformance tests.
7. WebMCP registration and validation tests.
8. JSON Schema 2020-12 tests.
9. The independent evaluator self-test.

## Production and browser checks

```sh
npm run build
npm run test:browser:production
```

The production build repeats the protected-content scan against emitted browser
bundles. The Playwright suite checks the landing page, guided demo, all four
publisher outcomes, tool discovery and execution, source opening, route cleanup,
responsive composition, and automated accessibility.

## Focused commands

```sh
npm run test
npm run verify:demo-client-boundary
npm run verify:profile-runtime
npm run verify:webmcp-runtime
npm run verify:profile-schema
npm run verify:evaluator
```

## What local checks establish

They establish that this working tree:

- applies access and rights decisions on the server;
- rejects agent-supplied authority;
- returns the documented result for each fictional policy state, including
  complete article text only when entitlement and assurance are both recognized;
- avoids unrelated and partial-word search results;
- carries sequential retrieval counters in a text-free signed session ledger
  while treating exact retries as idempotent;
- preserves source identity, status, links, and minimized receipts;
- registers and removes route-scoped tools through the expected WebMCP API;
- keeps protected source text out of ordinary client code; and
- renders the tested browser journeys accessibly at the tested sizes.

## What local checks do not establish

They do not establish:

- that the working tree is deployed;
- that a named WebMCP client can invoke the deployed tools;
- that a real publisher recognizes the profile;
- that an assurance credential exists or is independently verified;
- that an agent obeyed retention, training, storage, redistribution, or citation
  instructions after receiving content;
- that the synthetic medical text is suitable for care; or
- that OpenInquiry is a standard, certification, or legal license.
- that the demo ledger closes simultaneous-request races; production requires
  an atomic shared store and operational controls.

## Named-client evidence

A compatibility claim must record the date, exact commit, deployed URL, client
and version, discovered tool inventory, representative requests and results,
and visible canonical navigation. Test shims prove the application's browser
adapter, not interoperability with a named external client.

## Current deployment evidence

On September 3, 2026, the competition snapshot was deployed publicly at
<https://openinquiry-publisher-demo.brianp.chatgpt.site>. Unauthenticated HTTPS
checks returned 200 for the landing page, presentation, walkthrough, journal,
and article. A production API request returned the complete 14,373-character
article in the highest-permission state with both exercise targets intact.

Codex's in-app browser then discovered all seven page tools on that public URL,
searched for the intended guideline, confirmed its current status, retrieved
the same complete article, repeated it idempotently, and opened the exact
supporting section. This proves the dated reference deployment and named-client
path; it does not establish independent assurance, publisher adoption, or
compatibility with every WebMCP client.

## Release record

Use [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md) for the full set of release
outcomes. Record failures as failures. Do not replace an unavailable external
test with a stronger claim based on local evidence.

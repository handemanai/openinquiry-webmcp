<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# OpenInquiry release acceptance matrix

This matrix defines the evidence required before the current working tree is a
commit candidate. A local pass proves repository behavior only. Deployment,
named-client compatibility, and publisher adoption require separate evidence.

| Area | Required outcome | Evidence |
| --- | --- | --- |
| Product scope | Public routes show one fictional medical journal and no retired product identities. | Repository search plus browser route review. |
| First impression | The landing page names OpenInquiry, states the publisher-control idea, and offers the demo, presentation, and future-work paths. | Browser test and visual review. |
| Demo instruction | The three-step walkthrough explains the user role, two publisher conditions, and how to run the live demo. | Browser test at desktop and mobile sizes. |
| Assurance honesty | Judge controls are labeled as a simulation of publisher recognition; WebMCP is not described as the verifier. | Copy search, unit test, and browser review. |
| Session authority | Agent tool input cannot set entitlement or assurance. | Session, route, and client-boundary tests. |
| Signed state | The server validates signed demo state before deriving publisher policy. | Session codec and route tests. |
| Four outcomes | The same request produces the four documented combinations of reader access and recognized assurance. | Knowledge-service and browser tests. |
| Tool inventory | The journal homepage registers all seven `knowledge_*` tools; an article registers only the five operations meaningful in article context. | Runtime unit test and browser test. |
| Tool discovery | `knowledge_describe` works without a pre-known version and advertises the current version, supported versions, and a live same-origin schema. | Runtime, route, schema, and browser tests. |
| Tool composition | A provider-issued locator returned by search or retrieval can be passed unchanged into `knowledge_open`; display-only locator fields cannot select content by themselves. | Runtime, route, and production browser tests. |
| Route cleanup | Tools unregister when the browser leaves the journal route. | Runtime and browser tests. |
| Request validation | Unknown, malformed, oversized, and authority-bearing fields fail closed. | Runtime, route, and profile tests. |
| Search relevance | The target physical-activity question finds its guideline without unrelated matches; precise one-word searches work; partial-word substrings do not match. | Knowledge-service regression tests. |
| Retrieval relevance | Returned excerpts come from the requested relevant section, not an arbitrary article prefix. | Knowledge-service and browser tests. |
| Retrieval intent | Passage-level requests require a focused query or provider-issued locator, and requested evidence cannot be starved by generic context at a small character budget. | Runtime, schema, service, and route tests. |
| Retrieval completeness and bounds | Full entitlement plus recognized assurance returns the complete article; other states return the documented provider-selected substitute. The profile imposes no universal character ceiling, and any resource-, session-, use-, or caller-specific limit is honored. | Policy, schema, and knowledge-service tests. |
| Sequential retrieval budget | A compact, text-free ledger is signed into the HTTP-only session; an exact retry is idempotent while distinct cumulative protected requests remain bounded. | Session-ledger and HTTP-route tests. |
| Evidence reset | Browser evidence is tied to the active scenario and cleared when the judge changes it; no server process cache retains the response. | Component state and browser tests. |
| Reader and agent policy | Reader access alone does not authorize complete agent supply; complete tool delivery requires full entitlement plus recognized assurance. Copy does not claim that current browsers block ordinary page observation. | Knowledge-service, copy, and protected-content boundary tests. |
| Source identity | Useful results preserve provider, title, authors, status, access, rights, and canonical link. | Profile and service tests. |
| Source receipt | Receipts omit full prompts, raw queries, credentials, tokens, patient data, and permanent identifiers. | Receipt, schema, and bundle boundary tests. |
| Status handling | Updated or corrected sources carry warnings; retracted or withdrawn content is denied. | Profile conformance tests. |
| Canonical opening | `knowledge_open` accepts structured locators, rejects caller URLs, and opens an allowlisted same-origin source section. | Bridge and browser tests. |
| Error privacy | Transport and validation failures do not echo raw input, response bodies, or server details. | Bridge and route tests. |
| Client code boundary | Protected synthetic passages do not appear in browser source or built bundles except on authorized reader pages. | `verify:demo-client-boundary` and production build. |
| Schema conformance | Canonical JSON Schema and runtime semantic validation agree on valid and invalid examples. | `verify:profile-schema` and `verify:profile-runtime`. |
| Evaluator integrity | The independent evaluator files match their manifest and its self-test passes. | `verify:evaluator`. |
| Accessibility | Key routes have no serious or critical automated accessibility violations and remain keyboard operable. | Playwright plus Axe checks. |
| Responsive layout | Landing, walkthrough, presentation, demo controls, and source reader avoid clipping and horizontal overflow. | Browser suite and visual review. |
| Claim boundary | Copy says proposal, fictional demo, synthetic content, and not for clinical use; it does not claim adoption or downstream verification. | Repository copy audit and visual review. |
| Browser assurance boundary | `/next-steps` identifies a browser-enforced, tool-only content channel as future work and explicitly says current WebMCP does not provide it. | Copy search and browser review. |
| Repository hygiene | No browser state, screenshots, build output, secrets, or dependency folders are staged. | `.gitignore`, status review, and secret-pattern scan. |

## Commit-candidate commands

```sh
npm run check
npm run build
npm run test:browser:production
```

## Current external checkpoint

On September 3, 2026, the competition snapshot was deployed publicly to
ChatGPT Sites and invoked through Codex's in-app WebMCP client. The public route,
API, complete-article, exact-retry, minimized-receipt, and canonical-opening
checks passed. See the verification guide for the bounded claim.

## Evidence still required before final submission

- Re-run and redeploy after any further source edit so the final commit and Site
  stay identical.
- Final desktop and mobile screenshots from the deployed build.
- A narrated public demo video under three minutes.
- Signed-out confirmation that the competition repository is public, but only
  after its visibility change is explicitly authorized.

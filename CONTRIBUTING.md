# Contributing to OpenInquiry

OpenInquiry 0.1 is a discussion draft and fictional reference implementation.
Contributions should make publisher-controlled knowledge access more useful,
testable, understandable, or honest about its limits.

## Start with the product boundary

The current demonstration is The Journal of Guidelines. A reader visits the
journal, an agent discovers page-local `knowledge_*` tools, and the journal's
server decides what the current session may receive. The visible journal and
the tools must use the same access and rights logic.

The proposed profile covers shared tool names, requests, result fields, source
links, access and rights decisions, stable errors, and privacy-minimized source
receipts. It does not provide authentication, subscriptions, legal licensing,
credential issuance, downstream enforcement, or publisher adoption.

## Useful contributions

- A concrete publisher or reader journey that exposes a weak decision boundary.
- A narrowly scoped request, response, status, link, or receipt change with
  compatibility and privacy analysis.
- Positive and negative conformance fixtures.
- Reference implementation work that preserves server authority.
- Verification of access differences, retrieval bounds, search relevance,
  receipt minimization, route registration, accessibility, or named-client use.
- Clearer documentation grounded in behavior the repository can prove.

## Before changing the contract

Read:

1. [`PUBLISHER_KNOWLEDGE_ACCESS_PROFILE.md`](PUBLISHER_KNOWLEDGE_ACCESS_PROFILE.md)
2. [`schemas/README.md`](schemas/README.md)
3. [`docs/verification/ACCEPTANCE_MATRIX.md`](docs/verification/ACCEPTANCE_MATRIX.md)
4. [`docs/standards/STABILIZATION_PACKAGE.md`](docs/standards/STABILIZATION_PACKAGE.md)

A contract proposal should identify the user journey, the organization with
authority, the resource, the current limitation, the smallest proposed change,
and its privacy, security, accessibility, rights, and compatibility effects.

## Content and privacy rules

- Use only original synthetic or explicitly permissioned content.
- Label demo medicine fictional, synthetic, and not for clinical use.
- Do not add patient data, PHI, credentials, tokens, cookies, private queries,
  complete prompts, or permanent user identifiers.
- Do not copy paywalled text, real journal passages, clinical guidance, or
  unlicensed media.
- Record every third-party asset and license in [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).
- Never accept entitlement or assurance as an agent-controlled request field.

## Claim language

Use `discussion draft`, `proposal`, `fictional reference implementation`, and
precise dated test statements. Do not call OpenInquiry an adopted standard,
certification, production publisher integration, or universal WebMCP solution.
Do not claim verified zero retention, no training, enforced citation, payment,
royalties, creator compensation, or downstream compliance.

## Development and verification

```sh
npm ci
npm run check
npm run build
npm run test:browser:production
```

A build alone is insufficient. Changes must verify their user-visible effect
and the underlying contract. For a client compatibility claim, record the date,
commit, browser or app version, discovered tools, raw results, and visible
navigation. A fake runtime test proves the adapter behavior, not compatibility
with a named external client.

## Licensing

Software and executable schema/test contributions are Apache-2.0. Original
synthetic content and documentation are CC BY 4.0. By contributing, you confirm
that you have the right to submit the work under the relevant license.

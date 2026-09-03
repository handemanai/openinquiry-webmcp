# OpenInquiry discussion-draft stabilization

**Status:** Proposed work after the hackathon reference demonstration
**Scope:** Standards discussion, not a claim of adoption

OpenInquiry 0.1 is a narrow, testable proposal. The current reference product
shows one publisher making one resource decision at a time. That is enough to
demonstrate the user experience and the server authority boundary, but not
enough to call the format an interoperable standard.

## Keep 0.1 narrow

- Freeze the request and response shape at an immutable release commit.
- Treat one resource decision as the meaningful unit: source, status, access,
  rights, supplied content, actions, and receipt.
- Keep search and multi-resource status results metadata-only.
- Describe receipts as provider-issued event records, not audit proofs,
  licenses, usage reports, or payment records.
- Separate JSON Schema validity from semantic conformance.
- Ask for counterexamples and implementation reports before asking for adoption.

## Work needed for a later version

- Resource-scoped decisions in multi-result responses.
- Clear organization and authority relationships.
- Capability, version, and extension negotiation.
- Status authority, effective time, replacement links, and refresh behavior.
- One receipt per resource decision with defined digest and retention semantics.
- Byte budgets for complete responses, not only text units.
- Privacy-preserving continuation and rate-limit behavior.
- A real model for independently issued agent-handling credentials.

## Evidence before stronger maturity claims

A future interoperability candidate should have at least two independent
provider implementations and two independent client implementations, plus
published failures, privacy and security review, accessibility evidence, and a
clear migration path.

A real pilot also needs legal and operational owners for authentication,
publisher rights, credentials, incident response, revocation, and measurement.

See [Governance and issue templates](GOVERNANCE_AND_ISSUE_TEMPLATES.md) for a
possible open discussion process. The repository does not currently represent a
governance body, certification program, or participating publisher.

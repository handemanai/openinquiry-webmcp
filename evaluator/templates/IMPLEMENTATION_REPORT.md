<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# OpenInquiry 0.1 external-adapter evaluator implementation report

> Evidence report only. This document is not certification, an interoperability mark, adoption, production approval, a security review, a legal/content-rights opinion, or clinical validation.

## Implementation identity

- Organization/team:
- Provider or client role:
- Adapter name:
- Adapter source repository and revision:
- Adapter artifact SHA-256:
- Evaluated implementation repository and revision:
- Runtime and operating system:
- Evaluator command:

## Evaluator identity

- Pack name/version:
- Manifest SHA-256:
- Canonical profile schema ID:
- Canonical schema file SHA-256:
- Semantic validator file SHA-256:
- Run report SHA-256:

## Observed vector result

- Total:
- Passed:
- Failed:
- Failed vector IDs and adapter diagnostics:

Attach the unmodified JSON report. A pass means only that the named adapter accepted/rejected and preserved the included vectors against the exact manifest.

## Implementation boundary observed

- Where does the adapter sit in the user journey?
- Which provider/application service makes the actual allow/limit/deny decision?
- Which trusted session or server facts inform that decision?
- Which profile tools and resource types are implemented?
- Does the adapter serialize real implementation output, a fixture, or both?
- What data crosses the adapter boundary?

## Provider authority and content rights

- What content does the provider own, license, govern, or merely resolve?
- For third-party resources, who is the actual rights holder?
- What permits the evaluated implementation to return each representation?
- What protected-content sentinels or denial checks were run separately?

## Privacy and security evidence outside this pack

- Request minimization and PHI/sensitive-query policy:
- Receipt-key allowlist and telemetry inventory:
- Authentication and client-asserted entitlement rejection:
- Output clamping and cumulative/session budgets:
- Repeated-call/overlap/reconstruction controls:
- Retraction/withdrawal enforcement:
- Canonical-navigation allowlist:
- Security, privacy, legal, accessibility, and content-rights reviewers:

## Live client and visible user outcome

- Named WebMCP/browser/agent client, exact version, and date:
- Deployed revision and URL:
- Route-local tool inventory:
- Raw tool result retained:
- Visible provider identity, status, rights/access basis, and canonical action retained:
- Visible open/deep-link behavior observed:
- Accessibility and truncation observations:

## Known gaps and dissent

- Unimplemented 0.1 behavior:
- Adapter-specific normalization not exercised by these vectors:
- Production controls not observed:
- Client preservation/display not observed:
- Legal or policy questions:
- Reviewer dissent or unresolved risk:

## Safe result statement

Use language no broader than:

> On [revision], [adapter name/version] passed [count] OpenInquiry 0.1 evaluator vectors under externally recorded manifest digest [digest]. [If repeated: A second run produced the same report digest.] This is local adapter evidence only, not certification or proof of production interoperability, security, authority, downstream compliance, or adoption.

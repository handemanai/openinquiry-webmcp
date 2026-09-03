# OpenInquiry agent operating contract

## Product authority

Read these before changing the project:

1. `README.md`
2. `PUBLISHER_KNOWLEDGE_ACCESS_PROFILE.md`
3. `ORCHESTRATION.md`
4. `docs/verification/ACCEPTANCE_MATRIX.md`

OpenInquiry is a focused demonstration of publisher-controlled knowledge access
on a fictional medical journal. The visible product and the page-local WebMCP
tools must use the same server-side access and rights decisions.

## Non-negotiable product truths

- The judge-facing product is one fictional publication, The Journal of Guidelines.
- Reuse the shared `knowledge_*` tool vocabulary and common response envelope.
- Enforce access and rights decisions in shared server application logic. Never
  trust entitlement or assurance values supplied in an agent request.
- Treat reader access and material supplied to an agent as separate decisions.
- Every meaningful result carries authorship, provider identity, current status,
  access basis, rights decision, canonical links, and a privacy-minimized source
  receipt.
- Never store a full prompt, raw clinical query, PHI, authentication token, or
  persistent universal user identifier in a receipt.
- The judge-facing assurance control simulates a publisher recognizing an
  independently issued agent credential. WebMCP does not issue or verify that
  credential, and the control is not a production security mechanism.
- Do not claim enforced citation, verified zero retention or no training,
  creator payment, real publisher adoption, or an established standard.
- Use only original synthetic or explicitly permissioned medical content and
  label it not for clinical use.

## Experience bar

Build for a physician and a hackathon judge. The application should feel like a
calm, authoritative medical publication. Explain the architecture through
visible consequences: who controls the content, what the reader can open, what
the agent received, and where the exact source lives.

Avoid generic AI gradients, chat-dashboard patterns, dense developer controls,
and decorative complexity. A judge should understand the central idea before
they need to inspect implementation details.

## Collaboration boundaries

- The root task owns integration, dependency choices, deployment, and final acceptance.
- Delegated work must stay within its assigned files.
- Preserve unrelated work. Do not reset, delete, or restore files outside scope.
- Report files changed, verification performed, and remaining risks.

## Verification

Verify both the user-visible behavior and the underlying contract. Relevant
proof includes route rendering, tool registration, response-schema conformance,
access differences, exact canonical navigation, receipt minimization,
accessibility, search relevance, and browser-visible state changes.

No deployment, Devpost submission, remote repository creation, or public
publishing without explicit user authorization.

## Licensing

- Software and executable schema/test code: Apache License 2.0.
- Original synthetic content and documentation: CC BY 4.0.
- Third-party assets retain their licenses and must be recorded in `ATTRIBUTIONS.md`.

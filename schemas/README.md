# OpenInquiry profile schemas

`openinquiry-profile-0.1.schema.json` is the canonical JSON Schema 2020-12 bundle. Its top-level schema validates a `KnowledgeResponse`; named request and object contracts are available under `$defs`. The reference application also serves this contract from the versioned, same-origin path advertised by `knowledge_describe`.

Thin `$ref` entry points in `requests/` and `objects/` let WebMCP registration and application code consume one contract without copying it. They intentionally accept no authentication token, entitlement claim, conversation transcript, or universal user identifier.

The canonical acceptance checks compile this bundle with `ajv@8` through its Draft 2020-12 entry point and `ajv-formats`, with format assertion enabled. Those checks materially exercise local `$ref`/`$defs`, nested object constraints, conditionals, and `date`, `date-time`, and `uri` formats.

The separate runtime check is `validateKnowledgeResponse` in `src/lib/profile/validation.ts`. It enforces profile-specific relationships that JSON Schema alone does not conveniently express: matching provider/receipt IDs, canonical actions, minimized receipt fields, status/decision alignment, correction warnings, and denial of retracted or withdrawn retrievals. It complements the canonical schema and is not used as a substitute for standards-based schema evaluation.

`odrl-conceptual-mapping.json` is an explicit mapping only. It does not claim ODRL serialization or conformance.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evaluator adapter I/O contract

An adapter is any executable that reads one JSON object per line from standard input and writes exactly one JSON object per line to standard output. It may be written in any language and may wrap a provider serializer, client parser, schema library, HTTP fixture boundary, or other implementation seam. It must not print logs to standard output; use standard error for bounded diagnostic logs.

Protocol identifier:

```text
openinquiry-independent-evaluator/0.1
```

This is the evaluator transport version, not a new OpenInquiry profile version.

## 1. Handshake

Evaluator request:

```json
{
  "protocol": "openinquiry-independent-evaluator/0.1",
  "id": "handshake",
  "operation": "handshake",
  "adapterMetadata": {
    "opaqueHandshakeProbe": "must survive unchanged",
    "manifestDigest": "..."
  }
}
```

Adapter response:

```json
{
  "protocol": "openinquiry-independent-evaluator/0.1",
  "id": "handshake",
  "implementation": {
    "name": "Example adapter",
    "version": "git-or-release-identity",
    "capabilities": ["response-validation", "lossless-forwarding"]
  },
  "adapterMetadata": {
    "opaqueHandshakeProbe": "must survive unchanged",
    "manifestDigest": "..."
  }
}
```

`implementation` is evidence identity, not a certification claim. The adapter must echo `adapterMetadata` exactly, including unknown keys, arrays, nulls, and nesting.

## 2. Evaluate a response

The evaluator sends a materialized candidate response. It does not disclose whether the vector is expected to pass.

```json
{
  "protocol": "openinquiry-independent-evaluator/0.1",
  "id": "vector-id",
  "operation": "evaluate_response",
  "response": { "profile": { "name": "...", "version": "0.1" } },
  "adapterMetadata": { "unknownEvaluatorField": "preserve me" }
}
```

For an accepted response, return the exact response without normalization:

```json
{
  "protocol": "openinquiry-independent-evaluator/0.1",
  "id": "vector-id",
  "decision": "accept",
  "response": { "profile": { "name": "...", "version": "0.1" } },
  "diagnostics": [],
  "adapterMetadata": { "unknownEvaluatorField": "preserve me" }
}
```

For a rejected response, omit `response` so invalid or sensitive input is not echoed. Return at least one diagnostic:

```json
{
  "protocol": "openinquiry-independent-evaluator/0.1",
  "id": "vector-id",
  "decision": "reject",
  "diagnostics": [
    {
      "layer": "schema",
      "message": "provider.vendorInternalId is not allowed"
    }
  ],
  "adapterMetadata": { "unknownEvaluatorField": "preserve me" }
}
```

Diagnostics are evidence for implementers and are not required to match the reference wording. The evaluator independently checks the vector against the canonical schema and semantic validator.

## 3. Preservation and unknown fields

These rules are intentionally different at the two layers:

- OpenInquiry 0.1 profile objects are closed. An unknown field inside `response` must cause rejection. An adapter must not delete the field, accept the remainder, or return a normalized response.
- `adapterMetadata` is evaluator-transport data outside the profile. The adapter must echo it exactly even when it contains unknown nested fields.
- An accepted OpenInquiry response must be returned exactly. Preserve array order and every optional field, including author/contributor display order, identifiers, provider and rights-holder identity, dates, locators, status notes and warnings, access basis, rights limits and handling declarations, canonical actions, receipts, and errors.

This evaluator proves transport preservation only. It does not prove that a user-facing agent displayed those fields or honored provider-declared handling requirements.

## 4. Process behavior

- Read requests sequentially and emit one response for each request ID.
- Finish each JSON object with a newline.
- The runner is not a sandbox. It does not block adapter filesystem or network access. Run only trusted adapter code, or place the command in a separately managed operating-system or container sandbox.
- The runner passes a small environment allowlist rather than the caller's complete environment. Do not require credentials, tokens, or application secrets.
- Do not access the network unless the implementation owner separately authorizes and documents it. The reference adapter makes no network calls.
- Keep each stdout JSON line under 1 MiB. The runner terminates on oversized, malformed, unexpected, or timed-out protocol output.
- Avoid prompts, queries, credentials, tokens, patient data, or protected content in adapter logs.
- Exit with status 0 when standard input closes. A nonzero exit, signal, or delayed exit fails the run even if every response was already emitted.
- Respond within five seconds per vector under the default runner.

See [`adapters/reference-adapter.mjs`](./adapters/reference-adapter.mjs) for the smallest complete implementation.

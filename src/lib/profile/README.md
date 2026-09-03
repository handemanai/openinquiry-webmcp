# OpenInquiry profile implementation

This directory implements OpenInquiry 0.1 as a provider-side decision contract.
It is not an adopted standard, a credential service, or a production licensing
system.

## What the publisher enforces

The publisher application controls:

- which tools appear on each page;
- which trusted session facts become `TrustedAccessContext`;
- which resources and representations are public or access-limited;
- the returned representation and any publisher- or caller-selected character limit;
- current, updated, corrected, retracted, and withdrawn status;
- canonical and access-path actions; and
- the fields written to the source receipt.

The response can request, but cannot verify, downstream attribution, retention,
deletion, redistribution, training, storage, or citation behavior. Therefore
`requestedHandling.verification` is always `not_verified_by_webmcp`.

The profile has no universal character ceiling. A publisher may impose a limit
for a particular resource, representation, session, or use; `full_text` means
the complete provider-supplied work when policy permits that representation.

## Integration path

1. Resolve the authenticated site session on the server.
2. Construct `TrustedAccessContext` from that trusted state. Never parse it from
   WebMCP input.
3. Locate the provider-owned resource and candidate content units.
4. Call `evaluateRetrieval` through the same application service used by the
   visible journal.
5. Return the common result and show its canonical action to the reader.
6. Validate results with `validateKnowledgeResponse` at test or trust boundaries.

The JSON Schema and runtime validator are complementary. JSON Schema checks the
shape. The runtime validator checks relationships such as matching provider and
receipt IDs, resource-bound grants, status warnings, and canonical actions.

Run:

```sh
node --experimental-strip-types src/lib/profile/conformance.ts
```

The source uses explicit `.ts` import extensions so the conformance runner can
execute directly in current Node.js versions.

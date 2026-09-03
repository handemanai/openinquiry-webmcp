<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# OpenInquiry demo capability review

## Bottom line

The strongest demonstration is a single, credible journal. The Journal of Guidelines exposes real page-local WebMCP tools while
its server applies publisher policy to the same ordinary-language question.
Changing the reader entitlement or whether the publisher recognizes the
proposed external credential changes the evidence the agent receives, not
merely a label in the interface.

## Recommended judge journey

1. Begin at `/` and choose **Run the demonstration**.
2. Advance through the three short explanation pages at `/demo/publisher-decides`.
3. On `/demo`, open **Demo controls**.
4. Select **Full article access** and **No qualifying credential recognized**.
5. Copy the question and its separately labeled Site Tools instruction, ask it
   with the journal page open, and inspect the complete relevant section plus the exact
   supporting section.
6. Change only whether the fictional publisher recognizes the proposed external
   credential to **Zero-retention claim recognized**, then
   ask the same question again.
7. Confirm that the second response contains the complete article while the
   first contains the complete relevant section.

## What is technically meaningful

- The agent request contains no entitlement or assurance flag.
- A signed fictional session determines the two conditions on the server.
- The policy engine can allow, narrow, substitute, or deny a requested representation.
- Retrieval selects the complete question-relevant section when assurance is
  not recognized and the complete article when entitlement and assurance are
  both recognized.
- The journal returns a validated common envelope with provider, author, status,
  access basis, rights, canonical/deep links, and a minimized receipt.
- `knowledge_open` moves the reader to the canonical source context; it is not
  mislabeled as a read-only operation.
- Client registration is route-scoped and stale tools unregister on navigation.
- Protected-content canaries are checked against client source and emitted bundles.

## What the demonstration does not prove

- It does not prove a real publisher has adopted OpenInquiry.
- It does not prove a real publisher deployment or an independently governed
  credential integration.
- It does not prove that WebMCP verifies zero retention, training, storage,
  redistribution, or citation behavior after content leaves the journal.
- It does not establish a standard, legal license, payment rail, or certification.

## Public production observation

On September 3, 2026, Codex's in-app browser opened the public ChatGPT Sites
build and discovered all seven WebMCP tools from the journal page. The complete
43-test production browser suite separately confirmed focused and partial-word
search behavior at the page-tool boundary.

The current policy contract asks `knowledge_retrieve` for `full_text`. With the
fictional full-article session selected but no qualifying credential recognized,
the publisher substitutes the complete **Recommendations for adults** section.
After the judge changes only the publisher-recognition simulation, a direct
in-app-browser call returns one 14,373-character `full_text` grant containing
the numerical aerobic and strengthening targets and the article's final review
section. The response still says the claim is not verified by WebMCP, and
`knowledge_open` moves and focuses the visible page at
`#weekly-activity-recommendation`.

An exact repeat returned the same complete text and remained `ok`, confirming
that it is idempotent rather than rate-limited. The browser carries a compact retrieval ledger in the rotated
signed session cookie; the ledger contains representation/digest-bound unit
identifiers and counters, not the question or returned text. Distinct cumulative
requests remain subject to provider policy.

Repository checks, the 43-test production-browser suite, unauthenticated HTTPS
route and API checks, and the direct public in-app-browser invocation establish
the deployed reference behavior. They do not establish an independent
credential issuer, real subscription system, or publisher adoption.

## Highest-value external evidence

The best remaining competition evidence is a concise narrated capture of this
verified public workflow. A second independent WebMCP client or implementation
would strengthen the interoperability claim; it should identify the client,
version, date, URL, and commit without overstating what it proves.

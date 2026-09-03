# OpenInquiry Publisher Knowledge Access Profile 0.1

**Status:** Discussion draft
**Reference product:** The fictional Journal of Guidelines
**Clinical use:** None. All medical content in the demo is synthetic.

## Plain-language summary

WebMCP lets a website offer tools to an agent visiting the page. OpenInquiry
proposes a shared set of knowledge tools and result fields for publisher sites.
The goal is simple: make the publisher's own website a first-class place for an
agent to find, request, and open authoritative material.

The publisher still decides what leaves the site. A reader's subscription or
institutional access does not automatically authorize an agent to receive the
complete work. The site can return metadata, an abstract, a summary, a complete
section, full text, a link, or a denial, based on policy enforced on the server.

OpenInquiry also explores a separate trust question: should a publisher return
more material when it recognizes a credible assurance about how the agent will
handle that material? Version 0.1 can describe requested limits such as
transient use and no model training. WebMCP does not verify that an agent obeyed
those limits. Issuing and verifying such a credential would require separate
identity, governance, revocation, and enforcement systems.

## Why this profile exists

Without a publisher-defined agent path, a useful answer can be separated from
the source, author, current publication status, access path, and exact section a
reader should inspect. A generic scraping path also gives the publisher little
control over the amount or form of content supplied.

This profile gives a site a common way to:

- describe its agent-facing capabilities;
- report access derived from the current site session;
- search publisher-selected records;
- supply a publisher-permitted representation of one resource;
- explain how to obtain access;
- open the canonical source or exact supporting section; and
- check whether a resource is current, updated, corrected, retracted, or withdrawn.

## What belongs to WebMCP and what does not

| Layer | Responsibility |
| --- | --- |
| WebMCP | Page-local tool discovery, input schemas, invocation, cancellation, and tool annotations. |
| OpenInquiry profile | Shared `knowledge_*` names, request fields, result fields, errors, links, rights decisions, and receipts. |
| Publisher application | Authentication, subscription or institutional access, resource lookup, status authority, rights policy, rate limits, and the exact content returned. |
| External assurance system | Credential issuance, subject binding, scope, expiration, revocation, verification, and audit. |
| Agent and its operators | Compliance with retention, training, redistribution, storage, citation, and other downstream obligations. |

The profile must not make a responsibility appear solved merely because a JSON
field names it.

## Conformance language

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe requirements
for this discussion draft. Conformance to this repository does not mean that a
publisher, browser vendor, standards organization, or rights holder has adopted
or approved OpenInquiry.

## Shared tools

An implementation MAY register only the tools appropriate to the current page,
but every registered tool MUST use the definitions below.

### `knowledge_describe`

Describes the provider, profile version, collections, resource types, and
available capabilities. A caller MAY omit `profileVersion` from this discovery
request; if it supplies one, the provider validates it normally. The response
identifies the current and supported versions and a same-origin URL for the
canonical schema. It does not grant access.

### `knowledge_access`

Reports the access state recognized from trusted provider-side session data.
The request MUST NOT contain an entitlement, cookie, token, membership claim,
or assurance state.

### `knowledge_search`

Searches the provider's selected index and returns source metadata. Search
results MUST NOT include protected content unless a separate rights decision
allows it. Implementations SHOULD require meaningful query overlap so generic
words and incidental body text do not create misleading matches.

### `knowledge_retrieve`

Requests one representation of one provider-issued resource. The request can
narrow the desired use, representation, locator, focused question, and maximum
size. It cannot widen access.

### `knowledge_resolve`

Returns a legitimate access path, such as sign-in, subscription, institutional
access, or the canonical public page. It does not claim that access succeeded.

### `knowledge_open`

Returns a provider-chosen same-origin canonical or deep-link action. The caller
supplies a resource ID and an optional structured locator, not an arbitrary URL.
Clients SHOULD be able to pass a provider-issued locator returned by discovery
or retrieval into `knowledge_open` unchanged. Human-readable locator fields do
not create authority without a provider-issued section, page, figure, or time
selector.

### `knowledge_status`

Returns current publication status and version information for provider-issued
resource IDs. A client SHOULD check status when currentness matters.

## Request boundary

Every request except `knowledge_describe` includes `profileVersion`.
`knowledge_describe` may omit it so a new caller can discover the contract.
Depending on the tool, a request may also include:

- an opaque request ID;
- requested use on `knowledge_retrieve`;
- search words and narrow filters;
- provider-issued resource IDs;
- a structured section, page, figure, or time locator;
- requested representation; and
- a maximum character count.

Requests MUST NOT include:

- passwords, cookies, or authentication tokens;
- subscription, membership, or institutional entitlement claims;
- an assertion that the agent is trusted or has zero retention;
- a complete conversation or prompt;
- patient information or another sensitive raw query; or
- an arbitrary destination URL.

The publisher application MUST derive access from trusted server-side state.
Unknown request fields are rejected rather than silently treated as authority.
Focused retrieval (`full_text`, `recommendation`, `quotation`, figure
description, or transcript segment) MUST include either a focused query or a
provider-issued locator. Metadata, abstract, and summary requests do not
require one. The focus lets a provider choose the relevant substitute when its
policy does not permit the requested representation.

## Common result

Every tool returns a `KnowledgeResponse` with:

- profile name and version;
- outcome status;
- provider identity; and
- a source receipt.

When relevant, the result also contains:

- access decision;
- rights decision;
- resources and authors;
- content actually supplied by the provider;
- canonical or access actions;
- warnings; and
- a stable error.

The canonical JSON Schema is
[`schemas/openinquiry-profile-0.1.schema.json`](schemas/openinquiry-profile-0.1.schema.json).
The TypeScript model is [`src/lib/profile/types.ts`](src/lib/profile/types.ts).

## Source and author identity

A useful resource result MUST preserve:

- provider ID, name, role, and canonical site;
- resource ID, type, title, and authors;
- canonical URL and, when available, an exact deep link;
- publication and update dates when known;
- current status and version; and
- a structured locator for the returned section, page, figure, or time range.

Metadata is part of the answer, not decorative text added later by an agent.

## Access decision

`access.state` describes what the publisher recognizes for this request:

- `public`
- `entitled`
- `limited`
- `not_entitled`
- `unknown`

`access.basis` explains why, using values such as public web, open access,
personal subscription, institutional license, or a demo session. `decidedBy`
identifies the provider that made the decision.

An access decision describes the provider session. It does not, by itself,
authorize every representation or use.

## Rights decision

The rights decision states whether the provider allows, limits, or denies the
requested use. It can include:

- a policy identifier and link;
- allowed uses such as display, link, quote, summarize, or compare;
- prohibited uses such as bulk export, redistribution, persistent storage, or
  model training;
- character, segment, or expiry limits; and
- required attribution and canonical linking.

These are provider instructions and declared limits. The response is not proof
that a downstream agent complied.

## Content supplied by the provider

A `ContentGrant` is the exact unit the provider supplied. The plain-language UI
calls this “what the journal supplied.” It identifies:

- the resource;
- the representation, such as abstract, summary, full text, quotation, or link only;
- the returned text when text is allowed;
- the locator; and
- an optional digest of that returned unit.

The profile does not impose a universal character ceiling. A provider MAY set
a limit for a resource, representation, session, or requested use, and a caller
MAY ask for a smaller response with `maxCharacters`. When both are present, the
smaller limit controls. `full_text` means the complete provider-supplied work;
callers SHOULD omit `maxCharacters` when requesting it. A digest MUST cover
only the returned unit, whether that unit is a section or a complete work.

## Status and corrections

Resource status is `current`, `updated`, `corrected`, `retracted`, `withdrawn`,
or `unknown`. Corrected and updated results carry a warning. A retracted or
withdrawn resource cannot return a substantive representation through
`knowledge_retrieve`; the response directs the reader to the provider's status
record instead.

## Canonical actions

A provider action includes a type, label, URL, and provider ID. The provider,
not the agent, chooses the destination. Clients MUST validate the returned URL
against the current provider and source before opening it.

The reference implementation allows only same-origin journal routes and keeps
section focus bounded to the returned locator.

## Source receipt

The source receipt is a small record of the provider boundary event. It records:

- receipt ID and issue time;
- provider and tool;
- resource IDs;
- access state and basis when relevant;
- policy ID;
- whether material was supplied, limited, denied, or metadata-only;
- an optional digest of the returned unit; and
- whether the receipt follows session or provider retention policy.

A receipt MUST NOT contain the full prompt, raw clinical query, patient data,
authentication material, the assurance credential, or a permanent universal
user identifier. It is not a legal license, compliance proof, payment record,
or evidence of downstream citation.

## Stable errors

The profile distinguishes a malformed `INVALID_REQUEST` from an actually
oversized `REQUEST_TOO_LARGE` request and from a semantically
`QUERY_TOO_BROAD` search. It also defines errors for missing entitlement,
disallowed use, missing or retracted resources, sensitive queries, rate limits,
provider failure, and unsupported versions. Errors SHOULD identify only a safe
schema-owned field path and must not echo sensitive input or server details.

## Proposed agent-handling assurance

Version 0.1 can state that the publisher requests transient handling and does
not permit model training. The required verification value is
`not_verified_by_webmcp`.

The demo's judge-facing control represents two publisher observations:

1. no qualifying external credential was recognized; or
2. the publisher recognized a qualifying external credential for this
   fictional session.

The control does not let an agent add the claim to a tool request. The server
still reads signed site state. The control is a teaching device, not a proposed
production credential interface.

A real assurance design would need answers for:

- who may issue a credential;
- how it is bound to a specific agent, operator, model, and execution path;
- which data practices it covers;
- how scope and purpose are limited;
- how publishers verify signatures and issuer trust;
- when assertions expire and how they are revoked;
- how subprocessors and tool calls are covered;
- what evidence supports the assertion; and
- what remedy exists when behavior differs from the assertion.

Those questions belong to future work and external governance, not to a Boolean
field controlled by the user or agent.

## Reference policy experiment

The Journal of Guidelines applies one question across four conditions:

| Reader access | External assurance recognized | Publisher result |
| --- | --- | --- |
| Guest preview | No | Public abstract |
| Guest preview | Yes | Abstract and publisher-written summary |
| Full article access | No | The complete question-relevant section |
| Full article access | Yes | Complete article text |

The complete article remains available on the reader-facing canonical page for
entitled readers. In the highest-permission state, the provider also supplies
that complete article through the tool for transient, attributed use. This does
not grant bulk export, redistribution, persistent storage, or model training.

## Privacy and security requirements

Implementations MUST:

- keep trusted access and assurance state out of tool input;
- validate every request before application execution;
- reject unknown fields;
- prevent one provider or session from borrowing another's authority;
- apply provider-declared result limits and bound cumulative retrieval;
- treat publisher output as data, not executable instructions;
- prevent arbitrary or cross-origin navigation;
- avoid sensitive values in errors, logs, receipts, and browser state; and
- keep protected source text out of client code unless that page is authorized
  to display it.

The reference demo carries sequential retrieval counters in a compact signed
session ledger containing only provider, resource, representation/digest-bound
unit IDs, and character counts. Exact retries are idempotent; distinct
cumulative retrievals remain bounded. It is designed to survive ordinary
process changes without storing the question or returned text. This is not a complete distributed abuse
control: production implementations need atomic shared state for simultaneous
requests, monitoring, and publisher-specific enforcement.

## Conformance and evidence

Structural validity uses JSON Schema 2020-12. The runtime validator adds
relationships that schema alone does not express cleanly, including matching
provider and receipt IDs, resource-bound grants, canonical actions, status
warnings, and minimized receipts.

Repository tests can prove the local implementation follows these rules. A
claim about a named WebMCP client needs separate dated evidence from that client.
A claim about a real publisher needs that publisher's explicit participation.

## Non-goals for 0.1

OpenInquiry 0.1 does not define:

- identity, login, subscriptions, or institutional federation;
- credential issuance or verification;
- legal license negotiation;
- usage reporting, royalties, or creator payment;
- downstream storage or training enforcement;
- mandatory citation behavior;
- global discovery across publishers;
- clinical guidance quality or fitness for care; or
- standards governance or certification.

## License

The profile text and original synthetic documentation are available under
CC BY 4.0. Executable schema, test, and application code are Apache-2.0. This
licensing choice does not settle trademark, patent, publisher-contract, or
standards-governance questions.

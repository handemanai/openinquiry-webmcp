# OpenInquiry implementation and release ledger

## Objective

Show that a publisher can offer a useful agent experience on its own website
without turning a reader's access into unrestricted machine access. The demo
must make four facts immediately visible:

1. the journal controls the source;
2. the server decides what the current session may receive;
3. the agent gets a publisher-selected, source-linked result; and
4. the reader can inspect the complete canonical source, without claiming that
   current WebMCP prevents an agent-capable browser from observing that page.

## Product shape

The Journal of Guidelines is one fictional medical publication with five
original synthetic articles. Its visible interface and seven page-local
`knowledge_*` tools call the same application service and policy engine.

The judge journey is intentionally narrow: entrance, proposal, three-step demo
introduction, live journal, and canonical article reader.

## Experience direction

- **Visual thesis:** a composed medical editorial publication with warm paper,
  strong typography, restrained color, and the quiet authority of a journal.
- **Content plan:** establish the problem, show one concrete policy comparison,
  expose the technical proof only when useful, then return the judge to the
  exact source.
- **Interaction thesis:** progressive explanation before the live surface,
  visible state changes when one policy condition changes, and a clear
  transition from agent result to canonical article section.

## Implemented proof

- Seven WebMCP tools register on the journal homepage. An open article replaces
  them with a five-tool article-specific surface, and all tools unregister when
  the journal route is left.
- `knowledge_describe` bootstraps without a pre-known version and advertises the
  supported version plus a live same-origin copy of the canonical schema.
- A signed fictional site session contains the two demo conditions. Agent tool
  input cannot assert entitlement or assurance.
- The same retrieval request yields four different publisher-selected results.
- Search requires meaningful topic overlap for ordinary multiword questions,
  and matches complete words so substrings do not create false-positive results.
- Retrieval selects the relevant complete section when assurance is not
  recognized, and the complete article when entitlement and assurance are both
  recognized.
- Passage-level retrieval requires a focused query or provider-issued locator,
  and reserves response budget for the requested evidence before generic
  abstract or summary context.
- Reader access and agent supply remain separate policy inputs. In the
  highest-permission state they converge on complete article access; ordinary
  browser page observation is not blocked.
- `knowledge_open` returns and opens a same-origin canonical or deep link.
- Responses preserve author, source, status, access, rights, links, and a
  minimized receipt.
- Protected-content canaries are checked in source and built browser code.
- A signed, text-free session ledger carries sequential protected-retrieval
  counters across application restarts and instances; exact retries are
  idempotent while distinct cumulative requests remain bounded.
- The evidence inspector uses scenario-bound, tab-scoped storage for material
  already returned to the browser. Open demo tabs can relay it through a
  transient same-origin browser channel; changing the scenario clears it.

## Proposed assurance layer

The second policy condition models a publisher recognizing an independently
issued credential about agent data handling. The judge can change the simulated
state so the difference is easy to demonstrate.

That control is not a production trust decision. WebMCP does not verify
retention, training, deletion, redistribution, citation, or storage. A real
implementation would require a trusted issuer, signed assertions, scoped
claims, expiration, revocation, publisher verification rules, and enforcement
by the systems handling the content.

A further research direction is a publisher-recognized browser assurance that
enforces a tool-only content channel: the person could keep normal reader access
while protected page text would reach the agent only through publisher-declared
Site Tools. The browser or agent runtime—not page JavaScript—would need to enforce
and attest that isolation. This repository does not implement or claim it.

## Claim boundary

This repository and its public ChatGPT Sites release demonstrate the reference
application with fictional content and access states. The dated release record
documents the tested deployment and client. Neither proves a real publisher
adoption, legal license, independent federation, credential verification, or
downstream compliance.

The signed demo ledger is not an atomic distributed rate limiter. A production
publisher would need a shared transactional store to close simultaneous-request
races and support operational monitoring.

## Release gates

A commit candidate must pass:

```sh
npm run check
npm run build
npm run test:browser:production
```

It must also pass a human browser review at desktop and mobile sizes, contain no
retired product language, contain no protected synthetic text in client bundles,
and leave no generated screenshots or browser state in version control.

Deployment, changing repository visibility, publishing a video, and submitting
to Devpost are separate actions that require explicit authorization.

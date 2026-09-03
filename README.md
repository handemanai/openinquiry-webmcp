# OpenInquiry

> Publishers decide what agents can use.

OpenInquiry is a fictional medical journal that demonstrates publisher-controlled
knowledge access with WebMCP. The journal gives a visiting agent seven useful
page tools, while its server decides how much evidence to return for the current
reader and requested use.

The project also proposes an additional policy layer for publishers that want
assurance about how an agent will handle licensed material. That layer is a
proposal. The demo simulates a publisher recognizing an independently issued
credential; WebMCP does not currently issue or verify it.

The current demonstration governs what the journal supplies through Site Tools;
it does not prevent an agent-capable browser from reading content visible on the
ordinary reader page. A future browser assurance could let a publisher require a
browser-enforced mode in which protected text reaches the agent only through the
declared tools. That is a research direction, not a present WebMCP guarantee.

All medical content is original, synthetic, and not for clinical use. OpenInquiry
0.1 is a discussion draft, not an adopted standard or a production publisher
integration.

## Public demonstration

[Open OpenInquiry on ChatGPT Sites](https://openinquiry-publisher-demo.brianp.chatgpt.site)

No account or credentials are required. The journal, authors, access choices,
and medical content are fictional or synthetic and are not for clinical use.

## Judge journey

| Route | What the judge sees |
| --- | --- |
| `/` | The product idea and a direct path into the demo. |
| `/presentation` | The problem, working proposal, and limits. |
| `/next-steps` | The questions a real trust and interoperability layer must answer. |
| `/demo/publisher-decides` | A three-step explanation of the demonstration. |
| `/demo` | The Journal of Guidelines and the judge-facing controls. |
| `/demo/article/[resourceId]` | The complete synthetic source and exact supporting section. |

## Run locally

Node.js 22.6 or newer is required; continuous integration runs on Node.js 22.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose **Run the
demonstration**, and follow the three short explanation screens.

On the journal page:

1. Open **Demo controls**.
2. Choose the reader's access and the simulated publisher recognition state.
3. Copy the displayed question and its separately labeled agent instruction,
   then ask it through a WebMCP-capable agent while the journal page is open.
4. Inspect what the journal supplied and open the exact supporting section.
5. Change one condition, ask the same question, and compare the result.

## Four publisher decisions

The agent request cannot assert either condition. The server reads the signed
fictional site session and applies journal policy.

| Reader access | Proposed external assurance | What the journal supplies |
| --- | --- | --- |
| Guest preview | Not recognized | Public abstract |
| Guest preview | Recognized by the publisher | Abstract and publisher-written summary |
| Full article access | Not recognized | The complete question-relevant section |
| Full article access | Recognized by the publisher | Complete article text |

The visible assurance control is deliberately judge-operated so all four states
can be demonstrated without a real identity or credential service. In a real
system, an agent could not grant itself this state. A publisher would need a
credential issuer, verification rules, revocation, and enforcement outside
WebMCP.

## Page-local WebMCP tools

| Tool | Purpose |
| --- | --- |
| `knowledge_describe` | Discover the journal, supported profile versions, canonical schema, collections, and capabilities without already knowing the version. |
| `knowledge_access` | Report the access recognized for the current signed-in session. |
| `knowledge_search` | Search the five current synthetic guidelines. |
| `knowledge_retrieve` | Return only the material allowed by publisher policy. |
| `knowledge_resolve` | Explain a legitimate access path. |
| `knowledge_open` | Open the canonical article or exact supporting section. |
| `knowledge_status` | Confirm publication status and version. |

The journal homepage exposes the complete discovery workflow. After a source is
opened, the article page narrows its surface to access, retrieval, resolution,
status, and canonical-opening operations that are meaningful for that article.

Every meaningful result includes the source, authors, publication status,
reader access, publisher decision, canonical link, and a small source receipt.
The receipt records the provider decision without storing the full prompt, raw
clinical query, credential, authentication token, or permanent user identifier.

For the demo, a compact retrieval ledger travels inside the server-signed,
HTTP-only session cookie. It records only provider, resource, and source-section
IDs plus character counts. That lets sequential requests keep the same limits
across application restarts or instances without storing the returned text or
question. The human evidence inspector keeps only the response already returned
in tab-scoped session storage, ties it to the active scenario, and
clears it when the judge changes the scenario. Open same-origin demo tabs can
request that already-returned response from one another through a transient
browser channel, so no server cache or persistent browser store is required.

This is still a demonstration control, not a production extraction-defense
system. A live publisher would need an atomic shared store to prevent races
between simultaneous requests, plus its ordinary authentication, licensing,
abuse monitoring, and audit controls.

## Verify

```sh
npm run check
npm run build
npm run test:browser:production
```

These commands test code quality, types, unit behavior, search relevance,
profile and schema conformance, route-scoped WebMCP registration, protected-text
boundaries, production bundling, browser behavior, canonical navigation, and
accessibility. Passing locally does not prove deployment, publisher adoption,
or compatibility with every WebMCP client.

## Project documents

- [Publisher Knowledge Access Profile](PUBLISHER_KNOWLEDGE_ACCESS_PROFILE.md)
- [Implementation and release ledger](ORCHESTRATION.md)
- [Demo capability review](docs/review/DEMO_CAPABILITY_REVIEW.md)
- [Acceptance matrix](docs/verification/ACCEPTANCE_MATRIX.md)
- [Sites publishing readiness](docs/verification/SITES_READINESS.md)
- [Devpost submission draft](devpost-submission.md)

Software and executable schema/test code are Apache-2.0. Original synthetic
content and documentation are CC BY 4.0. Third-party assets retain their own
licenses as recorded in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

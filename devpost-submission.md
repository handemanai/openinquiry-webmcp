# Title

OpenInquiry

## One-line Summary

OpenInquiry lets a journal decide what an AI agent can read and links every result back to the source.

## Problem

As a surgeon, I depend on information from journals, professional societies, and other trusted sources. Each source has its own access rules, authors, updates, and reasons for asking readers to return to the original page.

AI agents can help people find and use that information. Publishers still need to control what leaves their sites. They also need to preserve the author, the source, and the path back to the complete work.

Today, an agent may have to interpret a website visually or use a separate integration. Neither approach gives publishers a shared way to say what the agent may search, what it may read, and what source information must travel with the answer.

## Solution

OpenInquiry is a fictional medical journal that shows how this could work with WebMCP.

The Journal of Guidelines publishes five synthetic articles and exposes seven tools to the agent visiting the page. When the agent asks for information, the journal reads the signed site session, applies its own rules on the server, and returns only the material allowed for that reader and that use.

Every useful result includes the author, publication status, access basis, use limits, and a link to the exact supporting section. Site Tool retrieval remains a separate publisher decision: the journal can supply anything from an abstract to the complete article according to the current reader entitlement and recognized agent assurance. Current WebMCP does not prevent an agent-capable browser from observing the visible reader page; a browser-enforced tool-only channel is proposed as future work rather than claimed here.

The demo applies the same question under four conditions:

| Reader access | External credential recognized by the publisher | What the journal returns |
| --- | --- | --- |
| Guest preview | No qualifying credential recognized | Public abstract |
| Guest preview | Zero-retention claim recognized | Abstract and publisher summary |
| Full article access | No qualifying credential recognized | Complete question-relevant section |
| Full article access | Zero-retention claim recognized | Complete article text |

OpenInquiry does not impose a universal character ceiling. The publisher chooses
the representation and may still apply resource-, session-, use-, or
caller-specific limits. In this fictional policy, the highest-permission state
returns the complete provider-supplied article rather than a clipped passage.

The zero-retention choice is a judge-controlled simulation of a possible future trust signal. In a real implementation, an independent system would issue and govern that credential, and the publisher would decide whether to recognize it. The reader or agent would not be able to award the credential to itself. WebMCP does not verify retention, training, citation, storage, or redistribution.

All medical content is synthetic and not for clinical use.

## Why This Matters

WebMCP lets a website declare clear tools for the agent visiting that page. The person and the agent work with the same visible journal and the same signed-in session.

For a physician, the experience is simple: ask on the source website, receive the most complete package the publisher currently permits, and open the exact section to review it. For a publisher, the site remains where access is decided. The publisher can authorize complete single-article delivery for a qualifying session without offering unrestricted collection export.

The site can decide what it supplies through Site Tools, attach the source information needed for attribution, and open the exact page a reader should inspect.

OpenInquiry also proposes a shared format for these results. Another publisher could use the same tool names and return the same core information while keeping its own content, access rules, and website.

OpenInquiry 0.1 is a working proposal for discussion. No publisher has adopted it, and it is not an established standard.

## How We Used AI

The AI agent uses the journal's WebMCP tools. It can:

- learn what the journal offers;
- search the five guidelines;
- check whether an article is current;
- request a specific type and amount of material;
- receive the material allowed by the journal; and
- open the exact supporting section for the reader.

The journal returns one consistent result format. It includes the provider, authors, article status, reader access, use limits, supplied text, source links, and a short record of what the site supplied.

OpenInquiry does not run another AI model on its server. It gives the user's agent a clear way to work with the website.

## How We Used Codex

I used Codex throughout the project. It helped me narrow the idea to one clear demonstration, write the OpenInquiry 0.1 proposal, build the Next.js application, connect the WebMCP tools to the journal's server rules, and create the synthetic test content.

I also used Codex to review the app in a browser, find unsupported claims, test guest and full-access behavior, check that protected text stays out of the wrong response, and make sure the small source records do not store the prompt or private session data.

The process was iterative. I changed the product story, interface, code, and tests together until a judge could understand the point without weakening the access rules underneath it.

## Key Features

- A three-step introduction that explains the demo before asking the judge to use it.
- One fictional journal with five original synthetic guidelines.
- Seven page tools for describing the journal, checking access, searching, retrieving material, resolving access, opening a source, and checking article status.
- Four different results for the same question, based on reader access and whether the journal recognizes a proposed external agent credential.
- Server decisions that do not trust access claims sent by the agent.
- A visible four-state policy ranging from public abstract to complete article text.
- Author, source, status, access, use limits, and exact links in every useful result.
- A source record that omits the full prompt, raw query, login token, and permanent user identifier.
- Direct opening of the exact article section used in the answer.
- A clearly labeled future direction for a browser-enforced, publisher-recognized tool-only content channel.
- Clear labels that the journal and medical content are fictional and not for clinical use.

## Architecture

OpenInquiry uses Next.js 16, React 19, and TypeScript.

The journal registers seven tools with `document.modelContext.registerTool` when the browser supports WebMCP. Each page registers only the tools that belong on that page. The app removes those tools when the reader leaves the page.

The visible journal and the WebMCP tools use the same application services. A signed, HTTP-only cookie stores the fictional demo settings. The server reads that cookie and decides what the journal may return. The agent request does not contain an entitlement or data-policy flag.

After a protected retrieval, the server rotates that signed cookie with a small retrieval ledger containing only provider, resource, representation/digest-bound unit IDs, and character counts. This keeps sequential request limits consistent across ordinary application restarts or instances without putting the question or article text in the cookie. Exact retries are idempotent, while distinct cumulative requests remain bounded. The evidence inspector stores only the response already returned to the current browser tab, ties it to the selected scenario, and clears it when the judge changes the scenario. Open same-origin demo tabs can relay that already-returned response through a transient browser channel, so the server does not keep a copy.

Each tool returns a consistent JSON result with the source, the permitted material, the journal's decision, and the exact link back to the article. The short source record does not store the complete prompt, raw clinical query, credentials, login token, or a permanent user identifier.

On September 2, 2026, `npm run check` passed 90 tests in 17 files, 18 response schemas, four evaluator fixtures, five policy cases, 15 WebMCP runtime checks, seven profile-schema checks, and all 14 deterministic evaluator vectors. The production build passed its 18-asset protected-content scan, and 43 browser tests passed across all four policy states, five accessibility checks, route cleanup, exact source opening, and viewports from 320 to 1,440 pixels.

On September 3, 2026, the public ChatGPT Sites build was opened in Codex's in-app browser and exposed all seven page tools. `knowledge_search` found only the intended physical-activity guideline, and `knowledge_status` reported it as current. With full article access and the simulated credential recognized, a direct `knowledge_retrieve` call returned one `full_text` grant containing all 14,373 characters of the article, both exercise targets, and the final review section. The response preserved the publisher and canonical source while its minimized receipt omitted the question. An identical retry returned the same complete text, and `knowledge_open` moved and focused the visible page on `#weekly-activity-recommendation`. This is production evidence for this fictional reference implementation. It does not prove independent credential verification, publisher adoption, or compatibility with every WebMCP client.

## Testing Instructions

The fictional demo does not require login credentials.

1. Open the live URL in ChatGPT's in-app browser or in Google Chrome 149 or later with WebMCP testing enabled.
2. Choose **Run the demonstration**.
3. Read the three short explanation screens and open The Journal of Guidelines.
4. Open **Demo controls**.
5. Select **Full article access** and **No qualifying credential recognized**.
6. Copy the displayed question and its separately labeled agent instruction, then ask it through the browser's agent while the journal page is open.
7. Confirm that the agent searches the journal, receives the complete question-relevant section rather than the complete article, and opens that exact supporting section.
8. Change only the simulated publisher-recognition setting to **Zero-retention claim recognized**. Ask the same question again.
9. Confirm that the journal returns the complete article text, including the numerical recommendation and all surrounding sections.
10. Repeat with **Guest preview** and confirm that the journal returns less material.

Run the project locally with:

```sh
npm ci
npm run dev
```

Run the repository checks with:

```sh
npm run check
npm run build
npm run test:browser:production
```

## Public Demo Link

https://openinquiry-publisher-demo.brianp.chatgpt.site

## Public Repository Link

https://github.com/handemanai/openinquiry-webmcp

The repository currently has an Apache 2.0 license but is private. It must be public before submission. The license also needs to appear in GitHub's repository summary.

## Demo Video

TODO: Add a public YouTube URL. The video must have audio and run for less than three minutes.

Suggested 2 minute 35 second outline:

- **0:00 to 0:15:** Explain that publishers need a way to help agents without losing control of their work.
- **0:15 to 0:35:** Open the fictional journal, show the question, and explain that the page offers seven tools.
- **0:35 to 1:15:** Use full article access with no qualifying credential recognized. Show the complete question-matched section, source record, and exact article section.
- **1:15 to 1:50:** Change only whether the fictional publisher recognizes the proposed external credential. Ask the same question and show the complete article returned through Site Tools.
- **1:50 to 2:15:** Compare the guest and full-access results. Show that reader entitlement and agent assurance are separate inputs to the publisher's decision.
- **2:15 to 2:35:** Explain that WebMCP provides the page tools and OpenInquiry proposes a shared format for rights-aware knowledge. State that it is a proposal, not an adopted standard.

## Screenshot Shot List

1. The OpenInquiry home page with the line, “Publishers decide what agents can use.”
2. The guided explanation that separates reader access from the material given to the agent.
3. The Journal of Guidelines with **Demo controls** open and both choices visible.
4. A WebMCP-capable client showing the journal tools and the complete-article result in the highest-permission state.
5. The exact guideline section opened by `knowledge_open`, with the author and source visible.

Use a 3:2 crop when possible. Keep debug panels, credentials, unrelated tabs, and personal information out of the images. Keep the synthetic-content warning visible whenever the medical content appears.

## Submission Readiness Notes

### Verified now

- The Devpost account is signed in and registered for The WebMCP Challenge.
- The Devpost project draft exists.
- The current local application and repository checks pass.
- The project includes an Apache 2.0 code license, a CC BY 4.0 content and documentation license, and an attribution file.
- The new private repository is prepared with a clean history and no legacy concept history.
- The public ChatGPT Sites build has been invoked directly through Codex's in-app WebMCP client.
- The Site is public at its stable HTTPS origin and uses production runtime configuration stored outside the repository.

### Required before submission

- Make the GitHub repository public and check it in a signed-out browser.
- After any final edits, redeploy that exact commit and record the commit, client, and date.
- Capture three to five screenshots from the final build.
- Record and publish the YouTube demo with audio in less than three minutes.
- Re-run `npm run check`, `npm run build`, and the browser tests after the final edit.
- Confirm that the commit, live site, screenshots, video, and Devpost description all show the same product.

## Known Limitations

- OpenInquiry 0.1 is a proposal, not an adopted standard or certification.
- The journal, authors, access choices, and medical content are fictional or synthetic.
- The medical content is not for clinical use.
- The demo does not connect to a real publisher, subscription, or identity system.
- WebMCP does not verify what an agent does with the material after receiving it.
- The source record documents what the journal supplied. It does not prove citation, compliance, payment, or licensing.
- The fictional session and request limit are demo controls. They are not a production identity or security system.
- The signed demo ledger covers sequential requests. A production publisher would still need an atomic shared store to prevent simultaneous-request races and provide operational monitoring.
- Any edits after the current release snapshot require a new verified deployment so the final commit, public Site, screenshots, video, and submission remain identical.

## TODO Official Form Fields

### Project Overview

- **Project name:** OpenInquiry
- **Elevator pitch:** Bring your agents to trusted publishers while keeping publishers in control of their content.

### Project Details

- **About the project:** Use the text from **Problem** through **Known Limitations** above.
- **Built with:** Next.js, React, TypeScript, WebMCP, JSON Schema, Vitest, Playwright, Codex
- **Try it out links:** https://openinquiry-publisher-demo.brianp.chatgpt.site; https://github.com/handemanai/openinquiry-webmcp after the repository is public
- **Video demo link:** TODO public YouTube URL
- **Image gallery:** TODO final three to five screenshots

### Additional Info

- **Submitter Type:** TODO confirm. Suggested answer: Individual
- **Country of residence:** TODO confirm
- **Organization name:** Leave blank unless submitting for an organization
- **App Status:** New. The clean repository will receive its first commit during the submission period.
- **Existing project update:** Not applicable if **New** is confirmed
- **Live URL:** https://openinquiry-publisher-demo.brianp.chatgpt.site
- **Testing instructions:** Use the ten browser steps above. No credentials are required.
- **Public code repository:** https://github.com/handemanai/openinquiry-webmcp after the repository is public
- **Agents or clients tested:** “On September 3, 2026, I tested the public ChatGPT Sites build in Codex's in-app browser. It discovered all seven page tools, returned only the relevant search result, confirmed the guideline was current, supplied the complete relevant section without recognized assurance, supplied the complete 14,373-character article when the fictional publisher recognized the simulated credential, returned an identical exact retry, and opened the exact supporting section.”
- **AI tools used:** OpenAI Codex for product planning, implementation, debugging, browser review, testing, security and privacy checks, and submission preparation
- **Learning level:** TODO confirm. Suggested answer: Significant
- **Career AI value:** TODO confirm. Suggested answer: Yes

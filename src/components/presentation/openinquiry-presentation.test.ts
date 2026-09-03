// SPDX-License-Identifier: Apache-2.0

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getActiveBeatIndex,
  OpenInquiryPresentation,
  PRESENTATION_BEATS,
} from "./openinquiry-presentation";

describe("OpenInquiryPresentation", () => {
  it("closes the policy sequence with a standards proposal and a concrete provocation", () => {
    const html = renderToStaticMarkup(createElement(OpenInquiryPresentation));

    expect(PRESENTATION_BEATS).toHaveLength(15);
    expect(PRESENTATION_BEATS.map((beat) => beat.id)).toEqual([
      "opening-provocation",
      "three-parties",
      "physician-lens",
      "before-agents",
      "agent-era",
      "licensed-content",
      "vision",
      "webmcp-and-openinquiry",
      "policy-inputs",
      "permission-set",
      "public-baseline",
      "middle-ground",
      "signed-in-zdr",
      "standards-provocation",
      "authorized-return",
    ]);
    expect(html).toContain("People want to bring their own agents");
    expect(html).toContain("to publisher content.");
    expect(html).toContain("Publishers want to protect their work");
    expect(html).toContain("and keep their relationship with readers.");
    expect(html).toContain("Could WebMCP let publishers control");
    expect(html).toContain("how users’ agents access their content?");
    expect(html).not.toContain(">PEOPLE</text>");
    expect(html).not.toContain(">PUBLISHERS</text>");
    expect(html).not.toContain(">THE QUESTION</text>");
    expect(html).toContain("Any solution has to work for all three.");
    expect(html).toContain("The publisher sets the terms. The person brings their own agent. The agent receives only what the publisher permits.");
    expect(html).not.toContain("The person is signed in. The agent is outside.");
    expect(html).toContain("OpenInquiry");
    expect(html).not.toContain("OpenInquiry project overview");
    expect(html).toContain("OpenInquiry builds on experimental WebMCP so people can bring their own agents to expert content on the publisher&#x27;s terms.");
    expect(html).toContain("Let’s use healthcare as an example.");
    expect(html).toContain("OpenInquiry can apply wherever people want their agents to access expert content.");
    expect(html).toContain("Finding evidence meant visiting each source.");
    expect(html).toContain("Physicians search society guidance, journals, hospital libraries, and clinical books one source at a time.");
    expect(html).toContain("Your access does not automatically extend to your agent.");
    expect(html).toContain("A subscription, society membership, or hospital-library login lets you read the content. It does not create an authorized path for your agent.");
    expect(html).toContain("Some agents access publisher content through direct partnerships.");
    expect(html).toContain("you have to use their agent and their content network.");
    expect(html).toContain("THIRD-PARTY");
    expect(html).toContain("WITH CONTENT PARTNERSHIPS");
    expect(html).toContain(">CONTENT PARTNERSHIPS<");
    expect(html).toContain("Your agent works through the publisher’s signed-in site.");
    expect(html).toContain("The reader keeps full access in the publisher’s own experience.<br/>The publisher decides what its Site Tools return to the agent.");
    expect(html).toContain("WebMCP creates the connection.<br/>OpenInquiry defines the publisher’s response.");
    expect(html).toContain("The reader uses the agent they choose.<br/>The publisher remains the source and keeps its relationship with the reader.");
    expect(html).toContain("WEBMCP OFFERS");
    expect(html).toContain("Tools on the live page");
    expect(html).toContain("Named tools run on the page");
    expect(html).toContain("and return structured results.");
    expect(html).toContain("OPENINQUIRY PROPOSES");
    expect(html).toContain("Publisher decides");
    expect(html).toContain("The publisher determines");
    expect(html).toContain("what the agent gets.");
    expect(html).toContain("Every result links to the source.");
    expect(html).toContain("WHAT THIS ENABLES");
    expect(html).toContain("Bring your own agent");
    expect(html).toContain("The reader chooses the agent.");
    expect(html).toContain("The publisher keeps the relationship.");
    expect(html).not.toContain("Privacy-minimized source receipts");
    expect(html).not.toContain("common contract for the response");
    expect(html).not.toContain("supplies its own entitlement");
    expect(html).not.toContain("POSSIBLE FUTURE INPUT");
    expect(html).not.toContain("Registration · input schema · execution");
    expect(html).not.toContain("knowledge_* semantics · rights/provenance envelope · assurance boundary");
    expect(html).not.toContain("A shared way to describe what the source returns.");
    expect(html).not.toContain("A proposed signal about agent data retention.");
    expect(html).toContain("The publisher can consider two signals.");
    expect(html).toContain("a proposed credential about the agent’s data handling.");
    expect(html).toContain("The judge controls that simulated credential; WebMCP does not verify it.");
    expect(html).not.toContain("REQUEST RECEIVED");
    expect(html).toContain("This demo maps those conditions to four exact results.");
    expect(html).toContain("These are demonstration policy choices, not WebMCP defaults.");
    expect(html).toContain("With neither condition, the agent receives the public abstract.");
    expect(html).toContain("Each single-condition state returns a different package.");
    expect(html).not.toContain("different middle ground");
    expect(html).toContain("Guest preview plus recognized assurance returns the abstract and publisher summary. Full article access without recognized assurance returns the complete relevant section.");
    expect(html).toContain("Both conditions are required for complete article text.");
    expect(html).toContain("Why build OpenInquiry on WebMCP?");
    expect(html).toContain("WebMCP lets the publisher expose controlled tools on its live, signed-in site");
    expect(html).toContain("The publisher defines what its Site Tools do");
    expect(html).toContain("The user can view content in the publisher’s own experience.");
    expect(html).toContain("The publisher controls what its Site Tools return to the agent.");
    expect(html).toContain("Other interfaces still have a role");
    expect(html).toContain("MCP and APIs connect agents to backend services.");
    expect(html).not.toContain("CLI supports developer-run automation.");
    expect(html).toContain("Computer use can operate pages that do not expose Site Tools.");
    expect(html).not.toContain("These interfaces can complement WebMCP. WebMCP keeps the publisher’s page");
    expect(html).toContain("OpenInquiry would define the publisher’s response");
    expect(html).toContain("Shared tools, profile discovery, and response formats.");
    expect(html).toContain("Access rules and permitted content.");
    expect(html).not.toContain("Provenance, current status, canonical links, and source receipts.");
    expect(html).toContain("How a separately governed agent-handling credential could be checked.");
    expect(html).not.toContain("ADOPTION");
    expect(html).not.toContain("implementations, and governance");
    expect(html).not.toContain("Could publishers and agent developers agree on this contract?");
    expect(html).not.toContain("What would sources and agents need to agree on?");
    expect(html).toContain("Bring your own agent. The publisher still sets the terms.");
    expect(html).toContain('href="/"');
    expect(html).toContain("OpenInquiry home");
    expect(html).toContain('href="/demo/publisher-decides"');
    expect(html).toContain("Try the live demo →");
    expect(html).toContain("The publisher controls what its Site Tools return");
    expect(html).toContain("Your agent works through the live publisher site and receives only what the publisher permits");
    expect(html).toContain("Scroll");
    expect(html).not.toContain("Scroll to trace the change");
    expect(html).not.toContain("One diagram. The relationship changes as the story advances.");
  });

  it("keeps one anchored editable SVG with explicit relationship semantics", () => {
    const html = renderToStaticMarkup(createElement(OpenInquiryPresentation));

    expect(html.match(/<svg/gu)).toHaveLength(1);
    expect(html).not.toContain("<img");
    expect(html).toContain('data-shared-node="resources"');
    expect(html).toContain('data-shared-node="human"');
    expect(html).toContain('data-shared-node="agent"');
    expect(html).toContain('data-shared-node="personal-agent"');
    expect(html).toContain('data-shared-node="licensed-service-agent"');
    expect(html).toContain('data-shared-node="direct-source-access"');
    expect(html).toMatch(/class="[^"]*directAccessPortMask[^"]*" height="94" rx="6" width="310" x="290" y="292"/u);
    expect(html).toContain('data-shared-node="agent-source-access"');
    expect(html).toContain('data-transition-layer="resource-title"');
    expect(html).toContain('data-transition-layer="resource-detail"');
    expect(html).not.toContain('data-transition-layer="publisher-workspace"');
    expect(html).toContain('data-transition-layer="vision"');
    expect(html).toContain('data-transition-layer="before-agents"');
    expect(html).toContain('data-transition-layer="agent-era"');
    expect(html).toContain('data-transition-layer="licensed-content"');
    expect(html).toContain('data-transition-layer="source-control"');
    expect(html.match(/data-transition-layer="policy-focus"/gu)).toHaveLength(1);
    expect(html).not.toContain('data-transition-layer="policy-focus-origin"');
    expect(html).toContain('data-transition-layer="opening-provocation"');
    expect(html).toContain('data-transition-layer="webmcp-and-openinquiry"');
    expect(html.match(/data-relationship-channel="agent-publisher"/gu)).toHaveLength(3);
    expect(html.match(/data-relationship-channel="human-publisher"/gu)).toHaveLength(3);
    expect(html.match(/data-relationship-channel="human-agent"/gu)).toHaveLength(3);
    expect(html).toContain('data-transition-layer="standards-provocation"');
    expect(html).toContain('data-policy-state="source-authority"');
    expect(html).toContain('data-policy-state="trusted-handling"');
    expect(html).toContain('data-flow-label="response-inspection"');
    expect(html).toContain("knowledge_retrieve");
    expect(html).toContain("KnowledgeResponse");
    expect(html).toContain("Agent requests via WebMCP");
    expect(html).toContain("Publisher returns permitted content");
    expect(html).toContain("Physician opens source");
    expect(html).toContain("Relevant sources assembled for review");
    expect(html).not.toContain("RELEVANT SOURCES ASSEMBLED HERE");
    expect(html).toContain("Society Website");
    expect(html).toContain("Journal Website");
    expect(html).toContain("Hospital Library");
    expect(html).toContain("Clinical eBook");
    expect(html).toContain("knowledge_access");
    expect(html).not.toContain("access_check()");
    expect(html).toContain("Agent requests source access");
    expect(html).not.toContain("open_source()");
    expect(html).not.toContain("PublisherPage");
    expect(html).not.toContain("humanView");
    expect(html).toContain("Physician follows source link");
    expect(html).toContain("Canonical source opens");
    expect(html).not.toContain("answer_with_sources()");
    expect(html).not.toContain(">ask()<");
    expect(html).not.toContain(">answer()<");
    expect(html).toContain("Agent answers with permitted source material");
    expect(html).not.toContain("licensed_response()");
    expect(html).not.toContain("answer() + sources");
    expect(html).toContain('d="M350 742 V820"');
    expect(html).toContain('d="M400 820 V742"');
    expect(html).not.toContain("open_citation()");
    expect(html).toContain('data-flow-path="canonical-source-followup"');
    expect(html).not.toContain('data-flow-path="physician-manual-sources"');
    expect(html).not.toContain('d="M445 292 V280"');
    expect(html).not.toContain('d="M400 280 H1150"');
    expect(html.match(/M(?:400|650|900|1150) 280 V254/gu)).toBeNull();
    expect(html).toContain("SOURCE ACCESS");
    expect(html).toContain("USER SIGNED IN");
    expect(html).toContain("SITE APPLIES READER’S SIGN-IN");
    expect(html).toContain("NO AUTHORIZED AGENT PATH");
    expect(html).toContain("CONTENT PARTNERSHIP");
    expect(html).toContain("PHYSICIAN’S OWN SIGN-IN");
    expect(html).toContain("PHYSICIAN’S SIGNED-IN ACCESS");
    expect(html).toContain("SITE APPLIES PHYSICIAN’S SIGN-IN");
    expect(html).toContain("SITE APPLIES READER SESSION");
    expect(html).toContain("RESPONSE: GRANT + CANONICAL LINK");
    expect(html).not.toContain("SOURCE ACCESS DECISION");
    expect(html).not.toContain("SOURCE POLICY DECISION");
    expect(html).toContain("RELEVANT SECTION AUTHORIZED");
    expect(html).toContain("COMPLETE ARTICLE AUTHORIZED");
    expect(html).toContain("external credential: recognized");
    expect(html).toContain("Proposed policy signal");
    expect(html).toContain("Relevant section + citation + source page link");
    expect(html).toContain("Complete article + citation + source link");
    expect(html).toContain("EXAMPLE PUBLISHER POLICY");
    expect(html).toContain("evaluateRetrieval(input)");
    expect(html).toContain("→ KnowledgeResponse");
    expect(html).not.toContain("publisher_policy");
    expect(html).toContain("THIS DEMO’S FOUR POLICY RESULTS");
    expect(html).toContain('data-policy-grants="four-state-demo"');
    expect(html).toContain("Every response identifies the source and links back to it.");
    expect(html).not.toContain("EVERY GRANT CARRIES PROVENANCE + A CANONICAL SOURCE LINK");
    expect(html).toContain("READER ENTITLEMENT");
    expect(html).toContain("GUEST PREVIEW");
    expect(html).toContain("FULL ARTICLE ACCESS");
    expect(html).not.toContain("PUBLISHER SESSION DETERMINES ACCESS");
    expect(html).toContain("DATA-USE ASSURANCE");
    expect(html).toContain("NOT RECOGNIZED BY PUBLISHER");
    expect(html).toContain("NOT RECOGNIZED BY PUBLISHER");
    expect(html).not.toContain("RETENTION · TRAINING · STORAGE");
    expect(html).toContain("PROPOSED");
    expect(html).toContain("ZERO-RETENTION CLAIM RECOGNIZED");
    expect(html).toContain("ABSTRACT + PUBLISHER SUMMARY");
    expect(html).not.toContain('grant: &quot;metadata_only&quot;');
    expect(html).not.toContain('grant: &quot;publisher_preview&quot;');
    expect(html).not.toContain('grant: &quot;bounded_excerpt&quot;');
    expect(html).not.toContain('grant: &quot;full_text&quot;');
    expect(html).toContain(">PUBLIC ABSTRACT<");
    expect(html).toContain(">ABSTRACT + SUMMARY<");
    expect(html).toContain(">COMPLETE SECTION<");
    expect(html).toContain(">COMPLETE ARTICLE TEXT<");
    expect(html).toContain("TWO DISTINCT SINGLE-CONDITION RESULTS");
    expect(html).not.toMatch(/(?:00|01|10|11) · /u);
    expect(html).toContain('data-policy-map-placement="below-policy-panel"');
    expect(html).toContain('data-policy-core-alignment="beat-8"');
    expect(html).not.toContain('data-policy-map-handoff="publisher-preview"');
    expect(html).not.toContain("discover()");
    expect(html).not.toContain("preview()");
    expect(html).not.toContain("retrieve_excerpt()");
    expect(html).not.toContain("retrieve_full_text()");
    expect(html).not.toContain("WHAT THE SOURCE CHECKS");
    expect(html).not.toContain("WHAT THE SOURCE CONTROLS");
    expect(html).not.toContain("eligibility, permitted-action, representation, and handling rules");
    expect(html).not.toContain("Licensed access to these sources");
    expect(html).not.toContain('data-relationship-note="webmcp"');
    expect(html).not.toContain("ingest(all_sources)");
    expect(html).not.toContain("Guidelines &amp; talks");
    expect(html).not.toContain("Articles &amp; reviews");
    expect(html.match(/marker-end="url\(#presentation-arrow-ink\)"/gu)).toHaveLength(17);
    expect(html).toContain('d="M392 574 L462 398"');
    expect(html).toContain('d="M428 398 L358 574"');
    expect(html).toContain('d="M1208 574 L1138 398"');
    expect(html).toContain('d="M1172 398 L1242 574"');
    expect(html).toContain('d="M596 648 H1004"');
    expect(html).toContain('d="M1004 680 H596"');
    expect(html).toContain('d="M400 310 H1150"');
    expect(html).toContain('d="M1150 116 H225 V500 H300 V574"');
    expect(html.match(/M(?:400|650|900|1150) 310 V254/gu)).toHaveLength(4);
    expect(html.match(/M(?:400|650|900|1150) 136 V116/gu)).toHaveLength(4);
    expect(html.match(/pathLength="1"/gu)).toHaveLength(38);
    expect(html.match(/--flow-delay:/gu)).toHaveLength(34);
    expect(html).toContain(">Physician<");
    expect(html).toContain('data-tone="person"');
    expect(html.match(/>Agent</gu)).toHaveLength(3);
    expect(html).toContain(">YOUR<");
    expect(html).toContain(">THIRD-PARTY<");
    expect(html).toContain(">WITH CONTENT PARTNERSHIPS<");
    expect(html.match(/>Publisher</gu)).toHaveLength(1);
  });

  it("renders label plates behind arrow strokes and label text above them", () => {
    const html = renderToStaticMarkup(createElement(OpenInquiryPresentation));
    const plateLayer = html.indexOf('data-label-layer="plates"');
    const arrowLayer = html.indexOf('data-arrow-layer="vision"');
    const textLayer = html.indexOf('data-label-layer="text"');

    expect(plateLayer).toBeGreaterThan(-1);
    expect(arrowLayer).toBeGreaterThan(plateLayer);
    expect(textLayer).toBeGreaterThan(arrowLayer);
  });

  it("keeps all narrative copy inside the masked top band", () => {
    const html = renderToStaticMarkup(createElement(OpenInquiryPresentation));
    const narrativeViewport = html.indexOf('data-narrative-viewport="top-band"');
    const beatTrack = html.indexOf('aria-label="Presentation beats"');

    expect(narrativeViewport).toBeGreaterThan(-1);
    expect(beatTrack).toBeGreaterThan(narrativeViewport);
    expect(html.match(/data-narrative-state=/gu)).toHaveLength(15);
    expect(html.match(/data-opening="true"/gu)).toHaveLength(1);
    expect(html.match(/data-opening="false"/gu)).toHaveLength(14);
  });

  it("provides native-scroll story beats and an explicit navigation fallback", () => {
    const html = renderToStaticMarkup(createElement(OpenInquiryPresentation));

    expect(html).toContain('aria-label="Jump to a presentation beat"');
    expect(html.match(/data-story-beat=/gu)).toHaveLength(15);
    expect(html.match(/aria-label="Beat \d+:/gu)).toHaveLength(15);
    expect(html).toContain('data-narrative-beat="1"');
  });

  it("selects a valid beat as the next story section enters the lower viewport", () => {
    expect(getActiveBeatIndex(0, 900, 15)).toBe(0);
    expect(getActiveBeatIndex(251, 900, 15)).toBe(0);
    expect(getActiveBeatIndex(253, 900, 15)).toBe(1);
    expect(getActiveBeatIndex(18_000, 900, 15)).toBe(14);
    expect(getActiveBeatIndex(-500, 900, 15)).toBe(0);
  });
});

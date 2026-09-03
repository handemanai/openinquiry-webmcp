// SPDX-License-Identifier: Apache-2.0

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublisherDecidesDemo } from "./publisher-decides-demo";
import { PublisherDecidesLive } from "./publisher-decides-live";
import { publisherDecidesScenarioFor } from "./publisher-decides-scenario";
import {
  PUBLISHER_DECIDES_AGENT_INSTRUCTION,
  PUBLISHER_DECIDES_DISCOVERY_PROMPT,
  PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  PUBLISHER_DECIDES_FOLLOW_UP_PROMPT,
  PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS,
} from "./publisher-decides-prompts";
import { demoScenarioForId } from "@/src/lib/demo/scenario";

describe("PublisherDecidesDemo", () => {
  it("starts with a concise numbered preview of the live demonstration", () => {
    const html = renderToStaticMarkup(createElement(PublisherDecidesDemo));

    expect(html).toContain("How the live demonstration works");
    expect(html).toContain("You are a reader bringing ChatGPT to a medical journal.");
    expect(html).toContain("Open the medical journal.");
    expect(html).toContain("Ask one question.");
    expect(html).toContain("Watch the publisher answer.");
    expect(html).toContain("<ol");
    expect(html).toContain("Step 1 of 3");
    expect(html).toContain("Continue");
    expect(html).toContain("OpenInquiry home");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("Latest guidelines");
    expect(html).not.toContain("Reader access");
  });

  it("separates the research question from an explicit Site Tools instruction", () => {
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toBe(
      `Question:\n${PUBLISHER_DECIDES_DISCOVERY_QUESTION}\n\nAgent instruction:\n${PUBLISHER_DECIDES_AGENT_INSTRUCTION}`,
    );
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("Site Tools");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("exposed by this page");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("request full_text");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("pass this question as focusedQuery");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("current status");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("exact supporting section open");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("Do not use model knowledge");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).not.toContain("public abstract");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("how much physical activity");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("aerobic activity");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("muscle-strengthening activity");
    expect(PUBLISHER_DECIDES_DISCOVERY_PROMPT).toContain("Physical Activity for Adults");
    expect(PUBLISHER_DECIDES_FOLLOW_UP_PROMPT).toContain("leave the relevant section open.");
    expect(Object.values(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS)).toHaveLength(5);
    expect(Object.values(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS).every(
      (prompt) => prompt.endsWith("read the page directly to fill gaps."),
    )).toBe(true);
  });

  it("maps intro choices to the same signed scenario used by the journal", () => {
    const scenario = demoScenarioForId(publisherDecidesScenarioFor({
      entitlement: "guest",
      credentialRecognition: "recognized",
    }));

    expect(scenario?.providers.journal).toEqual({
      signedIn: false,
      proposedAgentCredentialRecognition: "recognized",
    });
  });

  it("keeps the live route centered on the journal rather than a policy dashboard", () => {
    const html = renderToStaticMarkup(createElement(PublisherDecidesLive));

    expect(html).toContain("The Journal");
    expect(html).toContain("August 2026");
    expect(html).toContain("Physical Activity for Adults");
    expect(html).toContain("Demo controls");
    expect(html).toContain("Reader entitlement");
    expect(html).toContain("Publisher recognition");
    expect(html).toContain("These controls stand in for two real systems");
    expect(html).toContain("an independent service would issue and govern the credential");
    expect(html).toContain("WebMCP itself does not verify retention or training behavior");
    expect(html).toContain("Copy prompt");
    expect(html).toContain("OpenInquiry home");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("Latest guidelines");
    expect(html).not.toContain("34 specialties");
    expect(html).not.toContain("About the journal");
    expect(html).not.toContain("Publisher activity");
    expect(html).not.toContain("Publisher boundary");
  });

  it("places guest preview before full article access in the live demo controls", () => {
    const html = renderToStaticMarkup(createElement(PublisherDecidesLive));

    expect(html.indexOf('value="guest"')).toBeLessThan(html.indexOf('value="entitled"'));
  });
});

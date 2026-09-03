// SPDX-License-Identifier: Apache-2.0

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  PUBLISHER_DECIDES_AGENT_INSTRUCTION,
  PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS,
} from "../../src/components/demo/publisher-decides-prompts";
import { findJournalGuideline } from "../../src/lib/demo/journal-guidelines-catalog";

type RegisteredTool = {
  execute: (
    input: Record<string, unknown>,
    context: { signal: AbortSignal },
  ) => Promise<unknown>;
};

async function installModelContext(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, unknown>();
    Object.defineProperty(window, "__openInquiryTestTools", {
      configurable: true,
      value: tools,
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(
          tool: { name: string },
          options?: { signal?: AbortSignal },
        ) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener("abort", () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          }, { once: true });
        },
      },
    });
  });
}

async function registeredToolNames(page: Page) {
  return page.evaluate(() => [
    ...(window as unknown as {
      __openInquiryTestTools: Map<string, unknown>;
    }).__openInquiryTestTools.keys(),
  ].sort());
}

async function registeredToolTitles(page: Page) {
  return page.evaluate(() => Object.fromEntries(
    [...(window as unknown as {
      __openInquiryTestTools: Map<string, { title?: string }>;
    }).__openInquiryTestTools.entries()]
      .map(([name, tool]) => [name, tool.title]),
  ));
}

async function callSiteTool(
  page: Page,
  name: string,
  input: Record<string, unknown>,
) {
  return page.evaluate(async ({ input, name }) => {
    const tools = (window as unknown as {
      __openInquiryTestTools: Map<string, RegisteredTool>;
    }).__openInquiryTestTools;
    const tool = tools.get(name);
    if (!tool) throw new Error(`${name} is not registered`);
    return tool.execute(input, { signal: new AbortController().signal });
  }, { input, name });
}

const searchRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-search",
  query: PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  contentTypes: ["guideline"],
  status: ["current"],
  limit: 1,
};

const statusRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-status",
  resourceIds: ["journal-guideline-2026-041"],
};

const retrieveRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-retrieve",
  resourceId: "journal-guideline-2026-041",
  locator: { sectionId: "weekly-activity-recommendation" },
  focusedQuery: PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  requestedRepresentation: "full_text",
};

const abstractRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-abstract",
  resourceId: "journal-guideline-2026-041",
  focusedQuery: PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  requestedRepresentation: "abstract",
};

const openRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-open",
  resourceId: "journal-guideline-2026-041",
  locator: { sectionId: "weekly-activity-recommendation" },
};

const accessRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-access",
};

const resolveRequest = {
  profileVersion: "0.1",
  requestId: "publisher-decides-resolve",
  resourceId: "journal-guideline-2026-041",
};

const expectedTools = [
  "knowledge_access",
  "knowledge_describe",
  "knowledge_open",
  "knowledge_resolve",
  "knowledge_retrieve",
  "knowledge_search",
  "knowledge_status",
];

const expectedArticleTools = [
  "knowledge_access",
  "knowledge_open",
  "knowledge_resolve",
  "knowledge_retrieve",
  "knowledge_status",
];

const describeRequest = {
  requestId: "publisher-decides-describe",
};

async function runDiscoverySequence(page: Page) {
  await callSiteTool(page, "knowledge_access", accessRequest);
  await callSiteTool(page, "knowledge_search", searchRequest);
  await callSiteTool(page, "knowledge_status", statusRequest);
  await callSiteTool(page, "knowledge_resolve", resolveRequest);
  await callSiteTool(page, "knowledge_retrieve", abstractRequest);
  await callSiteTool(page, "knowledge_open", openRequest);
}

test("the landing page offers the demonstration, presentation, and standards questions", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "OpenInquiry" })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Bring your agent to publisher content. The publisher decides what it can use.",
  })).toBeVisible();
  const principles = page.getByRole("list");
  await expect(principles.getByRole("listitem")).toHaveCount(3);
  await expect(principles.getByText(
    "WebMCP lets your agent request content on the publisher's live site.",
    { exact: false },
  )).toBeVisible();
  await expect(principles.getByText(
    "The publisher decides what comes back: an abstract, summary, section, full article, link, or nothing.",
    { exact: false },
  )).toBeVisible();
  await expect(principles.getByText(
    "OpenInquiry builds on WebMCP so publishers can state what agents may access and how they may use it.",
    { exact: false },
  )).toBeVisible();
  const destinationLinks = page
    .getByRole("navigation", { name: "OpenInquiry destinations" })
    .getByRole("link");
  await expect(destinationLinks).toHaveCount(3);
  await expect(destinationLinks.nth(0)).toHaveAttribute("href", "/presentation");
  await expect(destinationLinks.nth(1)).toHaveAttribute("href", "/demo/publisher-decides");
  await expect(destinationLinks.nth(2)).toHaveAttribute("href", "/next-steps");

  const contactButton = page.locator("summary", { hasText: "Contact Brian Pridgen, MD" });
  await expect(contactButton).toBeVisible();
  await contactButton.click();
  await expect(page.getByRole("link", { name: "brian@surgiscribe.co" })).toHaveAttribute(
    "href",
    "mailto:brian@surgiscribe.co",
  );
  await expect(page.getByRole("link", { name: /@handemanai/u })).toHaveAttribute(
    "href",
    "https://x.com/handemanai",
  );
  await page.getByRole("heading", { level: 1, name: "OpenInquiry" }).click();
  await expect(page.getByRole("link", { name: "brian@surgiscribe.co" })).toBeHidden();
  await expect(page.getByText("OI / 01", { exact: true })).toHaveCount(0);
  const disclosureFirstLine = page.getByText(
    "Fictional publisher and original synthetic content.",
    { exact: true },
  );
  const disclosureSecondLine = page.getByText(
    "Demonstration only. Not for clinical use.",
    { exact: true },
  );
  await expect(disclosureFirstLine).toBeVisible();
  await expect(disclosureSecondLine).toBeVisible();
  const firstLineBox = await disclosureFirstLine.boundingBox();
  const secondLineBox = await disclosureSecondLine.boundingBox();
  expect(firstLineBox).not.toBeNull();
  expect(secondLineBox).not.toBeNull();
  expect(secondLineBox!.y).toBeGreaterThan(firstLineBox!.y);

  const demonstrationLink = page.getByRole("link", { name: "Run the demonstration" });
  const presentationLink = page.getByRole("link", { name: "View the presentation" });
  const initialDemonstrationColor = await demonstrationLink.evaluate(
    (element) => getComputedStyle(element).color,
  );
  const initialPresentationColor = await presentationLink.evaluate(
    (element) => getComputedStyle(element).color,
  );

  await presentationLink.hover();
  await page.waitForTimeout(200);

  await expect.poll(() => demonstrationLink.evaluate(
    (element) => getComputedStyle(element).color,
  )).toBe(initialDemonstrationColor);
  await expect.poll(() => presentationLink.evaluate(
    (element) => getComputedStyle(element).color,
  )).not.toBe(initialPresentationColor);
  await expect.poll(() => registeredToolNames(page)).toEqual([]);
});

test("the landing-page copy expands with a wide browser window", async ({ page }) => {
  await page.setViewportSize({ width: 1662, height: 942 });
  await page.goto("/");

  const measurements = await page.locator("main").evaluate((main) => {
    const hero = main.querySelector("section");
    const copy = hero?.querySelector(":scope > div");
    const headline = hero?.querySelector("h2");
    const principles = hero?.querySelector("ul[class*='principles']");

    if (!hero || !copy || !headline || !principles) {
      throw new Error("Landing-page layout elements are missing.");
    }

    const heroWidth = hero.getBoundingClientRect().width;

    return {
      copyRatio: copy.getBoundingClientRect().width / heroWidth,
      headlineRatio: headline.getBoundingClientRect().width / heroWidth,
      principlesRatio: principles.getBoundingClientRect().width / heroWidth,
    };
  });

  expect(measurements.copyRatio).toBeGreaterThan(0.98);
  expect(measurements.headlineRatio).toBeGreaterThan(0.85);
  expect(measurements.principlesRatio).toBeGreaterThan(0.85);
});

test("every public destination offers a visible route back to the landing page", async ({ page }) => {
  const destinations = [
    "/presentation",
    "/demo/publisher-decides",
    "/demo",
    "/demo/article/journal-guideline-2026-041",
    "/next-steps",
  ];

  for (const destination of destinations) {
    await page.goto(destination);
    const homeLink = page.getByRole("link", { name: /home/iu }).first();
    await expect(homeLink, `${destination} should provide a visible home link`).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");
    if (destination === "/demo") {
      await expect(page.getByText("OpenInquiry", { exact: true })).toBeVisible();
    }
    await homeLink.click();
    await expect(page).toHaveURL("/");
  }
});

test("the next-steps page gives a concise and honest path beyond the reference demo", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/next-steps");

  await expect(page.getByRole("heading", {
    name: "What needs to happen next.",
  })).toBeVisible();
  await expect(page.getByText("Next steps", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "OpenInquiry home" })).toHaveAttribute("href", "/");
  await expect(page.getByText("OpenInquiry", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Make OpenInquiry easy for publishers to add.",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Give publishers clear choices.",
  })).toBeVisible();
  await expect(page.getByText("should not impose a universal character ceiling", {
    exact: false,
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Define what agents and browsers must prove.",
  })).toBeVisible();
  await expect(page.getByText("browser-enforced mode", { exact: false })).toBeVisible();
  await expect(page.getByText("WebMCP does not provide this guarantee today", {
    exact: false,
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create an open standards process." })).toBeVisible();
  await expect(page.getByText("not yet an interoperable standard", { exact: false })).toBeVisible();
  await expect.poll(() => registeredToolNames(page)).toEqual([]);
});

test("the walkthrough explains the live demo one concise beat at a time", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo/publisher-decides");
  await page.waitForTimeout(100);

  await expect(page.getByRole("heading", {
    name: "Act as a reader bringing ChatGPT to a medical journal.",
  })).toBeVisible();
  await expect(page.getByText("How the live demonstration works")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  const homeLink = page.getByRole("link", { name: "OpenInquiry home" });
  await expect(homeLink).toBeVisible();
  await expect(homeLink).toContainText("OpenInquiry home");
  await expect(homeLink.locator("span")).toHaveText("←");
  await expect(page.getByLabel("Step 1 of 3")).toBeVisible();
  await expect.poll(() => registeredToolNames(page)).toEqual([]);

  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toBeInViewport();
  await expect(page.locator("footer").getByRole("button", { name: "Continue" })).toHaveCount(0);
  await continueButton.click();
  await expect(page.getByRole("heading", {
    name: "The publisher checks two conditions before returning anything.",
  })).toBeVisible();
  await expect(page.getByLabel("Reader entitlement options").getByText("Not entitled", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByLabel("Reader entitlement options").getByText("Entitled", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByText("Full guideline access", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Proposed agent policy signal options").getByText("Not recognized by publisher", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByLabel("Proposed agent policy signal options").getByText("Recognized by publisher", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByText("Proposed zero-retention credential simulated", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Full article access" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "No qualifying credential recognized" })).toBeChecked();
  await expect(page.getByText("Current", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(2);
  const policyMatrix = page.getByRole("table", { name: "Expected Site Tool response" });
  await expect(policyMatrix).toBeVisible();
  await expect(policyMatrix.getByRole("columnheader", { name: "Publisher recognition" })).toBeVisible();
  await expect(policyMatrix.getByRole("row", {
    name: "Guest preview Public abstract Abstract + publisher summary",
  })).toBeVisible();
  await expect(policyMatrix.getByRole("row", {
    name: "Full article access Complete relevant section Complete article text",
  })).toBeVisible();
  await expect(policyMatrix.getByRole("cell", {
    name: "Complete relevant section",
  })).toHaveAttribute("data-current", "true");
  await page.getByRole("radio", { name: "Zero-retention claim recognized" }).check();
  await expect(policyMatrix.getByRole("cell", {
    name: "Complete article text",
  })).toHaveAttribute("data-current", "true");
  await page.getByRole("radio", { name: "No qualifying credential recognized" }).check();
  await expect(policyMatrix.getByRole("cell", {
    name: "Complete relevant section",
  })).toHaveAttribute("data-current", "true");
  await expect(page.getByText("not verification by WebMCP", { exact: false })).toHaveCount(0);
  await expect(homeLink).toBeVisible();

  await expect(continueButton).toBeVisible();
  await expect(continueButton).toBeInViewport();
  await continueButton.click();
  await expect(page.getByRole("heading", {
    name: "How to run the demo",
  })).toBeVisible();
  await expect(page.getByText("How the live demonstration works", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText(
    "Use Demo Controls to change reader access and the simulated policy signal.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText("Copy the question and agent instruction.", {
    exact: true,
  })).toBeVisible();
  const journalInstruction = page.getByText(
    "Paste the prompt into this browser’s agent.",
    { exact: true },
  );
  await expect(journalInstruction).toBeVisible();
  const journalInstructionLineCount = await journalInstruction.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].length;
  });
  expect(journalInstructionLineCount).toBe(1);
  await expect(page.getByRole("listitem").nth(3).getByRole("button", {
    name: "Copy prompt",
  })).toBeVisible();
  await expect(page.getByText("Question", { exact: true })).toBeVisible();
  await expect(page.getByText("Agent instruction", { exact: true })).toBeVisible();
  await expect(page.getByText(PUBLISHER_DECIDES_AGENT_INSTRUCTION, { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByRole("button", { name: "Prompt copied" })).toHaveText("Copied!");
  await expect(journalInstruction).toBeVisible();
  const promptLineWidths = await page.getByText(PUBLISHER_DECIDES_DISCOVERY_QUESTION, {
    exact: true,
  }).evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].map(({ width }) => width);
  });
  expect(promptLineWidths.length).toBeGreaterThan(1);
  expect(promptLineWidths.at(-1)).toBeGreaterThan(Math.max(...promptLineWidths) * 0.4);
  await expect(homeLink).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the Journal of Guidelines" }))
    .toHaveAttribute("href", "/demo");
});

test("intro mode choices carry into the journal Demo Controls", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo/publisher-decides");

  await page.getByRole("button", { name: "Continue" }).click();

  const guestPreview = page.getByRole("radio", { name: "Guest preview" });
  await guestPreview.check();
  await expect(guestPreview).toBeChecked();

  const recognizedAssurance = page.getByRole("radio", {
    name: "Zero-retention claim recognized",
  });
  await expect(recognizedAssurance).toBeEnabled();
  await recognizedAssurance.check();
  await expect(recognizedAssurance).toBeChecked();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("link", { name: "Open the Journal of Guidelines" }).click();
  await expect(page).toHaveURL(/\/demo$/u);

  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("radio", { name: "Guest preview" })).toBeChecked();
  await expect(page.getByRole("radio", {
    name: "Zero-retention claim recognized",
  })).toBeChecked();
});

test("the walkthrough stays composed in a wide, short Chrome window", async ({ page }) => {
  await page.setViewportSize({ width: 1662, height: 998 });
  await page.goto("/demo/publisher-decides");

  const assertCompactViewport = async () => {
    const layout = await page.evaluate(() => ({
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  };

  const firstHeading = page.getByRole("heading", {
    name: "Act as a reader bringing ChatGPT to a medical journal.",
  });
  expect(Number.parseFloat(await firstHeading.evaluate(
    (element) => getComputedStyle(element).fontSize,
  ))).toBeLessThanOrEqual(64);
  await assertCompactViewport();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeInViewport();
  await assertCompactViewport();

  await page.getByRole("button", { name: "Continue" }).click();
  const promptBox = await page.locator("blockquote").boundingBox();
  const copyBox = await page.getByRole("button", { name: "Copy prompt" }).boundingBox();
  const promptParagraphs = page.locator("blockquote p");
  expect(promptBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  await expect(promptParagraphs).toHaveCount(2);
  await expect(promptParagraphs.nth(0)).toContainText(PUBLISHER_DECIDES_DISCOVERY_QUESTION);
  await expect(promptParagraphs.nth(1)).toContainText(PUBLISHER_DECIDES_AGENT_INSTRUCTION);
  expect(copyBox!.x - (promptBox!.x + promptBox!.width)).toBeGreaterThanOrEqual(28);
  await expect(page.getByRole("link", { name: "Open the Journal of Guidelines" }))
    .toBeInViewport();
  await assertCompactViewport();
});

test("judge-facing guidance never relies on microscopic text", async ({ page }) => {
  for (const route of ["/", "/next-steps", "/demo/publisher-decides", "/demo"]) {
    await page.goto(route);
    const undersized = await page.locator("main *").evaluateAll((elements) => elements
      .filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.matches("pre, code, [aria-hidden='true'], .visuallyHidden")) return false;
        const bounds = element.getBoundingClientRect();
        const text = element.innerText.trim();
        const hasTextElementChild = [...element.children].some(
          (child) => child instanceof HTMLElement && child.innerText.trim().length > 0,
        );
        return text.length > 0
          && !hasTextElementChild
          && bounds.width > 0
          && bounds.height > 0
          && Number.parseFloat(getComputedStyle(element).fontSize) < 12;
      })
      .map((element) => ({
        size: getComputedStyle(element).fontSize,
        text: (element as HTMLElement).innerText.trim().slice(0, 120),
      })));
    expect(undersized, `${route} contains rendered text below 12px`).toEqual([]);
  }

  await page.goto("/demo");
  await page.getByRole("button", { name: "Demo controls" }).click();
  const undersizedDialogText = await page.locator("dialog[open] *").evaluateAll((elements) =>
    elements
      .filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.matches("[aria-hidden='true']")) return false;
        const bounds = element.getBoundingClientRect();
        const text = element.innerText.trim();
        const hasTextElementChild = [...element.children].some(
          (child) => child instanceof HTMLElement && child.innerText.trim().length > 0,
        );
        return text.length > 0
          && !hasTextElementChild
          && bounds.width > 0
          && bounds.height > 0
          && Number.parseFloat(getComputedStyle(element).fontSize) < 12;
      })
      .map((element) => ({
        size: getComputedStyle(element).fontSize,
        text: (element as HTMLElement).innerText.trim().slice(0, 120),
      })),
  );
  expect(undersizedDialogText, "demo controls contain rendered text below 12px").toEqual([]);
});

test("an external agent can find the guideline, open the article, and receive a different follow-up result", async ({ context, page }) => {
  await installModelContext(page);
  await page.goto("/demo");

  await expect(page.getByRole("link", { name: "The Journal of Guidelines" })).toBeVisible();
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);
  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("radio", { name: "Full article access" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "No qualifying credential recognized" })).toBeChecked();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);
  await expect.poll(() => registeredToolTitles(page)).toEqual({
    knowledge_describe: "Describe this site",
    knowledge_access: "Check current access",
    knowledge_search: "Search publications",
    knowledge_retrieve: "Retrieve permitted evidence",
    knowledge_resolve: "Resolve access",
    knowledge_open: "Open source for reader",
    knowledge_status: "Check publication status",
  });

  const description = await callSiteTool(
    page,
    "knowledge_describe",
    describeRequest,
  ) as {
    profile: {
      name: string;
      version: string;
      schemaUrl?: string;
      supportedVersions?: string[];
    };
    provider: { role: string };
  };
  expect(description.profile).toMatchObject({
    name: "openinquiry.publisher-knowledge-access",
    version: "0.1",
    schemaUrl: `${new URL(page.url()).origin}/openinquiry/profile/0.1/schema`,
    supportedVersions: ["0.1"],
  });
  expect(description.provider.role).toBe("publisher");
  const schemaResponse = await page.request.get(description.profile.schemaUrl!);
  expect(schemaResponse.ok()).toBe(true);
  await expect(schemaResponse.json()).resolves.toMatchObject({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "OpenInquiry Publisher Knowledge Access Profile 0.1",
  });

  const access = await callSiteTool(
    page,
    "knowledge_access",
    accessRequest,
  ) as {
    status: string;
    access?: { state?: string; basisLabel?: string };
  };
  expect(access.status).toBe("ok");
  expect(access.access).toMatchObject({
    state: "entitled",
    basisLabel:
      "Full article access recognized for this simulated signed-in reader.",
  });

  const resolution = await callSiteTool(
    page,
    "knowledge_resolve",
    resolveRequest,
  ) as {
    status: string;
    grants?: Array<{ representation?: string }>;
    actions?: Array<{ type?: string }>;
  };
  expect(resolution.status).toBe("ok");
  expect(resolution.grants).toContainEqual(expect.objectContaining({
    representation: "link_only",
  }));
  expect(resolution.actions?.map(({ type }) => type)).toContain("deep_link");

  const partialWordSearch = await callSiteTool(
    page,
    "knowledge_search",
    { profileVersion: "0.1", query: "rate", limit: 6 },
  ) as { status: string; resources?: unknown[] };
  expect(partialWordSearch.status).toBe("not_found");
  expect(partialWordSearch.resources).toBeUndefined();

  await runDiscoverySequence(page);
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedArticleTools);
  await expect(page.getByRole("heading", { name: "Physical Activity for Adults", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demo controls" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask your agent to use the article." }))
    .toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Full article for you. Public material for your agent.",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "The publisher did not provide protected guideline text to the agent.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("heading", { name: "What the publisher gave the agent", exact: true }))
    .toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
  await expect(page.getByText("Objective", { exact: true })).toBeVisible();
  await expect(page.getByText("Recommendations", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Conclusions", { exact: true })).toBeVisible();
  for (const part of [
    "Overview and recommendations",
    "Using the recommendations",
    "Rationale and certainty",
    "Development and review",
  ]) {
    await expect(page.getByRole("heading", { name: part, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Recommendations for adults", exact: true }))
    .toBeVisible();
  await expect(page.getByText("Recommendation 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Recommendation 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Recommendation 3", { exact: true })).toBeVisible();
  await expect(page.getByText(/Recommendation 2\.1/u)).toHaveCount(0);
  await expect(page.getByText("Reader section · p.", { exact: false })).toHaveCount(0);
  await expect(page.getByText(
    "The publisher selected this passage because it was relevant to the question. The full article continues above and below it.",
    { exact: true },
  )).toHaveCount(0);
  const evidenceLauncher = page.getByRole("button", { name: "See what the agent received" });
  await evidenceLauncher.scrollIntoViewIfNeeded();
  const articleScrollPosition = await page.evaluate(() => window.scrollY);
  await evidenceLauncher.click();
  await expect(page.getByRole("dialog", { name: "What the publisher gave the agent" }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "What the publisher gave the agent", exact: true }))
    .toBeVisible();
  await expect(page.getByText(
    "Everything the publisher supplied through Site Tools is shown below. The response does not include the complete article.",
    { exact: true },
  )).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: "What the publisher gave the agent" }))
    .not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(articleScrollPosition);
  await expect(page.getByRole("button", { name: "See what the agent received" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Guideline contents" })).not.toBeVisible();
  await page.getByText("Contents", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Guideline contents" })).toBeVisible();

  await callSiteTool(page, "knowledge_retrieve", retrieveRequest);
  await callSiteTool(page, "knowledge_open", openRequest);
  await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    /\/demo\/article\/journal-guideline-2026-041#weekly-activity-recommendation$/u,
  );
  await expect(page.locator("#weekly-activity-recommendation")).toBeFocused();
  await page.getByRole("button", { name: "See what the agent received" }).click();
  const evidenceRegion = page.getByRole("region", { name: "What the publisher gave the agent" });
  const policyMapping = page.getByRole("region", {
    name: "Selected access conditions and resulting publisher behavior",
  });
  await expect(policyMapping.getByText("Reader entitlement", { exact: true })).toBeVisible();
  await expect(policyMapping.getByText("Full article access", { exact: true })).toBeVisible();
  await expect(policyMapping.getByText("Publisher recognition", { exact: false })).toBeVisible();
  await expect(policyMapping.getByText("No qualifying credential recognized", { exact: true })).toBeVisible();
  await expect(policyMapping.getByText("Complete relevant section", { exact: true })).toBeVisible();
  await expect(evidenceRegion.getByText("Section excerpt", { exact: true }).first()).toBeVisible();
  await expect(evidenceRegion.getByText(/^0[1-9]$/u)).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Full article for you. The relevant section for your agent.",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "The publisher supplied the complete “Recommendations for adults” section while preserving your full article access.",
    { exact: true },
  ))
    .toBeVisible();
  await expect(page.getByText(
    "Section excerpt",
    { exact: true },
  ).first()).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "See what the agent received" })).toBeFocused();

  await callSiteTool(page, "knowledge_retrieve", retrieveRequest);
  await expect(page.getByRole("heading", {
    name: "Full article for you. The relevant section for your agent.",
    exact: true,
  })).toBeVisible();

  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("dialog", { name: "Ask your agent to use the article." }))
    .toBeVisible();
  await expect(page.getByText(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-041"],
    { exact: true },
  ))
    .toBeVisible();
  await expect(page.getByText(PUBLISHER_DECIDES_AGENT_INSTRUCTION, { exact: true }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible();
  await page.getByRole("radio", { name: "Zero-retention claim recognized" }).check();
  await expect(page.getByRole("dialog", { name: "Ask the same question again." }))
    .toBeVisible();
  await expect(page.getByText(
    "The previous evidence package has been removed so the next result reflects the current conditions.",
    { exact: true },
  )).toBeVisible();
  await page.waitForTimeout(300);
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedArticleTools);

  await callSiteTool(page, "knowledge_status", statusRequest);
  await callSiteTool(page, "knowledge_retrieve", retrieveRequest);
  await callSiteTool(page, "knowledge_open", openRequest);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Full article for you. Complete article for your agent.",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText(
    "The publisher recognized the simulated credential and supplied the complete article for transient, attributed use under its stated rights policy.",
  )).toBeVisible();
  await page.getByRole("button", { name: "See what the agent received" }).click();
  await expect(page.getByText("Complete article text", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(
    "The reader keeps full article access. After recognizing the simulated credential, the publisher supplied the agent with the complete article for transient, attributed use.",
    { exact: true },
  )).toBeVisible();

  await page.goto(
    "/demo/article/journal-guideline-2026-041",
  );
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedArticleTools);
  await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(250);
  await page.getByRole("button", { name: "See what the agent received" }).click();
  await expect(page.getByRole("heading", { name: "What the publisher gave the agent" }))
    .toBeVisible();
  await expect(page.getByText("Complete article text", { exact: true }).first()).toBeVisible();

  const freshTab = await context.newPage();
  await freshTab.goto(
    "/demo/article/journal-guideline-2026-041#weekly-activity-recommendation",
  );
  await expect(freshTab.getByRole("heading", {
    name: "Full article for you. Complete article for your agent.",
    exact: true,
  })).toBeVisible();
  await freshTab.getByRole("button", { name: "See what the agent received" }).click();
  await expect(freshTab.getByRole("heading", { name: "What the publisher gave the agent" }))
    .toBeVisible();
  await freshTab.close();
});

test("every journal homepage entry opens as a complete navigable guideline", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo");

  const guidelines = [
    ["journal-guideline-2026-041", "Physical Activity for Adults", "Weekly aerobic activity"],
    ["journal-guideline-2026-039", "High Blood Pressure in Adults", "Confirm the measurement"],
    ["journal-guideline-2026-036", "Type 2 Diabetes Screening", "Offer screening through shared assessment"],
    ["journal-guideline-2026-033", "Antibiotic Treatment for Pneumonia", "Establish the care setting"],
    ["journal-guideline-2026-029", "Adult Vaccination Schedules", "Review vaccination history"],
  ] as const;

  for (const [resourceId, title, recommendation] of guidelines) {
    await page.getByRole("link", { name: `Read ${title}`, exact: true }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview and recommendations", exact: true }))
      .toBeVisible();
    await expect(page.getByText(recommendation, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Demo controls" }).click();
    await expect(page.getByRole("dialog", { name: "Ask your agent to use the article." }))
      .toBeVisible();
    const promptId = findJournalGuideline(resourceId)?.id;
    expect(promptId).toBeTruthy();
    await expect(page.getByText(PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS[promptId!], { exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("link", { name: "← Return to latest guidelines", exact: true }))
      .toHaveAttribute("href", "/demo");
    await page.getByRole("link", { name: "← Return to latest guidelines", exact: true }).click();
    await expect(page.getByRole("link", { name: "Read Physical Activity for Adults", exact: true }))
      .toBeVisible();
  }
});

test("a WebMCP search can identify and open a non-primary guideline recommendation", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo");
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);
  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("radio", { name: "Full article access" })).toBeEnabled();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);

  const searchResponse = await callSiteTool(page, "knowledge_search", {
    profileVersion: "0.1",
    requestId: "publisher-decides-blood-pressure-search",
    query: "hypertension measurement confirmation cardiovascular risk",
    contentTypes: ["guideline"],
    status: ["current"],
    limit: 1,
  }) as {
    resources?: Array<{
      id: string;
      locator?: {
        sectionId?: string;
        sectionTitle?: string;
        page?: string;
        figureId?: string;
        timestampSeconds?: number;
        timestampEndSeconds?: number;
        timestampLabel?: string;
      };
    }>;
  };
  const searchResource = searchResponse.resources?.[0];
  expect(searchResource).toMatchObject({
    id: "journal-guideline-2026-039",
    locator: {
      sectionId: "blood-pressure-recommendations",
      sectionTitle: "Recommendations for adults",
    },
  });
  const bloodPressureRow = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "High Blood Pressure in Adults", exact: true }),
  });
  await expect(bloodPressureRow.getByText("Your agent found this guideline", { exact: true }))
    .toBeVisible();
  await expect(page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Physical Activity for Adults", exact: true }),
  }).getByText("Your agent found this guideline", { exact: true })).toHaveCount(0);

  await callSiteTool(page, "knowledge_retrieve", {
    profileVersion: "0.1",
    requestId: "publisher-decides-blood-pressure-retrieve",
    resourceId: searchResource!.id,
    locator: searchResource!.locator,
    focusedQuery:
      "confirm elevated blood pressure measurement clinical context cardiovascular risk medicines symptoms and patient priorities",
    requestedRepresentation: "quotation",
    maxCharacters: 2000,
  });

  await page.evaluate((input) => {
    const tools = (window as unknown as {
      __openInquiryTestTools: Map<string, RegisteredTool>;
    }).__openInquiryTestTools;
    const tool = tools.get("knowledge_open");
    if (!tool) throw new Error("knowledge_open is not registered");
    void tool.execute(input, { signal: new AbortController().signal });
  }, {
    profileVersion: "0.1",
    requestId: "publisher-decides-blood-pressure-open",
    resourceId: searchResource!.id,
    locator: searchResource!.locator,
  });

  await expect(page.getByRole("heading", { name: "High Blood Pressure in Adults", exact: true }))
    .toBeVisible();
  await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    /\/demo\/article\/journal-guideline-2026-039#blood-pressure-recommendations$/u,
  );
  await expect(page.locator("#blood-pressure-recommendations")).toBeFocused();
  await page.getByRole("button", { name: "See what the agent received" }).click();
  await expect(page.getByRole("heading", { name: "What the publisher gave the agent", exact: true }))
    .toBeVisible();
});

test("the journal homepage keeps demonstration chrome in a separate modal", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo");

  await expect(page.getByText("Latest guidelines", { exact: true })).toHaveCount(0);
  await expect(page.getByText(
    "Ask your agent to find current guidance and open the supporting publication.",
    { exact: true },
  )).toHaveCount(0);
  await expect(page.getByText("34 specialties", { exact: true })).toHaveCount(0);
  await expect(page.getByText("About the journal", { exact: true })).toHaveCount(0);
  await expect(page.getByText("OpenInquiry discussion draft 0.1", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Full article access" })).not.toBeVisible();

  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("dialog", { name: "Compare what the publisher supplies." }))
    .toBeVisible();
  await expect(page.getByRole("radio", { name: "Full article access" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "No qualifying credential recognized" })).toBeChecked();
  await expect(page.getByText(
    "This is a fictional publisher using synthetic content. Not for clinical use.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = result.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test("guest access opens only the public WebMCP evidence package", async ({ page }) => {
  await installModelContext(page);
  await page.goto("/demo");
  await page.getByRole("button", { name: "Demo controls" }).click();
  await expect(page.getByRole("radio", { name: "Full article access" })).toBeEnabled();
  await page.getByRole("radio", { name: "Guest preview" }).check();
  await expect(page.getByRole("radio", { name: "Guest preview" })).toBeEnabled();
  await page.getByRole("button", { name: "Close" }).click();
  await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);
  await runDiscoverySequence(page);

  await expect(page.getByRole("heading", { name: "Abstract and citation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Public preview" })).toHaveCount(0);
  await page.getByRole("button", { name: "See what the agent received" }).click();
  await expect(page.getByRole("heading", { name: "What the publisher gave the agent" })).toBeVisible();
  await expect(page.getByRole("region", { name: "What the publisher gave the agent" })
    .getByText("Public abstract", { exact: true }).first()).toBeVisible();
});

test("the four demo permutations produce four distinct provider evidence packages", async ({ page }) => {
  await installModelContext(page);

  const modes = [
    {
      entitlement: "Guest preview",
      policy: "No qualifying credential recognized",
      behavior: "Public abstract",
      headline: "Preview access for you. Public abstract for your agent.",
      explanation: "The publisher did not provide the weekly minutes or strength-training frequency.",
      representations: ["abstract"],
    },
    {
      entitlement: "Guest preview",
      policy: "Zero-retention claim recognized",
      behavior: "Expanded public preview",
      headline: "Preview access for you. A broader summary for your agent.",
      explanation: "The publisher did not provide the weekly minutes or strength-training frequency.",
      representations: ["abstract", "summary"],
    },
    {
      entitlement: "Full article access",
      policy: "No qualifying credential recognized",
      behavior: "Complete relevant section",
      headline: "Full article for you. The relevant section for your agent.",
      explanation: "The publisher supplied the complete “Recommendations for adults” section while preserving your full article access.",
      representations: ["quotation"],
    },
    {
      entitlement: "Full article access",
      policy: "Zero-retention claim recognized",
      behavior: "Complete article text",
      headline: "Full article for you. Complete article for your agent.",
      explanation: "The publisher recognized the simulated credential and supplied the complete article for transient, attributed use under its stated rights policy.",
      representations: ["full_text"],
    },
  ] as const;

  for (const [index, mode] of modes.entries()) {
    await page.goto("/demo");
    await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);
    await page.getByRole("button", { name: "Demo controls" }).click();
    await expect(page.getByRole("radio", { name: "Full article access" })).toBeEnabled();
    await page.getByRole("radio", { name: mode.entitlement }).check();
    await expect(page.getByRole("radio", { name: mode.entitlement })).toBeEnabled();
    await page.getByRole("radio", { name: mode.policy }).check();
    await expect(page.getByRole("radio", { name: mode.policy })).toBeEnabled();
    await page.getByRole("button", { name: "Close" }).click();
    await expect.poll(() => registeredToolNames(page)).toEqual(expectedTools);

    const searchResponse = await callSiteTool(page, "knowledge_search", {
      profileVersion: "0.1",
      requestId: `matrix-search-${index}`,
      query: PUBLISHER_DECIDES_DISCOVERY_QUESTION,
      contentTypes: ["guideline"],
      status: ["current"],
      limit: 1,
    }) as { resources?: Array<{ id: string }> };
    expect(searchResponse.resources?.[0]?.id).toBe("journal-guideline-2026-041");

    const response = await callSiteTool(page, "knowledge_retrieve", {
      profileVersion: "0.1",
      requestId: `matrix-retrieve-${index}`,
      resourceId: "journal-guideline-2026-041",
      focusedQuery: PUBLISHER_DECIDES_DISCOVERY_QUESTION,
      requestedRepresentation: "full_text",
    }) as { grants?: Array<{
      representation: string;
      content?: string;
      locator?: { sectionId?: string };
    }> };
    const representations = response.grants?.map(({ representation }) => representation) ?? [];

    expect(representations).toEqual(mode.representations);
    if (index === 2) {
      expect(response.grants?.[0]?.content).toContain("Adults should aim for 150 to 300 minutes");
      expect(response.grants?.[0]?.content).toContain("two or more days each week");
    }
    if (index === 3) {
      expect(response.grants?.[0]?.content).toContain("How this guideline was developed");
      expect(response.grants?.[0]?.content).toContain("Review schedule and disclosures");
    }
    const quotationGrant = response.grants?.find(
      ({ representation }) => representation === "quotation",
    );
    if (quotationGrant) {
      expect(quotationGrant.locator?.sectionId).toBe("weekly-activity-recommendation");
      expect(quotationGrant.content).toMatch(/weekly|aerobic|strength|activity/iu);
    }

    await callSiteTool(page, "knowledge_open", {
      profileVersion: "0.1",
      requestId: `matrix-open-${index}`,
      resourceId: "journal-guideline-2026-041",
      locator: { sectionId: "weekly-activity-recommendation" },
    });
    if (mode.entitlement === "Full article access") {
      await expect(page.getByRole("heading", { name: "Abstract", exact: true })).toBeVisible();
      const supportingSection = page.locator("#weekly-activity-recommendation");
      if (index === 2) {
        const quotation = response.grants?.find(
          ({ representation }) => representation === "quotation",
        )?.content ?? "";
        expect(quotation).not.toBe("");
      } else {
        expect(response.grants?.some(
          ({ representation }) => representation === "full_text",
        )).toBe(true);
      }
      await expect(supportingSection.getByText("Relevant to your question", { exact: true }))
        .toBeVisible();
      await expect(supportingSection.locator("mark")).toHaveCount(0);
      await expect(supportingSection.getByText(/character question-matched excerpt/u)).toHaveCount(0);
    }
    const permissionResult = page.getByRole("region", {
      name: "Current publisher permission result",
    });
    await expect(permissionResult.getByText("Publisher decision", { exact: true })).toBeVisible();
    await expect(permissionResult.getByRole("heading", { name: mode.headline, exact: true }))
      .toBeVisible();
    await expect(permissionResult.getByText(mode.entitlement, { exact: true })).toBeVisible();
    await expect(permissionResult.getByText(mode.policy, { exact: true })).toBeVisible();
    await expect(permissionResult.getByText(mode.explanation, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "See what the agent received" }).click();
    const policyMapping = page.getByRole("region", {
      name: "Selected access conditions and resulting publisher behavior",
    });
    await expect(policyMapping.getByText("Reader entitlement", { exact: true })).toBeVisible();
    await expect(policyMapping.getByText(mode.entitlement, { exact: true })).toBeVisible();
    await expect(policyMapping.getByText("Publisher recognition", { exact: false })).toBeVisible();
    await expect(policyMapping.getByText(mode.policy, { exact: true })).toBeVisible();
    await expect(policyMapping.getByText("Resulting publisher behavior", { exact: true })).toBeVisible();
    await expect(policyMapping.getByText(mode.behavior, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What the publisher gave the agent" }))
      .toBeVisible();
  }
});

for (const route of [
  "/",
  "/next-steps",
  "/demo/publisher-decides",
  "/demo",
  "/demo/article/journal-guideline-2026-039",
]) {
  for (const width of [1440, 900, 390, 320]) {
    test(`${route} stays within the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
      await page.goto(route);

      const overflow = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
    });
  }
}

for (const route of [
  "/",
  "/next-steps",
  "/demo/publisher-decides",
  "/demo",
  "/demo/article/journal-guideline-2026-039",
]) {
  test(`${route} has no serious or critical automated accessibility findings`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = result.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

const CONNECTION_TITLE = [
  "WebMCP connects the reader’s agent to the publisher’s page.",
  "OpenInquiry would let the publisher decide what the agent gets.",
] as const;

const CONNECTION_BODY = [
  "The reader uses the agent they choose.",
  "The publisher remains the source and keeps its relationship with the reader.",
] as const;

for (const viewport of [
  { height: 942, label: "Chrome Retina window", width: 1202 },
  { height: 1491, label: "in-app browser", width: 1554 },
  { height: 1080, label: "fullscreen desktop", width: 1920 },
]) {
  test(`connection slide keeps its intended composition in the ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/presentation?beat=8");

    const presentation = page.locator("main");
    await expect(presentation).toHaveAttribute("data-story-index", "8");

    const title = page.locator(
      '[data-narrative-id="webmcp-and-openinquiry"] [data-narrative-state="active"] h2',
    );
    await expect(title).toBeVisible();

    const geometry = await title.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const lineRects = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        .map((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].map((rect) => ({
            right: rect.right,
            text: node.textContent?.trim(),
          }));
        });

      return {
        clientWidth: element.clientWidth,
        lineRects,
        right: bounds.right,
        scrollWidth: element.scrollWidth,
      };
    });

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.lineRects).toHaveLength(2);
    expect(geometry.lineRects.map((rects) => rects.map(({ text }) => text))).toEqual(
      CONNECTION_TITLE.map((line) => [line]),
    );
    for (const [line] of geometry.lineRects) {
      expect(line?.right).toBeLessThanOrEqual(viewport.width - 16);
    }

    const body = page.locator(
      '[data-narrative-id="webmcp-and-openinquiry"] [data-narrative-state="active"] span',
    );
    const bodyGeometry = await body.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const lineRects = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        .map((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].map((rect) => ({
            right: rect.right,
            text: node.textContent?.trim(),
          }));
        });

      return {
        clientWidth: element.clientWidth,
        lineRects,
        right: bounds.right,
        scrollWidth: element.scrollWidth,
      };
    });

    expect(bodyGeometry.scrollWidth).toBeLessThanOrEqual(bodyGeometry.clientWidth + 1);
    expect(bodyGeometry.right).toBeLessThanOrEqual(viewport.width);
    expect(bodyGeometry.lineRects).toHaveLength(2);
    expect(bodyGeometry.lineRects.map((rects) => rects.map(({ text }) => text))).toEqual(
      CONNECTION_BODY.map((line) => [line]),
    );
    for (const [line] of bodyGeometry.lineRects) {
      expect(line?.right).toBeLessThanOrEqual(viewport.width - 16);
    }

    const outcomeDivider = page.locator('path[d="M1000 824 V1000"]');
    const outcomeDividerBounds = await outcomeDivider.boundingBox();
    expect(outcomeDividerBounds).not.toBeNull();

    for (const line of [
      "Publisher decides",
      "The publisher determines",
      "what the agent gets.",
      "Every result links to the source.",
    ]) {
      const detail = page.getByText(line, { exact: true });
      await expect(detail).toBeVisible();
      const bounds = await detail.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x + bounds!.width).toBeLessThan(outcomeDividerBounds!.x - 12);
    }

    const finalDetail = page.getByText(
      "The publisher keeps the relationship.",
      { exact: true },
    );
    await expect(finalDetail).toBeVisible();
    const detailBounds = await finalDetail.boundingBox();
    expect(detailBounds).not.toBeNull();
    expect(detailBounds!.y + detailBounds!.height).toBeLessThanOrEqual(viewport.height);

    const pageWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client + 1);
  });
}

test("the policy sequence shows the exact four-state demo contract", async ({ page }) => {
  await page.setViewportSize({ width: 1554, height: 1491 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/presentation?beat=10");
  await expect(page.locator("main")).toHaveAttribute("data-story-index", "10");
  const activeNarrative = page.locator('[data-narrative-state="active"]');
  await expect(activeNarrative.locator("h2")).toHaveText(
    "This demo maps those conditions to four exact results.",
  );
  const results = page.locator('[data-policy-grants="four-state-demo"]');
  for (const result of [
    "PUBLIC ABSTRACT",
    "ABSTRACT + PUBLISHER SUMMARY",
    "COMPLETE RELEVANT SECTION",
    "COMPLETE ARTICLE TEXT",
  ]) {
    await expect(results.getByText(result, { exact: true })).toBeVisible();
  }
  await expect(activeNarrative).toContainText(
    "not a WebMCP default or universal character ceiling",
  );

  await page.goto("/presentation?beat=12");
  await expect(page.locator("main")).toHaveAttribute("data-story-index", "12");
  await expect(page.locator('[data-narrative-state="active"] h2')).toHaveText(
    "Each single-condition state returns a different package.",
  );
  const middleMap = page.locator('[data-policy-map="two-by-two"]');
  await expect(middleMap.getByText("NOT RECOGNIZED BY PUBLISHER", {
    exact: true,
  })).toBeVisible();
  await expect(middleMap.getByText("ABSTRACT + SUMMARY", { exact: true })).toBeVisible();
  await expect(middleMap.getByText("COMPLETE SECTION", { exact: true })).toBeVisible();

  await page.goto("/presentation?beat=13");
  await expect(page.locator("main")).toHaveAttribute("data-story-index", "13");
  await expect(page.locator('[data-narrative-state="active"] h2')).toHaveText(
    "Both conditions are required for complete article text.",
  );
  await expect(page.locator('[data-policy-map="two-by-two"]')
    .getByText("COMPLETE ARTICLE TEXT", { exact: true })).toBeVisible();

  const pageWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client + 1);
});

// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { journalGuidelines } from "@/src/data";

import { JOURNAL_GUIDELINE_CATALOG } from "./journal-guidelines-catalog";
import { projectGuidelinesReaderView } from "./guidelines-reader";
import {
  PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS,
  PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS,
} from "@/src/components/demo/publisher-decides-prompts";

describe("guidelines human reader projection", () => {
  it("keeps protected section text out of the public human view", () => {
    const view = projectGuidelinesReaderView("guest");

    expect(view.access.state).toBe("not_entitled");
    expect(view.readerView).toBe("public_preview");
    expect(view.abstract.length).toBeGreaterThan(0);
    expect(view.sections.length).toBeGreaterThan(1);
    expect(view.sections.every((section) => section.text === undefined)).toBe(true);
  });

  it("returns the complete human guideline for the entitled reader independently of agent assurance", () => {
    const view = projectGuidelinesReaderView("subscriber");

    expect(view.access).toMatchObject({
      state: "entitled",
      basisLabel: "Fictional full-article access",
    });
    expect(view.readerView).toBe("full_guideline");
    expect(view.sections).toHaveLength(11);
    expect(view.sections.find(({ id }) => id === "weekly-activity-recommendation")?.text)
      .toContain("150 to 300 minutes");
    expect(view.sections.find(({ id }) => id === "implementation-and-safety")?.text)
      .toContain("complete source context");
    expect(view.sections.at(-1)).toMatchObject({
      id: "disclosures-and-review-cycle",
    });
  });

  it("projects every journal homepage article through the same trusted reader boundary", () => {
    for (const guideline of JOURNAL_GUIDELINE_CATALOG) {
      const guest = projectGuidelinesReaderView("guest", guideline.id);
      const entitled = projectGuidelinesReaderView("subscriber", guideline.id);

      expect(guest).toMatchObject({
        resourceId: guideline.id,
        title: guideline.title,
        readerView: "public_preview",
      });
      expect(guest.sections.every((section) => section.text === undefined)).toBe(true);
      expect(entitled).toMatchObject({
        resourceId: guideline.id,
        title: guideline.title,
        readerView: "full_guideline",
      });
      expect(entitled.sections.length).toBeGreaterThanOrEqual(10);
      expect(entitled.sections.every((section) => Boolean(section.text))).toBe(true);
      expect(entitled.sections.some(
        (section) => section.id === guideline.recommendationSectionId,
      )).toBe(true);
    }
  });

  it("keeps every journal entry aligned with a complete publisher metadata record", () => {
    for (const guideline of JOURNAL_GUIDELINE_CATALOG) {
      const resource = journalGuidelines.find(({ id }) => id === guideline.id);
      expect(resource).toBeDefined();
      expect(guideline.abstractSections).toHaveLength(3);
      expect(guideline.abstractSections.map(({ label }) => label)).toEqual([
        "Objective",
        "Recommendations",
        "Conclusions",
      ]);
      expect(guideline.abstractSections.every(({ text }) => text.length > 80)).toBe(true);
      expect(resource).toMatchObject({
        providerId: "journal",
        rightsHolderName: "The Journal of Guidelines",
        contentType: "guideline",
        title: guideline.title,
        containerTitle: "The Journal of Guidelines",
        version: guideline.version,
        status: "current",
        canonicalPath: `/demo/article/${guideline.id}`,
        deepLinkPath:
          `/demo/article/${guideline.id}#${guideline.recommendationSectionId}`,
        access: { policyId: "journal-guidelines-bounded-v1" },
        license: "CC-BY-4.0",
      });
      expect(resource?.responsibleOrganization).toBeTruthy();
      expect(resource?.authors.length).toBeGreaterThanOrEqual(3);
      expect(resource?.identifiers).toEqual(expect.arrayContaining([
        expect.objectContaining({ scheme: "doi" }),
        expect.objectContaining({ scheme: "internal" }),
      ]));
      expect(resource?.dates.published).toMatch(/^2026-/u);
      expect(resource?.dates.updated).toMatch(/^2026-/u);
      expect(resource?.abstract.length).toBeGreaterThan(120);
      expect(resource?.keywords.length).toBeGreaterThanOrEqual(6);
      expect(resource?.ctaPathways.map(({ type }) => type)).toEqual([
        "open",
        "deep_link",
      ]);

      const organizedSectionIds = guideline.parts.flatMap(({ sectionIds }) => sectionIds);
      expect(new Set(organizedSectionIds)).toEqual(
        new Set(resource?.sections.map(({ id }) => id)),
      );
      const recommendation = resource?.sections.find(
        ({ id }) => id === guideline.recommendationSectionId,
      );
      const recommendationStatements = recommendation?.text.split(
        /(?<=\.)\s+(?=[A-Z])/u,
      ) ?? [];
      expect(guideline.recommendationTitles).toHaveLength(3);
      expect(recommendationStatements).toHaveLength(
        guideline.recommendationTitles.length,
      );
      expect(guideline.recommendationTitles.every((title) => title.length > 8)).toBe(true);
      expect(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS[guideline.id]).toContain("?");
      expect(PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS[guideline.id]).toMatch(
        /leave the .*section.* open\.$/iu,
      );
      expect(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS[guideline.id]).toContain("Site Tools");
      expect(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS[guideline.id]).toContain("exposed by this page");
      expect(PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS[guideline.id]).toContain("Request full_text");
      if (guideline.id === "journal-guideline-2026-041") {
        expect(PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS[guideline.id]).not.toContain(
          guideline.title,
        );
      } else {
        expect(PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS[guideline.id]).toContain(
          guideline.title,
        );
      }
      for (const section of resource?.sections ?? []) {
        expect(section.locator).toMatchObject({
          sectionId: section.id,
          sectionTitle: section.heading,
        });
        expect(section.locator.page).toBeUndefined();
        expect(section.deepLinkPath).toBe(
          `/demo/article/${guideline.id}#${section.id}`,
        );
        expect(section.text.length).toBeGreaterThan(100);
      }
    }
  });
});

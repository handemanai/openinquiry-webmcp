// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  containsForbiddenAuthorityField,
  createClientProviderIdentity,
  endpointFor,
  providerIdForPathname,
  resolveClientRoute,
} from "./index";

describe("journal page-local bridge configuration", () => {
  it("recognizes only the judge-facing journal routes", () => {
    expect(providerIdForPathname("/demo")).toBe("journal");
    expect(providerIdForPathname("/demo/publisher-decides")).toBe("journal");
    expect(providerIdForPathname("/demo/article/journal-guideline-2026-041"))
      .toBe("journal");
    expect(providerIdForPathname("/")).toBeNull();
    expect(providerIdForPathname("/presentation")).toBeNull();
  });

  it("registers discovery tools on the journal and a focused set on articles", () => {
    const full = resolveClientRoute("journal", "/demo");
    expect(full.providerMatchesRoute).toBe(true);
    expect(full.route.capabilities).toHaveLength(7);

    const article = resolveClientRoute("journal", "/demo/article/example");
    expect(article.route.capabilities).toEqual([
      "knowledge_access",
      "knowledge_retrieve",
      "knowledge_resolve",
      "knowledge_open",
      "knowledge_status",
    ]);

    const narrowed = resolveClientRoute("journal", "/demo/article/example", [
      "knowledge_describe",
      "knowledge_retrieve",
      "knowledge_open",
    ]);
    expect(narrowed.route.capabilities).toEqual([
      "knowledge_retrieve",
      "knowledge_open",
    ]);
  });

  it("does not register journal tools on another route", () => {
    expect(resolveClientRoute("journal", "/presentation")).toMatchObject({
      providerMatchesRoute: false,
      expectedProviderId: null,
      route: { capabilities: [] },
    });
  });

  it("uses one same-origin endpoint and stable provider identity", () => {
    expect(endpointFor("journal", "knowledge_search"))
      .toBe("/api/openinquiry/journal/tools/knowledge_search");
    expect(createClientProviderIdentity("journal", "https://example.test/path"))
      .toEqual({
        id: "journal-of-guidelines",
        name: "The Journal of Guidelines",
        role: "publisher",
        canonicalUrl: "https://example.test/demo",
      });
  });

  it("detects nested attempts to assert access or destinations", () => {
    expect(containsForbiddenAuthorityField({ resourceId: "safe", locator: { sectionId: "a" } }))
      .toBe(false);
    expect(containsForbiddenAuthorityField({ context: { entitlement: "full" } })).toBe(true);
    expect(containsForbiddenAuthorityField({ nested: [{ destination: "https://elsewhere" }] }))
      .toBe(true);
  });
});

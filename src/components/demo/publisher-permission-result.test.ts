// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { buildPermissionResultCopy } from "./publisher-permission-result";

describe("buildPermissionResultCopy", () => {
  it("explains exactly what is missing from a guest abstract", () => {
    const copy = buildPermissionResultCopy({
      assurancePolicyRecognized: false,
      hasFullTextGrant: false,
      hasQuotationGrant: false,
      hasSummaryGrant: false,
      readerEntitled: false,
    });

    expect(copy.headline).toEqual([
      "Preview access for you.",
      "Public abstract for your agent.",
    ]);
    expect(copy.explanation).toContain("returned the public abstract");
    expect(copy.explanation).toContain("protected weekly targets");
    expect(copy.explanation).not.toContain("remain unavailable");
  });

  it("keeps the four permission outcomes visibly distinct", () => {
    const copies = [
      buildPermissionResultCopy({
        assurancePolicyRecognized: false,
        hasFullTextGrant: false,
        hasQuotationGrant: false,
        hasSummaryGrant: false,
        readerEntitled: false,
      }),
      buildPermissionResultCopy({
        assurancePolicyRecognized: true,
        hasFullTextGrant: false,
        hasQuotationGrant: false,
        hasSummaryGrant: true,
        readerEntitled: false,
      }),
      buildPermissionResultCopy({
        assurancePolicyRecognized: false,
        hasFullTextGrant: false,
        hasQuotationGrant: true,
        hasSummaryGrant: true,
        readerEntitled: true,
      }),
      buildPermissionResultCopy({
        assurancePolicyRecognized: true,
        hasFullTextGrant: true,
        hasQuotationGrant: false,
        hasSummaryGrant: false,
        readerEntitled: true,
      }),
    ];

    expect(new Set(copies.map(({ headline }) => headline.join(" ")))).toHaveLength(4);
  });
});

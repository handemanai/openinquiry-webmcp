// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { KnowledgeResponse } from "./types";
import { validateKnowledgeResponse } from "./validation";

const publisherFixture = JSON.parse(readFileSync(
  new URL("../../../evaluator/fixtures/base-responses.json", import.meta.url),
  "utf8",
)) as { publisher: KnowledgeResponse };

function response(): KnowledgeResponse {
  return structuredClone(publisherFixture.publisher);
}

describe("profile response date and date-time validation", () => {
  it("accepts valid RFC 3339 full-dates and offset date-times", () => {
    const candidate = response();
    const resource = candidate.resources?.[0];
    if (!resource || !candidate.access || !candidate.rights) {
      throw new Error("The publisher validation fixture is incomplete.");
    }
    resource.dates.published = "2024-02-29";
    resource.dates.updated = "2026-08-26";
    resource.dates.checked = "2026-08-26T12:34:56.789+05:30";
    candidate.access.validUntil = "2026-09-01T00:00:00Z";
    candidate.rights.limits = {
      ...candidate.rights.limits,
      expiresAt: "2026-09-01T18:30:00-07:00",
    };
    candidate.receipt.issuedAt = "2026-08-26T12:34:56Z";

    expect(validateKnowledgeResponse(candidate)).toEqual([]);
  });

  it("rejects invalid calendar dates and non-RFC3339 response instants", () => {
    const cases: Array<{
      expected: string;
      mutate: (candidate: KnowledgeResponse) => void;
    }> = [
      {
        expected: "resources[0].dates.published must be an RFC 3339 full-date",
        mutate: (candidate) => {
          candidate.resources![0].dates.published = "2023-02-29";
        },
      },
      {
        expected: "resources[0].dates.updated must be an RFC 3339 full-date",
        mutate: (candidate) => {
          candidate.resources![0].dates.updated = "2026-13-01";
        },
      },
      {
        expected: "resources[0].dates.checked must be an RFC 3339 date-time",
        mutate: (candidate) => {
          candidate.resources![0].dates.checked = "2026-08-26";
        },
      },
      {
        expected: "resources[0].dates.checked must be an RFC 3339 date-time",
        mutate: (candidate) => {
          candidate.resources![0].dates.checked = "2026-02-30T12:00:00Z";
        },
      },
      {
        expected: "access.validUntil must be an RFC 3339 date-time",
        mutate: (candidate) => {
          candidate.access!.validUntil = "2026-09-01";
        },
      },
      {
        expected: "receipt.issuedAt must be an RFC 3339 date-time",
        mutate: (candidate) => {
          candidate.receipt.issuedAt = "2026-08-26T12:00:00";
        },
      },
      {
        expected: "rights.limits.expiresAt must be an RFC 3339 date-time",
        mutate: (candidate) => {
          candidate.rights!.limits = { expiresAt: "2026-09-01T24:00:00Z" };
        },
      },
    ];

    for (const { expected, mutate } of cases) {
      const candidate = response();
      mutate(candidate);
      expect(validateKnowledgeResponse(candidate)).toContain(expected);
    }
  });
});

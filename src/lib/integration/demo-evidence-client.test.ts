// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { JOURNAL_GUIDELINE_CATALOG } from "@/src/lib/demo/journal-guidelines-catalog";
import {
  clearPublisherDecidesEvidence,
  publisherDecidesEvidenceStorageKey,
} from "./demo-evidence-client";

describe("browser evidence lifecycle", () => {
  it("removes current and legacy evidence for every demo resource", () => {
    const removeItem = vi.fn();

    clearPublisherDecidesEvidence({ removeItem });

    for (const guideline of JOURNAL_GUIDELINE_CATALOG) {
      expect(removeItem).toHaveBeenCalledWith(
        publisherDecidesEvidenceStorageKey(guideline.id),
      );
      expect(removeItem).toHaveBeenCalledWith(
        `openinquiry:journal-agent-evidence:v1:${guideline.id}`,
      );
    }
    expect(removeItem).toHaveBeenCalledTimes(JOURNAL_GUIDELINE_CATALOG.length * 2);
  });
});

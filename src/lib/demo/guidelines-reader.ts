// SPDX-License-Identifier: Apache-2.0

import { journalGuidelines } from "@/src/data";
import {
  DEFAULT_JOURNAL_GUIDELINE_ID,
  findJournalGuideline,
  type JournalGuidelineId,
} from "@/src/lib/demo/journal-guidelines-catalog";
import type { PersonaKey } from "@/src/data/types";
import {
  type PublicGuidelinesReaderView,
} from "@/src/lib/demo/guidelines-reader-contract";

function guidelinesResource(resourceId: JournalGuidelineId) {
  const resource = journalGuidelines.find(
    (candidate) => candidate.id === resourceId,
  );
  if (!resource) throw new Error("The guidelines demo resource is unavailable.");
  return resource;
}

/**
 * Projects the human reader surface from the provider's trusted signed-in
 * persona. Agent assurance is intentionally absent: it can change a WebMCP
 * grant, but it must never narrow what an entitled person may read.
 */
export function projectGuidelinesReaderView(
  persona: PersonaKey,
  resourceId: JournalGuidelineId = DEFAULT_JOURNAL_GUIDELINE_ID,
): PublicGuidelinesReaderView {
  if (!findJournalGuideline(resourceId)) {
    throw new Error("The requested journal guideline is unavailable.");
  }
  const resource = guidelinesResource(resourceId);
  const access = resource.access.byPersona[persona];
  const entitled = access.state === "entitled";

  return Object.freeze({
    resourceId,
    title: resource.title,
    authors: Object.freeze(resource.authors.map(({ name }) => name)),
    abstract: resource.abstract,
    updated: resource.dates.updated ?? resource.dates.published,
    access: Object.freeze({
      state: entitled ? "entitled" : "not_entitled",
      basisLabel: access.basisLabel,
    }),
    readerView: entitled ? "full_guideline" : "public_preview",
    sections: Object.freeze(resource.sections.map((section) => Object.freeze({
      id: section.id,
      heading: section.heading,
      ...(entitled ? { text: section.text } : {}),
    }))),
  });
}

export type { PublicGuidelinesReaderView } from "@/src/lib/demo/guidelines-reader-contract";

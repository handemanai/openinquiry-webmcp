// SPDX-License-Identifier: Apache-2.0

import {
  DEFAULT_JOURNAL_GUIDELINE_ID,
  type JournalGuidelineId,
} from "@/src/lib/demo/journal-guidelines-catalog";

export const GUIDELINES_DEMO_RESOURCE_ID = DEFAULT_JOURNAL_GUIDELINE_ID;

export type PublicGuidelinesReaderView = Readonly<{
  resourceId: JournalGuidelineId;
  title: string;
  authors: readonly string[];
  abstract: string;
  updated: string;
  access: Readonly<{
    state: "entitled" | "not_entitled";
    basisLabel: string;
  }>;
  readerView: "full_guideline" | "public_preview";
  sections: readonly Readonly<{
    id: string;
    heading: string;
    text?: string;
  }>[];
}>;

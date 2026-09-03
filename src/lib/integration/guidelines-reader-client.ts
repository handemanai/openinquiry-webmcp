// SPDX-License-Identifier: Apache-2.0

import {
  DEFAULT_JOURNAL_GUIDELINE_ID,
  findJournalGuideline,
  type JournalGuidelineId,
} from "@/src/lib/demo/journal-guidelines-catalog";
import {
  GUIDELINES_DEMO_RESOURCE_ID,
  type PublicGuidelinesReaderView,
} from "@/src/lib/demo/guidelines-reader-contract";
export const GUIDELINES_READER_ENDPOINT = "/api/openinquiry/demo-reader" as const;
export async function getPublicGuidelinesReaderView(
  signal?: AbortSignal,
  resourceId: JournalGuidelineId = DEFAULT_JOURNAL_GUIDELINE_ID,
): Promise<PublicGuidelinesReaderView> {
  const endpoint = resourceId === GUIDELINES_DEMO_RESOURCE_ID
    ? GUIDELINES_READER_ENDPOINT
    : `${GUIDELINES_READER_ENDPOINT}?resourceId=${encodeURIComponent(resourceId)}`;
  const response = await globalThis.fetch(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "same-origin",
    ...(signal ? { signal } : {}),
  });

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    value = undefined;
  }
  if (!response.ok || !isRecord(value)) {
    throw new Error("The journal reader view could not be refreshed.");
  }
  const reader = parsePublicGuidelinesReaderView(value.reader);
  if (!reader) throw new Error("The journal returned an invalid reader view.");
  return reader;
}

export function parsePublicGuidelinesReaderView(
  value: unknown,
): PublicGuidelinesReaderView | null {
  if (!isRecord(value)) return null;
  const guideline = typeof value.resourceId === "string"
    ? findJournalGuideline(value.resourceId)
    : undefined;
  if (!guideline
    || typeof value.title !== "string"
    || !isStringArray(value.authors)
    || typeof value.abstract !== "string"
    || typeof value.updated !== "string"
    || !isRecord(value.access)
    || (value.access.state !== "entitled" && value.access.state !== "not_entitled")
    || typeof value.access.basisLabel !== "string"
    || (value.readerView !== "full_guideline" && value.readerView !== "public_preview")
    || !Array.isArray(value.sections)
  ) {
    return null;
  }

  const sections = value.sections.map((section) => {
    if (!isRecord(section)
      || typeof section.id !== "string"
      || typeof section.heading !== "string"
      || (section.text !== undefined && typeof section.text !== "string")
    ) {
      return null;
    }
    return Object.freeze({
      id: section.id,
      heading: section.heading,
      ...(section.text ? { text: section.text } : {}),
    });
  });
  if (sections.some((section) => section === null)) return null;
  const entitled = value.access.state === "entitled";
  if ((entitled && value.readerView !== "full_guideline")
    || (!entitled && value.readerView !== "public_preview")
    || sections.some((section) => entitled ? !section?.text : section?.text !== undefined)
  ) {
    return null;
  }

  return Object.freeze({
    resourceId: guideline.id,
    title: value.title,
    authors: Object.freeze([...value.authors]),
    abstract: value.abstract,
    updated: value.updated,
    access: Object.freeze({
      state: value.access.state,
      basisLabel: value.access.basisLabel,
    }),
    readerView: value.readerView,
    sections: Object.freeze(sections as PublicGuidelinesReaderView["sections"]),
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

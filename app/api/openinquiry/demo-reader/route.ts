// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from "next/server";

import { projectGuidelinesReaderView } from "@/src/lib/demo/guidelines-reader";
import {
  DEFAULT_JOURNAL_GUIDELINE_ID,
  findJournalGuideline,
} from "@/src/lib/demo/journal-guidelines-catalog";
import { demoProviderPersonaForScenario } from "@/src/lib/demo/scenario";
import {
  demoScenarioForSession,
  getDemoSessionCodec,
} from "@/src/lib/session";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
} as const;

/**
 * Returns the journal's human presentation from the signed provider session.
 * This is deliberately independent of the narrower content grant returned by
 * knowledge_retrieve().
 */
export async function GET(request: Request) {
  try {
    const requestedResourceId = new URL(request.url).searchParams.get("resourceId")
      ?? DEFAULT_JOURNAL_GUIDELINE_ID;
    const guideline = findJournalGuideline(requestedResourceId);
    if (!guideline) {
      return NextResponse.json(
        {
          error: {
            code: "GUIDELINE_NOT_FOUND",
            message: "The requested fictional guideline is unavailable.",
          },
        },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    const session = getDemoSessionCodec().readCookieHeader(request.headers.get("cookie"));
    const persona = session
      ? demoProviderPersonaForScenario(demoScenarioForSession(session), "journal")
      : "guest";
    return NextResponse.json(
      { reader: projectGuidelinesReaderView(persona, guideline.id) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DEMO_READER_UNAVAILABLE",
          message: "The fictional journal reader view is unavailable.",
        },
      },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

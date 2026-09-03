// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from "next/server";

import {
  DEMO_SESSION_COOKIE_NAME,
  demoScenarioForSession,
  demoSessionCookieOptions,
  getDemoSessionCodec,
  type DemoSession,
} from "@/src/lib/session";
import {
  configuredApplicationOrigin,
  requestHasTrustedOrigin,
} from "@/src/lib/application";
import {
  SESSION_SELECTOR_JSON_MAX_BYTES,
  readBoundedJson,
  type BoundedJsonFailure,
} from "@/src/lib/http";
import type { PersonaKey } from "@/src/data";
import { isDemoScenarioId, type DemoScenarioId } from "@/src/lib/demo/scenario";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
} as const;

function publicSession(session: DemoSession | null) {
  if (!session) {
    return {
      active: false,
      mode: "fictional_demo_session",
      simulated: true,
      productionIdentity: false,
    } as const;
  }
  const scenario = demoScenarioForSession(session);
  const providers = {
    journal: {
      signedIn: scenario.providers.journal.signedIn,
      proposedAgentCredentialRecognition:
        scenario.providers.journal.proposedAgentCredentialRecognition,
    },
  };
  return {
    active: true,
    mode: "fictional_demo_session",
    persona: session.persona,
    scenarioId: scenario.id,
    simulated: session.simulated,
    productionIdentity: session.productionIdentity,
    credentialModel: scenario.credentialModel,
    providers,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  } as const;
}

function isPersona(value: unknown): value is PersonaKey {
  return value === "guest" || value === "subscriber";
}

type SessionSelection =
  | Readonly<{ persona: PersonaKey }>
  | Readonly<{ scenarioId: DemoScenarioId }>;

function sessionSelection(value: unknown): SessionSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1) return null;
  const body = value as Record<string, unknown>;
  if (keys[0] === "persona" && isPersona(body.persona)) {
    return { persona: body.persona };
  }
  if (keys[0] === "scenarioId" && isDemoScenarioId(body.scenarioId)) {
    return { scenarioId: body.scenarioId };
  }
  return null;
}

function invalidJsonResponse(failure: BoundedJsonFailure) {
  if (failure === "unsupported_media_type") {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "The demo session request must use application/json." } },
      { status: 415, headers: NO_STORE_HEADERS },
    );
  }
  if (failure === "too_large") {
    return NextResponse.json(
      { error: { code: "REQUEST_TOO_LARGE", message: "The demo session request body is too large." } },
      { status: 413, headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json(
    { error: { code: "INVALID_JSON", message: "The demo session request must contain valid JSON." } },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

export async function GET(request: Request) {
  try {
    const session = getDemoSessionCodec().readCookieHeader(request.headers.get("cookie"));
    return NextResponse.json(
      { session: publicSession(session) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        session: publicSession(null),
        error: {
          code: "DEMO_SESSION_UNAVAILABLE",
          message: "The fictional demo session service is unavailable.",
        },
      },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

/**
 * Selects one fictional fixture and replaces the signed HttpOnly cookie with
 * a fresh opaque session ID. DELETE below restores the no-session baseline.
 */
export async function POST(request: Request) {
  let applicationOrigin: URL;
  try {
    applicationOrigin = configuredApplicationOrigin();
  } catch {
    return NextResponse.json(
      { error: { code: "DEMO_SESSION_UNAVAILABLE", message: "The fictional demo session service is unavailable." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!requestHasTrustedOrigin(request, applicationOrigin)) {
    return NextResponse.json(
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "The demo session can only be changed from the trusted OpenInquiry origin." } },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = await readBoundedJson(request, SESSION_SELECTOR_JSON_MAX_BYTES);
  if (!parsed.ok) return invalidJsonResponse(parsed.failure);
  const selection = sessionSelection(parsed.value);

  if (!selection) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SESSION_REQUEST",
          message: "Choose a valid demonstration access state.",
        },
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const codec = getDemoSessionCodec();
    const issued = "persona" in selection
      ? codec.issue(selection.persona)
      : codec.issueScenario(selection.scenarioId);
    const response = NextResponse.json(
      { session: publicSession(issued.session) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
    response.cookies.set(
      DEMO_SESSION_COOKIE_NAME,
      issued.token,
      demoSessionCookieOptions(applicationOrigin),
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "DEMO_SESSION_UNAVAILABLE", message: "The fictional demo session service is unavailable." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

/**
 * Restores the documented no-session demo baseline. The signed cookie is
 * removed at the same trusted-origin mutation boundary as persona selection.
 */
export async function DELETE(request: Request) {
  let applicationOrigin: URL;
  try {
    applicationOrigin = configuredApplicationOrigin();
  } catch {
    return NextResponse.json(
      { error: { code: "DEMO_SESSION_UNAVAILABLE", message: "The fictional demo session service is unavailable." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!requestHasTrustedOrigin(request, applicationOrigin)) {
    return NextResponse.json(
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "The demo session can only be changed from the trusted OpenInquiry origin." } },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = NextResponse.json(
      { session: publicSession(null) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
    response.cookies.set(DEMO_SESSION_COOKIE_NAME, "", {
      ...demoSessionCookieOptions(applicationOrigin),
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "DEMO_SESSION_UNAVAILABLE", message: "The fictional demo session service is unavailable." } },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}

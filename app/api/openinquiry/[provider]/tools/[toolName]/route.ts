// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from "next/server";

import {
  configuredApplicationOrigin,
  createOpenInquiryApplication,
  isKnowledgeToolName,
  providerConfigFor,
  requestHasTrustedOrigin,
} from "@/src/lib/application";
import {
  PROVIDER_TOOL_JSON_MAX_BYTES,
  readBoundedJson,
  type BoundedJsonFailure,
} from "@/src/lib/http";
import type { KnowledgeResponse } from "@/src/lib/profile";
import {
  DEMO_SESSION_COOKIE_NAME,
  createDemoRetrievalBudget,
  demoSessionCookieOptions,
  getDemoSessionCodec,
  type DemoSession,
} from "@/src/lib/session";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Pragma: "no-cache",
} as const;

interface RouteContext {
  params: Promise<{ provider: string; toolName: string }>;
}

function routeNotFound() {
  return NextResponse.json(
    {
      error: {
        code: "OPENINQUIRY_ROUTE_NOT_FOUND",
        message: "No allowlisted OpenInquiry provider tool exists at this route.",
      },
    },
    { status: 404, headers: NO_STORE_HEADERS },
  );
}

function boundaryError(
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: NO_STORE_HEADERS },
  );
}

function invalidJsonResponse(failure: BoundedJsonFailure) {
  if (failure === "unsupported_media_type") {
    return boundaryError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Provider tool requests must use application/json.",
    );
  }
  if (failure === "too_large") {
    return boundaryError(413, "REQUEST_TOO_LARGE", "The provider tool request body is too large.");
  }
  return boundaryError(400, "INVALID_JSON", "The provider tool request must contain valid JSON.");
}

/**
 * Route-compatible server boundary for the later client WebMCP adapter. The
 * provider and operation come only from allowlisted path segments; the body is
 * the published tool input itself and cannot contain trusted session facts.
 */
export async function POST(request: Request, context: RouteContext) {
  const { provider, toolName } = await context.params;
  const providerConfig = providerConfigFor(provider);
  if (!providerConfig || !isKnowledgeToolName(toolName)) {
    return routeNotFound();
  }
  let applicationOrigin: URL;
  try {
    applicationOrigin = configuredApplicationOrigin();
  } catch {
    return boundaryError(
      503,
      "OPENINQUIRY_UNAVAILABLE",
      "The fictional provider boundary is unavailable.",
    );
  }
  if (!requestHasTrustedOrigin(request, applicationOrigin)) {
    return boundaryError(
      403,
      "ORIGIN_NOT_ALLOWED",
      "Provider tools can only be called from the trusted OpenInquiry origin.",
    );
  }

  let session: DemoSession;
  let sessionToken: string | null = null;
  let codec: ReturnType<typeof getDemoSessionCodec>;
  try {
    codec = getDemoSessionCodec();
    const existing = codec.readCookieHeader(request.headers.get("cookie"));
    if (existing) {
      session = existing;
    } else {
      const issued = codec.issue("guest");
      session = issued.session;
      sessionToken = issued.token;
    }
  } catch {
    return boundaryError(
      503,
      "OPENINQUIRY_UNAVAILABLE",
      "The fictional provider boundary is unavailable.",
    );
  }
  const parsed = await readBoundedJson(request, PROVIDER_TOOL_JSON_MAX_BYTES);
  if (!parsed.ok) return invalidJsonResponse(parsed.failure);

  let response: KnowledgeResponse;
  try {
    const budget = createDemoRetrievalBudget();
    budget.hydrateSession(session.sessionId, session.expiresAt, session.retrievalLedger);
    const application = createOpenInquiryApplication({ applicationOrigin, budget });
    response = await application.execute({
      providerRoute: providerConfig.routeKey,
      toolName,
      input: parsed.value,
      session,
      signal: request.signal,
    });
    if (toolName === "knowledge_retrieve") {
      sessionToken = codec.refresh(
        session,
        budget.snapshotSession(session.sessionId),
      ).token;
    }
  } catch {
    return boundaryError(
      503,
      "OPENINQUIRY_UNAVAILABLE",
      "The fictional provider boundary is unavailable.",
    );
  }
  const routeResponse = NextResponse.json(response, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
  if (sessionToken) {
    routeResponse.cookies.set(
      DEMO_SESSION_COOKIE_NAME,
      sessionToken,
      demoSessionCookieOptions(applicationOrigin),
    );
  }
  return routeResponse;
}

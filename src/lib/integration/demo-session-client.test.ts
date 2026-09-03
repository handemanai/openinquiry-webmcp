// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  PROPOSED_AGENT_CREDENTIAL_MODEL,
  type DemoScenarioId,
} from "@/src/lib/demo/scenario";
import { SESSION_SELECTOR_JSON_MAX_BYTES } from "@/src/lib/http";
import {
  parsePublicDemoSession,
  selectPublicDemoScenario,
  type DemoSessionFetch,
} from "./demo-session-client";

const SCENARIO_SESSION = {
  session: {
    active: true,
    mode: "fictional_demo_session",
    persona: "subscriber",
    scenarioId: "s3",
    simulated: true,
    productionIdentity: false,
    credentialModel: PROPOSED_AGENT_CREDENTIAL_MODEL,
    providers: {
      journal: {
        signedIn: true,
        proposedAgentCredentialRecognition: "recognized",
      },
    },
    issuedAt: "2026-09-02T12:00:00.000Z",
    expiresAt: "2026-09-02T20:00:00.000Z",
  },
} as const;

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("public simulated scenario client", () => {
  it("posts only the compact allowlisted scenario ID", async () => {
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetch: DemoSessionFetch = async (input, init) => {
      requests.push({ input, init });
      return jsonResponse(SCENARIO_SESSION);
    };
    const session = await selectPublicDemoScenario("s3", fetch);
    const requestBody = String(requests[0]?.init?.body);
    expect(session).toMatchObject({ active: true, scenarioId: "s3" });
    expect(JSON.parse(requestBody)).toEqual({ scenarioId: "s3" });
    expect(new TextEncoder().encode(requestBody).byteLength)
      .toBeLessThan(SESSION_SELECTOR_JSON_MAX_BYTES);
    expect(requestBody).not.toMatch(/providers|signedIn|assurance|entitlement/u);
  });

  it("rejects an invalid scenario before dispatch", async () => {
    let dispatched = false;
    const fetch: DemoSessionFetch = async () => {
      dispatched = true;
      return jsonResponse(SCENARIO_SESSION);
    };
    await expect(selectPublicDemoScenario("s4" as DemoScenarioId, fetch))
      .rejects.toThrow("valid simulated publisher scenario");
    expect(dispatched).toBe(false);
  });

  it("validates public state against the signed scenario", () => {
    expect(parsePublicDemoSession(SCENARIO_SESSION.session)).toEqual(SCENARIO_SESSION.session);
    expect(parsePublicDemoSession({
      ...SCENARIO_SESSION.session,
      providers: {
        journal: {
          signedIn: false,
          proposedAgentCredentialRecognition: "recognized",
        },
      },
    })).toBeNull();
  });

  it("rejects authority-bearing public responses", () => {
    for (const forbidden of [
      { sessionId: "server-session" },
      { entitlementKeys: ["journal_full_article_access"] },
      { token: "signed-token" },
      { credentials: { secret: true } },
    ]) {
      expect(parsePublicDemoSession({ ...SCENARIO_SESSION.session, ...forbidden })).toBeNull();
    }
  });
});

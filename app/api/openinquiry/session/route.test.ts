// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { PROPOSED_AGENT_CREDENTIAL_MODEL } from "@/src/lib/demo/scenario";
import { readDemoSessionFromCookieHeader } from "@/src/lib/session";
import { GET, POST } from "./route";

const ORIGIN = "http://localhost:3000";
const URL = `${ORIGIN}/api/openinquiry/session`;

function post(body: unknown) {
  return POST(new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  }));
}

function cookiePair(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("Expected a signed demo cookie.");
  return value.split(";", 1)[0] ?? "";
}

describe("journal scenario session route", () => {
  it("stores only a compact scenario selector and returns a safe public view", async () => {
    const response = await post({ scenarioId: "s3" });
    const body = await response.json();
    const cookie = cookiePair(response);
    const serverSession = readDemoSessionFromCookieHeader(cookie);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/u);
    expect(body).toEqual({
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
        issuedAt: expect.any(String),
        expiresAt: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/entitlementKeys|sessionId|accessToken|credentialToken/u);
    expect(serverSession?.entitlementKeys).toEqual(["journal_full_article_access"]);

    const getResponse = await GET(new Request(URL, { headers: { cookie } }));
    await expect(getResponse.json()).resolves.toEqual(body);
  });

  it.each([
    ["guest", "s0", false],
    ["subscriber", "s1", true],
  ] as const)("supports the %s display persona", async (persona, scenarioId, signedIn) => {
    const response = await post({ persona });
    const body = await response.json();
    expect(body.session).toMatchObject({
      persona,
      scenarioId,
      providers: {
        journal: {
          signedIn,
          proposedAgentCredentialRecognition: "not_recognized",
        },
      },
    });
  });

  it("rejects unknown selectors and client-supplied state", async () => {
    for (const body of [
      { scenarioId: "s4" },
      { scenarioId: "s1", providers: {} },
      { providers: { journal: { signedIn: true } } },
    ]) {
      const response = await post(body);
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "INVALID_SESSION_REQUEST" },
      });
    }
  });
});

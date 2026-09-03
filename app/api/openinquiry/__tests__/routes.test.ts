// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { POST as changeSession } from "../session/route";
import { POST as executeTool } from "../[provider]/tools/[toolName]/route";

const ORIGIN = "http://localhost:3000";
const SESSION_URL = `${ORIGIN}/api/openinquiry/session`;
const TOOL_ROOT = `${ORIGIN}/api/openinquiry/journal/tools`;
const HEADERS = { "content-type": "application/json", origin: ORIGIN } as const;
const RESOURCE_ID = "journal-guideline-2026-041";

function context(toolName: string, provider = "journal") {
  return { params: Promise.resolve({ provider, toolName }) };
}

async function issueScenario(scenarioId: "s0" | "s1" | "s2" | "s3") {
  const response = await changeSession(new Request(SESSION_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ scenarioId }),
  }));
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected a signed session cookie.");
  return setCookie.split(";", 1)[0] ?? "";
}

async function call(
  toolName: string,
  body: unknown,
  cookie?: string,
  origin = ORIGIN,
) {
  return executeTool(new Request(`${TOOL_ROOT}/${toolName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  }), context(toolName));
}

function cookiePair(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("Expected a signed session cookie.");
  return value.split(";", 1)[0] ?? "";
}

describe("journal HTTP boundary", () => {
  it("bootstraps profile discovery without a pre-known version", async () => {
    const response = await call("knowledge_describe", {});
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      profile: {
        name: "openinquiry.publisher-knowledge-access",
        version: "0.1",
        schemaUrl: `${ORIGIN}/openinquiry/profile/0.1/schema`,
        supportedVersions: ["0.1"],
      },
    });
  });

  it("returns journal-native identity and IDs", async () => {
    const response = await call("knowledge_search", {
      profileVersion: "0.1",
      query: "physical activity aerobic strength",
      contentTypes: ["guideline"],
      limit: 6,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      provider: { id: "journal-of-guidelines", name: "The Journal of Guidelines" },
      resources: [{ id: RESOURCE_ID }],
      receipt: { providerId: "journal-of-guidelines", toolName: "knowledge_search" },
    });
  });

  it("accepts a provider-issued search locator unchanged in knowledge_open", async () => {
    const search = await call("knowledge_search", {
      profileVersion: "0.1",
      query: "physical activity aerobic strength",
      contentTypes: ["guideline"],
      limit: 1,
    });
    const searchBody = await search.json();
    const resource = searchBody.resources?.[0] as {
      id?: string;
      locator?: Record<string, unknown>;
    } | undefined;

    expect(resource).toMatchObject({
      id: RESOURCE_ID,
      locator: {
        sectionId: "weekly-activity-recommendation",
        sectionTitle: "Recommendations for adults",
      },
    });

    const opened = await call("knowledge_open", {
      profileVersion: "0.1",
      resourceId: resource?.id,
      locator: resource?.locator,
    });
    expect(opened.status).toBe(200);
    await expect(opened.json()).resolves.toMatchObject({
      status: "ok",
      grants: [{ representation: "link_only", resourceId: RESOURCE_ID }],
      actions: [{
        type: "deep_link",
        url: `${ORIGIN}/demo/article/${RESOURCE_ID}#weekly-activity-recommendation`,
      }],
    });
  });

  it("changes permitted evidence from server-signed state, not request fields", async () => {
    const cookie = await issueScenario("s3");
    const response = await call("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: "physical activity aerobic strength training",
      requestedRepresentation: "full_text",
    }, cookie);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      access: { state: "entitled", basis: "institutional_license" },
      rights: { decision: "allow_with_limits" },
    });
    expect(body.grants.map(({ representation }: { representation: string }) => representation))
      .toEqual(["full_text"]);
    expect(body.grants[0].content).toContain("two or more days each week");
  });

  it("carries the retrieval budget in the rotated signed session", async () => {
    const cookie = await issueScenario("s3");
    const focusedQuery = "physical activity aerobic strength training";
    const retrieval = await call("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery,
      requestedRepresentation: "full_text",
    }, cookie);
    const retrievalBody = await retrieval.json();
    const rotatedCookie = cookiePair(retrieval);
    const token = rotatedCookie.slice(rotatedCookie.indexOf("=") + 1);
    const encodedPayload = token.split(".", 1)[0] ?? "";
    const decodedPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const signedState = JSON.parse(decodedPayload);
    const repeated = await call("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery,
      requestedRepresentation: "full_text",
    }, rotatedCookie);
    const repeatedBody = await repeated.json();

    expect(retrievalBody.status).toBe("ok");
    expect(rotatedCookie).not.toBe(cookie);
    expect(signedState.retrievalLedger).toEqual({
      version: 1,
      entries: [{
        providerId: "journal-of-guidelines",
        resourceId: RESOURCE_ID,
        characters: expect.any(Number),
        unitIds: [expect.stringMatching(
          /^weekly-activity-recommendation:full_text:[a-f0-9]{16}$/u,
        )],
      }],
    });
    expect(repeatedBody).toMatchObject({ status: "ok" });
    expect(repeatedBody.grants[0].content).toBe(retrievalBody.grants[0].content);
    expect(decodedPayload).not.toContain(focusedQuery);
    expect(decodedPayload).not.toContain("Adults should aim for");
  });

  it("defaults to the public preview without a session", async () => {
    const response = await call("knowledge_access", { profileVersion: "0.1" });
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      access: { state: "limited", basis: "public_web" },
    });
  });

  it("rejects forged origins and unknown provider routes", async () => {
    const forged = await call(
      "knowledge_access",
      { profileVersion: "0.1" },
      undefined,
      "https://attacker.example",
    );
    expect(forged.status).toBe(403);
    await expect(forged.json()).resolves.toMatchObject({
      error: { code: "ORIGIN_NOT_ALLOWED" },
    });

    const unknown = await executeTool(new Request(`${TOOL_ROOT}/knowledge_access`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ profileVersion: "0.1" }),
    }), context("knowledge_access", "unknown"));
    expect(unknown.status).toBe(404);
  });

  it("rejects authority-bearing input before it reaches policy", async () => {
    const response = await call("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      requestedRepresentation: "quotation",
      entitlement: "full",
    });
    const body = await response.json();
    expect(body).toMatchObject({ status: "error" });
    expect(body.grants).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("full");
  });

  it("returns precise, privacy-minimized input errors", async () => {
    const malformed = await call("knowledge_search", { profileVersion: "0.1" });
    await expect(malformed.json()).resolves.toMatchObject({
      status: "error",
      error: { code: "INVALID_REQUEST", field: "query", retryable: true },
    });

    const oversized = await call("knowledge_search", {
      profileVersion: "0.1",
      query: `PRIVATE-${"x".repeat(301)}`,
    });
    const oversizedBody = await oversized.json();
    expect(oversizedBody).toMatchObject({
      status: "error",
      error: { code: "REQUEST_TOO_LARGE", field: "query", retryable: true },
    });
    expect(JSON.stringify(oversizedBody)).not.toContain("PRIVATE-");

    const unfocused = await call("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      requestedRepresentation: "quotation",
    });
    await expect(unfocused.json()).resolves.toMatchObject({
      status: "error",
      error: { code: "INVALID_REQUEST", field: "focusedQuery", retryable: true },
    });
  });
});

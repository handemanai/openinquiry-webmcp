// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { createDemoSessionCodec, createDemoRetrievalBudget } from "../../session";
import { validateKnowledgeResponse, type KnowledgeToolName } from "../../profile";
import { createOpenInquiryApplication } from "../knowledge-service";
import type { DemoScenarioId } from "../../demo/scenario";

const ORIGIN = new URL("https://openinquiry.test");
const RESOURCE_ID = "journal-guideline-2026-041";
const FOCUSED_QUERY =
  "How much physical activity should an adult aim for each week? Include aerobic activity and strength training.";

function session(scenarioId: DemoScenarioId, id = `session_${scenarioId}_123456`) {
  return createDemoSessionCodec({
    secret: "test-secret-with-at-least-thirty-two-bytes",
    now: () => new Date("2026-09-02T18:00:00Z"),
    createSessionId: () => id,
  }).issueScenario(scenarioId).session;
}

function application() {
  let receipt = 0;
  return createOpenInquiryApplication({
    applicationOrigin: ORIGIN,
    budget: createDemoRetrievalBudget({
      now: () => new Date("2026-09-02T18:00:00Z"),
      perResourceCharacters: 5000,
      perProviderCharacters: 10000,
    }),
    now: () => new Date("2026-09-02T18:00:00Z"),
    createReceiptId: () => `oi_test_${++receipt}`,
  });
}

async function execute(
  toolName: KnowledgeToolName,
  input: Record<string, unknown>,
  scenarioId: DemoScenarioId = "s1",
) {
  return application().execute({
    providerRoute: "journal",
    toolName,
    input,
    session: session(scenarioId),
  });
}

function grantContent(response: Awaited<ReturnType<typeof execute>>, representation: string) {
  return response.grants?.find((grant) => grant.representation === representation)?.content;
}

describe("single-journal knowledge service", () => {
  it("returns conforming responses for all seven page tools", async () => {
    const requests: ReadonlyArray<[KnowledgeToolName, Record<string, unknown>]> = [
      ["knowledge_describe", {}],
      ["knowledge_access", { profileVersion: "0.1" }],
      ["knowledge_search", { profileVersion: "0.1", query: "physical activity aerobic strength" }],
      ["knowledge_retrieve", {
        profileVersion: "0.1",
        resourceId: RESOURCE_ID,
        focusedQuery: FOCUSED_QUERY,
        requestedRepresentation: "quotation",
        maxCharacters: 1200,
      }],
      ["knowledge_resolve", { profileVersion: "0.1", resourceId: RESOURCE_ID }],
      ["knowledge_open", {
        profileVersion: "0.1",
        resourceId: RESOURCE_ID,
        locator: { sectionId: "weekly-activity-recommendation" },
      }],
      ["knowledge_status", { profileVersion: "0.1", resourceIds: [RESOURCE_ID] }],
    ];

    for (const [toolName, input] of requests) {
      const response = await execute(toolName, input, "s3");
      expect(validateKnowledgeResponse(response), toolName).toEqual([]);
      expect(response.provider).toMatchObject({
        id: "journal-of-guidelines",
        name: "The Journal of Guidelines",
        role: "publisher",
      });
      expect(response.receipt.toolName).toBe(toolName);
    }
  });

  it("returns only the relevant guideline for the long physical-activity question", async () => {
    const response = await execute("knowledge_search", {
      profileVersion: "0.1",
      query: FOCUSED_QUERY,
      contentTypes: ["guideline"],
      limit: 6,
    });
    expect(response.resources?.map(({ id }) => id)).toEqual([RESOURCE_ID]);
  });

  it("still supports precise one-word searches", async () => {
    const response = await execute("knowledge_search", {
      profileVersion: "0.1",
      query: "pneumonia",
      limit: 6,
    });
    expect(response.resources?.map(({ id }) => id)).toEqual([
      "journal-guideline-2026-033",
    ]);
  });

  it.each(["rate", "press", "ration"])(
    "does not treat the partial word %s as a topic match",
    async (query) => {
      const response = await execute("knowledge_search", {
        profileVersion: "0.1",
        query,
        limit: 6,
      });
      expect(response).toMatchObject({
        status: "not_found",
        error: { code: "RESOURCE_NOT_FOUND" },
      });
      expect(response.resources).toBeUndefined();
    },
  );

  it.each([
    ["activity", "journal-guideline-2026-041"],
    ["pressure", "journal-guideline-2026-039"],
    ["vaccination", "journal-guideline-2026-029"],
  ])("keeps exact topic search for %s", async (query, resourceId) => {
    const response = await execute("knowledge_search", {
      profileVersion: "0.1",
      query,
      limit: 6,
    });
    expect(response.resources?.map(({ id }) => id)).toEqual([resourceId]);
  });

  it("returns not found rather than irrelevant results", async () => {
    const response = await execute("knowledge_search", {
      profileVersion: "0.1",
      query: "quantum dermatopathology",
    });
    expect(response).toMatchObject({
      status: "not_found",
      error: { code: "RESOURCE_NOT_FOUND" },
    });
  });

  it("distinguishes a semantically broad search from malformed input", async () => {
    const response = await execute("knowledge_search", {
      profileVersion: "0.1",
      query: "the and of",
    });
    expect(response).toMatchObject({
      status: "error",
      error: { code: "QUERY_TOO_BROAD", retryable: true },
    });
  });

  it.each([
    { scenarioId: "s0" as const, representations: ["abstract"] },
    { scenarioId: "s2" as const, representations: ["abstract", "summary"] },
    { scenarioId: "s1" as const, representations: ["quotation"] },
    { scenarioId: "s3" as const, representations: ["full_text"] },
  ])("applies the four-state policy for $scenarioId", async ({ scenarioId, representations }) => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "full_text",
    }, scenarioId);
    expect(response.grants?.map(({ representation }) => representation)).toEqual(representations);
    expect(response.rights?.requestedHandling?.verification).toBe("not_verified_by_webmcp");
    expect(response.rights?.policyId.endsWith("-proposed-agent-assurance-demo"))
      .toBe(scenarioId === "s2" || scenarioId === "s3");
    expect(validateKnowledgeResponse(response)).toEqual([]);
  });

  it("supplies the complete relevant section when entitlement exists but assurance is unrecognized", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "full_text",
    }, "s1");
    expect(grantContent(response, "quotation")).toContain(
      "Adults should aim for 150 to 300 minutes",
    );
    expect(grantContent(response, "quotation")).toContain("two or more days each week");
    expect(grantContent(response, "full_text")).toBeUndefined();
  });

  it("reserves a small response budget for the evidence that was requested", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "quotation",
      maxCharacters: 180,
    }, "s3");
    const quotation = response.grants?.find(
      ({ representation }) => representation === "quotation",
    );

    expect(quotation).toMatchObject({
      resourceId: RESOURCE_ID,
      locator: { sectionId: "weekly-activity-recommendation" },
    });
    expect(quotation?.content).toMatch(/weekly|aerobic|strength|activity/iu);
    expect(response.grants?.reduce(
      (total, item) => total + (item.content?.length ?? 0),
      0,
    )).toBeLessThanOrEqual(180);
  });

  it("does not substitute an arbitrary section for an unrelated focused query", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: "quantum dermatopathology",
      requestedRepresentation: "quotation",
      maxCharacters: 1200,
    }, "s3");

    expect(response).toMatchObject({
      status: "not_found",
      error: { code: "RESOURCE_NOT_FOUND", retryable: false },
    });
    expect(response.grants).toBeUndefined();
  });

  it("labels a requested recommendation as recommendation evidence", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "recommendation",
      maxCharacters: 1200,
    }, "s3");

    expect(response.grants?.some(
      ({ representation }) => representation === "recommendation",
    )).toBe(true);
    expect(response.grants?.some(
      ({ representation }) => representation === "quotation",
    )).toBe(false);
  });

  it("supplies the complete article when entitlement and assurance are both recognized", async () => {
    const request = {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "full_text",
    };
    const unrecognized = await execute("knowledge_retrieve", request, "s1");
    const recognized = await execute("knowledge_retrieve", request, "s3");
    const fullText = grantContent(recognized, "full_text");

    expect(fullText).toContain("Physical Activity for Adults");
    expect(fullText).toContain("Abstract\n");
    expect(fullText).toContain("Recommendations for adults\n");
    expect(fullText).toContain("Adults should aim for 150 to 300 minutes");
    expect(fullText).toContain("two or more days each week");
    expect(fullText!.length).toBeGreaterThan(grantContent(unrecognized, "quotation")!.length);
    expect(recognized.rights?.limits?.maxCharacters).toBeUndefined();
  });

  it("allows an exact full-text retry in the same session", async () => {
    const app = application();
    const request = {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "full_text",
    };
    const demoSession = session("s3", "session_full_text_retry");
    const executeRequest = () => app.execute({
      providerRoute: "journal" as const,
      toolName: "knowledge_retrieve" as const,
      input: request,
      session: demoSession,
    });

    const first = await executeRequest();
    const retry = await executeRequest();
    expect(retry.status).toBe("ok");
    expect(grantContent(retry, "full_text")).toBe(grantContent(first, "full_text"));
  });

  it("opens the exact canonical source section without returning article text", async () => {
    const response = await execute("knowledge_open", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      locator: { sectionId: "weekly-activity-recommendation" },
    }, "s3");
    expect(response.grants).toEqual([expect.objectContaining({
      resourceId: RESOURCE_ID,
      representation: "link_only",
      suppliedByProvider: true,
    })]);
    expect(response.resources?.[0].deepLink).toBe(
      `${ORIGIN.origin}/demo/article/${RESOURCE_ID}#weekly-activity-recommendation`,
    );
  });

  it("keeps source receipts privacy-minimized", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      focusedQuery: FOCUSED_QUERY,
      requestedRepresentation: "quotation",
      maxCharacters: 1200,
    }, "s3");
    const serialized = JSON.stringify(response.receipt).toLowerCase();
    expect(serialized).not.toContain(FOCUSED_QUERY.toLowerCase());
    expect(serialized).not.toMatch(/prompt|query|cookie|token|credential|patient/iu);
    expect(response.receipt).toMatchObject({
      providerId: "journal-of-guidelines",
      toolName: "knowledge_retrieve",
      resourceIds: [RESOURCE_ID],
      retention: "session",
    });
  });

  it("rejects client-supplied entitlement or assurance fields", async () => {
    const response = await execute("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: RESOURCE_ID,
      requestedRepresentation: "quotation",
      entitlement: "full",
      credentialRecognition: "recognized",
    }, "s0");
    expect(response).toMatchObject({
      status: "error",
      error: { code: "INVALID_REQUEST", field: "$" },
    });
    expect(response.grants).toBeUndefined();
  });
});

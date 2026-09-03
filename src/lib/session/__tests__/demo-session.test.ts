// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  DEMO_SESSION_COOKIE_NAME,
  createDemoRetrievalBudget,
  createDemoSessionCodec,
  demoSessionCookieOptions,
  readCookieValue,
} from "../index";

const TEST_SECRET = "openinquiry-test-secret-with-at-least-thirty-two-bytes";

describe("fictional demo session", () => {
  it("issues a signed opaque selector and derives entitlements only from server fixtures", () => {
    const codec = createDemoSessionCodec({
      secret: TEST_SECRET,
      now: () => new Date("2026-08-26T12:00:00.000Z"),
      createSessionId: () => "session_subscriber_0001",
    });
    const issued = codec.issue("subscriber");
    const payloadText = Buffer.from(issued.token.split(".")[0] ?? "", "base64url").toString("utf8");

    expect(payloadText).toContain('"scenarioId":"s1"');
    expect(payloadText).not.toContain('"persona"');
    expect(payloadText).not.toContain("journal_full_article_access");
    expect(codec.verify(issued.token)).toMatchObject({
      sessionId: "session_subscriber_0001",
      persona: "subscriber",
      scenarioId: "s1",
      simulated: true,
      productionIdentity: false,
    });
    expect(codec.verify(issued.token)?.entitlementKeys).toContain("journal_full_article_access");
  });

  it("derives access from the signed scenario without treating assurance as entitlement", () => {
    const codec = createDemoSessionCodec({
      secret: TEST_SECRET,
      now: () => new Date("2026-08-26T12:00:00.000Z"),
      createSessionId: () => "session_mixed_0001",
    });
    const session = codec.issueScenario("s2").session;

    expect(session.scenario?.providers).toEqual({
      journal: {
        signedIn: false,
        proposedAgentCredentialRecognition: "recognized",
      },
    });
    expect(session.entitlementKeys).toEqual([]);
  });

  it("rejects persona tampering, malformed cookies, and expired tokens", () => {
    let clock = new Date("2026-08-26T12:00:00.000Z");
    const codec = createDemoSessionCodec({
      secret: TEST_SECRET,
      now: () => clock,
      createSessionId: () => "session_guest_0001",
      maxAgeSeconds: 60,
    });
    const issued = codec.issue("guest");
    const [payload, tokenSignature] = issued.token.split(".");
    const decoded = Buffer.from(payload ?? "", "base64url").toString("utf8");
    const tamperedPayload = Buffer.from(decoded.replace('"s0"', '"s1"'), "utf8")
      .toString("base64url");

    expect(codec.verify(`${tamperedPayload}.${tokenSignature}`)).toBeNull();
    expect(codec.verify("not-a-session")).toBeNull();
    clock = new Date("2026-08-26T12:01:01.000Z");
    expect(codec.verify(issued.token)).toBeNull();
  });

  it("reads only the named cookie and exposes the required browser controls", () => {
    expect(readCookieValue("other=1; openinquiry_demo_session=abc.def", DEMO_SESSION_COOKIE_NAME))
      .toBe("abc.def");
    expect(demoSessionCookieOptions(new URL("https://openinquiry.test"))).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 28_800,
    });
    expect(demoSessionCookieOptions(new URL("http://localhost:3000")).secure).toBe(false);
  });
});

describe("deterministic retrieval budget", () => {
  it("allows exact replays but blocks cumulative reconstruction without storing text", () => {
    const budget = createDemoRetrievalBudget({
      perResourceCharacters: 120,
      perProviderCharacters: 200,
      maxDistinctUnitsPerResource: 3,
    });
    const common = {
      sessionId: "session-a",
      sessionExpiresAt: "2100-01-01T00:00:00.000Z",
      providerId: "journal",
      resourceId: "article-a",
    };
    const first = budget.checkAndRecord({
      ...common,
      unitId: "section-a",
      content: "alpha beta gamma delta epsilon zeta eta theta",
    });
    const replay = budget.checkAndRecord({
      ...common,
      unitId: "section-a",
      content: "alpha beta gamma delta epsilon zeta eta theta",
    });
    const cumulative = budget.checkAndRecord({
      ...common,
      unitId: "section-b",
      content: "one two three four five six seven eight nine ten ".repeat(2),
    });

    expect(first.allowed).toBe(true);
    expect(replay).toMatchObject({ allowed: true, replayed: true });
    expect(cumulative).toMatchObject({ allowed: false, reason: "resource_budget" });
  });

  it("honors a narrower provider-policy ceiling for one signed session", () => {
    const budget = createDemoRetrievalBudget();
    const common = {
      sessionId: "session-policy-limited",
      sessionExpiresAt: "2100-01-01T00:00:00.000Z",
      providerId: "journal-guidelines",
      resourceId: "guideline-a",
      resourceCharacterLimit: 360,
      resourceUnitLimit: 1,
    };

    expect(budget.checkAndRecord({
      ...common,
      unitId: "section-a",
      content: "First question-matched protected passage.",
    }).allowed).toBe(true);
    expect(budget.checkAndRecord({
      ...common,
      unitId: "section-b",
      content: "A different protected passage from elsewhere in the publication.",
    })).toMatchObject({ allowed: false, reason: "unit_budget" });
  });

  it("expires records at the signed session boundary using an injectable clock", () => {
    let clock = new Date("2026-08-26T12:00:00.000Z");
    const budget = createDemoRetrievalBudget({ now: () => clock });
    const first = {
      sessionId: "session-expiring",
      sessionExpiresAt: "2026-08-26T12:01:00.000Z",
      providerId: "journal",
      resourceId: "article-a",
      unitId: "section-a",
      content: "alpha beta gamma delta epsilon zeta eta theta",
    };

    expect(budget.checkAndRecord(first).allowed).toBe(true);
    expect(budget.checkAndRecord(first)).toMatchObject({ allowed: true, replayed: true });

    clock = new Date("2026-08-26T12:01:01.000Z");
    expect(budget.checkAndRecord({
      ...first,
      sessionExpiresAt: "2026-08-26T12:02:00.000Z",
    }).allowed).toBe(true);
  });

  it("deterministically evicts the earliest tie-broken session at the entry cap", () => {
    const budget = createDemoRetrievalBudget({
      now: () => new Date("2026-08-26T12:00:00.000Z"),
      maxSessionRecords: 2,
    });
    const record = (sessionId: string, content: string) => ({
      sessionId,
      sessionExpiresAt: "2026-08-26T13:00:00.000Z",
      providerId: "journal",
      resourceId: "article-a",
      unitId: `section-${sessionId}`,
      content,
    });
    const sessionA = record("session-a", "alpha beta gamma delta epsilon zeta");

    expect(budget.checkAndRecord(sessionA).allowed).toBe(true);
    expect(budget.checkAndRecord(record(
      "session-b",
      "one two three four five six",
    )).allowed).toBe(true);
    expect(budget.checkAndRecord(record(
      "session-c",
      "red orange yellow green blue indigo",
    )).allowed).toBe(true);

    expect(budget.checkAndRecord(sessionA).allowed).toBe(true);
  });

  it("round-trips source-unit counters through a signed session ledger", () => {
    const sourceBudget = createDemoRetrievalBudget();
    const common = {
      sessionId: "session-ledger",
      sessionExpiresAt: "2100-01-01T00:00:00.000Z",
      providerId: "journal",
      resourceId: "article-a",
      unitId: "section-a",
      content: "A bounded protected passage.",
    };
    expect(sourceBudget.checkAndRecord(common).allowed).toBe(true);
    const ledger = sourceBudget.snapshotSession(common.sessionId);

    const nextRequestBudget = createDemoRetrievalBudget();
    nextRequestBudget.hydrateSession(
      common.sessionId,
      common.sessionExpiresAt,
      ledger,
    );
    expect(nextRequestBudget.checkAndRecord({
      ...common,
      content: common.content,
    })).toMatchObject({ allowed: true, replayed: true });
    expect(JSON.stringify(ledger)).not.toContain(common.content);
  });
});

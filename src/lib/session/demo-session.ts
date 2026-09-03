// SPDX-License-Identifier: Apache-2.0

import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type { PersonaKey } from "../../data/index";
import {
  demoPersonaForScenario,
  demoScenarioForId,
  demoScenarioIdForPersona,
  isDemoScenarioId,
  type DemoScenario,
  type DemoScenarioId,
} from "../demo/scenario";
import {
  EMPTY_DEMO_RETRIEVAL_LEDGER,
  isDemoRetrievalLedger,
  type DemoRetrievalLedger,
} from "./retrieval-budget";

export const DEMO_SESSION_COOKIE_NAME = "openinquiry_demo_session";
export const DEMO_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const COOKIE_VERSION = 2 as const;
const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_COOKIE_TOKEN_BYTES = 3800;
const DEVELOPMENT_SECRET_SYMBOL = Symbol.for(
  "openinquiry.demo-session.development-secret",
);

export interface DemoSession {
  sessionId: string;
  persona: PersonaKey;
  scenarioId: DemoScenarioId;
  scenario: DemoScenario;
  issuedAt: string;
  expiresAt: string;
  simulated: true;
  productionIdentity: false;
  entitlementKeys: readonly string[];
  retrievalLedger: DemoRetrievalLedger;
}

interface DemoSessionPayload {
  version: typeof COOKIE_VERSION;
  sessionId: string;
  scenarioId: DemoScenarioId;
  issuedAtSeconds: number;
  expiresAtSeconds: number;
  retrievalLedger?: DemoRetrievalLedger;
}

export interface DemoSessionCodecOptions {
  secret: string | Uint8Array;
  now?: () => Date;
  createSessionId?: () => string;
  maxAgeSeconds?: number;
}

export interface IssuedDemoSession {
  token: string;
  session: DemoSession;
}

export interface DemoSessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export interface DemoSessionCodec {
  issue(persona: PersonaKey): IssuedDemoSession;
  issueScenario(scenarioId: DemoScenarioId): IssuedDemoSession;
  refresh(session: DemoSession, retrievalLedger: DemoRetrievalLedger): IssuedDemoSession;
  verify(token: string | undefined | null): DemoSession | null;
  readCookieHeader(cookieHeader: string | undefined | null): DemoSession | null;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(secret: string | Uint8Array, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function isPersona(value: unknown): value is PersonaKey {
  return value === "guest" || value === "subscriber";
}

function isPayload(value: unknown): value is DemoSessionPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === COOKIE_VERSION
    && typeof candidate.sessionId === "string"
    && /^[A-Za-z0-9_-]{12,128}$/u.test(candidate.sessionId)
    && isDemoScenarioId(candidate.scenarioId)
    && Number.isInteger(candidate.issuedAtSeconds)
    && Number.isInteger(candidate.expiresAtSeconds)
    && Number(candidate.expiresAtSeconds) > Number(candidate.issuedAtSeconds)
    && (candidate.retrievalLedger === undefined
      || isDemoRetrievalLedger(candidate.retrievalLedger));
}

function entitlementKeysForScenario(scenario: DemoScenario): readonly string[] {
  return scenario.providers.journal.signedIn
    ? Object.freeze(["journal_full_article_access"])
    : Object.freeze([]);
}

function toSession(payload: DemoSessionPayload): DemoSession {
  const scenario = demoScenarioForId(payload.scenarioId);
  if (!scenario) throw new Error("Unknown server-configured demo scenario.");
  return Object.freeze({
    sessionId: payload.sessionId,
    persona: demoPersonaForScenario(scenario),
    scenarioId: scenario.id,
    scenario,
    issuedAt: new Date(payload.issuedAtSeconds * 1000).toISOString(),
    expiresAt: new Date(payload.expiresAtSeconds * 1000).toISOString(),
    simulated: true,
    productionIdentity: false,
    entitlementKeys: entitlementKeysForScenario(scenario),
    retrievalLedger: payload.retrievalLedger ?? EMPTY_DEMO_RETRIEVAL_LEDGER,
  });
}

export function demoScenarioForSession(session: DemoSession): DemoScenario {
  return session.scenario;
}

/**
 * Creates and verifies a signed synthetic session. The cookie carries an
 * allowlisted scenario ID plus a bounded retrieval ledger of source IDs and
 * counters; the server derives access from the scenario and trusts neither
 * value supplied through tool input.
 */
export function createDemoSessionCodec(
  options: DemoSessionCodecOptions,
): DemoSessionCodec {
  const secretBytes = typeof options.secret === "string"
    ? Buffer.byteLength(options.secret, "utf8")
    : options.secret.byteLength;
  if (secretBytes < MINIMUM_SECRET_BYTES) {
    throw new Error("The OpenInquiry demo-session secret must be at least 32 bytes.");
  }

  const now = options.now ?? (() => new Date());
  const createSessionId = options.createSessionId ?? randomUUID;
  const maxAgeSeconds = options.maxAgeSeconds ?? DEMO_SESSION_MAX_AGE_SECONDS;
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 60) {
    throw new Error("The OpenInquiry demo-session lifetime must be at least 60 seconds.");
  }

  function signPayload(payload: DemoSessionPayload): IssuedDemoSession {
    if (!isPayload(payload)) throw new Error("The server produced an invalid demo session.");
    const encodedPayload = encode(JSON.stringify(payload));
    const token = `${encodedPayload}.${signature(options.secret, encodedPayload)}`;
    if (Buffer.byteLength(token, "utf8") > MAXIMUM_COOKIE_TOKEN_BYTES) {
      throw new Error("The demo session exceeded the signed-cookie size limit.");
    }
    return { token, session: toSession(payload) };
  }

  function issueScenario(scenarioId: DemoScenarioId): IssuedDemoSession {
    if (!isDemoScenarioId(scenarioId)) throw new Error("Unknown demo scenario.");
    const issuedAtSeconds = Math.floor(now().getTime() / 1000);
    const payload: DemoSessionPayload = {
      version: COOKIE_VERSION,
      sessionId: createSessionId(),
      scenarioId,
      issuedAtSeconds,
      expiresAtSeconds: issuedAtSeconds + maxAgeSeconds,
    };
    return signPayload(payload);
  }

  function issue(persona: PersonaKey): IssuedDemoSession {
    if (!isPersona(persona)) throw new Error("Unknown demo persona.");
    return issueScenario(demoScenarioIdForPersona(persona));
  }

  function verify(token: string | undefined | null): DemoSession | null {
    if (!token || Buffer.byteLength(token, "utf8") > MAXIMUM_COOKIE_TOKEN_BYTES) return null;
    const [encodedPayload, suppliedSignature, extra] = token.split(".");
    if (!encodedPayload || !suppliedSignature || extra) return null;
    if (!safeEqual(signature(options.secret, encodedPayload), suppliedSignature)) return null;
    try {
      const payload: unknown = JSON.parse(decode(encodedPayload));
      if (!isPayload(payload)) return null;
      const nowSeconds = Math.floor(now().getTime() / 1000);
      if (payload.issuedAtSeconds > nowSeconds + 60 || payload.expiresAtSeconds <= nowSeconds) {
        return null;
      }
      return toSession(payload);
    } catch {
      return null;
    }
  }

  return Object.freeze({
    issue,
    issueScenario,
    refresh(session: DemoSession, retrievalLedger: DemoRetrievalLedger) {
      if (!isDemoRetrievalLedger(retrievalLedger)) {
        throw new Error("The retrieval ledger is invalid.");
      }
      return signPayload({
        version: COOKIE_VERSION,
        sessionId: session.sessionId,
        scenarioId: session.scenarioId,
        issuedAtSeconds: Math.floor(Date.parse(session.issuedAt) / 1000),
        expiresAtSeconds: Math.floor(Date.parse(session.expiresAt) / 1000),
        ...(retrievalLedger.entries.length > 0 ? { retrievalLedger } : {}),
      });
    },
    verify,
    readCookieHeader(cookieHeader: string | undefined | null): DemoSession | null {
      return verify(readCookieValue(cookieHeader, DEMO_SESSION_COOKIE_NAME));
    },
  });
}

export function readCookieValue(
  cookieHeader: string | undefined | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function demoSessionCookieOptions(applicationOrigin: URL): DemoSessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: applicationOrigin.protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
  };
}

let defaultCodec: DemoSessionCodec | undefined;

function configuredSessionSecret(): string | Uint8Array {
  const configured = process.env.OPENINQUIRY_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENINQUIRY_SESSION_SECRET is required in production.");
  }
  const shared = globalThis as typeof globalThis & Record<symbol, unknown>;
  const existing = shared[DEVELOPMENT_SECRET_SYMBOL];
  if (existing instanceof Uint8Array && existing.byteLength >= MINIMUM_SECRET_BYTES) {
    return existing;
  }
  const generated = randomBytes(MINIMUM_SECRET_BYTES);
  shared[DEVELOPMENT_SECRET_SYMBOL] = generated;
  return generated;
}

export function getDemoSessionCodec(): DemoSessionCodec {
  defaultCodec ??= createDemoSessionCodec({ secret: configuredSessionSecret() });
  return defaultCodec;
}

export function readDemoSessionFromCookieHeader(
  cookieHeader: string | undefined | null,
): DemoSession | null {
  return getDemoSessionCodec().readCookieHeader(cookieHeader);
}

export function readDemoSessionToken(
  token: string | undefined | null,
): DemoSession | null {
  return getDemoSessionCodec().verify(token);
}

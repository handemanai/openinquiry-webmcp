// SPDX-License-Identifier: Apache-2.0

import type { PersonaKey } from "@/src/data";
import {
  PROPOSED_AGENT_CREDENTIAL_MODEL,
  demoPersonaForScenario,
  demoScenarioForId,
  isDemoScenarioId,
  type DemoScenarioId,
  type DemoScenarioProviderStates,
} from "@/src/lib/demo/scenario";

export const DEMO_SESSION_ENDPOINT = "/api/openinquiry/session" as const;
export const DEMO_SESSION_CHANGED_EVENT = "openinquiry:demo-session-changed" as const;

export type PublicDemoSession =
  | Readonly<{
      active: false;
      mode: "fictional_demo_session";
      simulated: true;
      productionIdentity: false;
    }>
  | Readonly<{
      active: true;
      mode: "fictional_demo_session";
      persona: PersonaKey;
      scenarioId: DemoScenarioId;
      simulated: true;
      productionIdentity: false;
      credentialModel: typeof PROPOSED_AGENT_CREDENTIAL_MODEL;
      providers: DemoScenarioProviderStates;
      issuedAt: string;
      expiresAt: string;
    }>;

export type DemoSessionFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class DemoSessionRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super("The fictional demo session could not be refreshed.");
    this.name = "DemoSessionRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function getPublicDemoSession(
  fetchImplementation: DemoSessionFetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal,
): Promise<PublicDemoSession> {
  return requestPublicDemoSession(fetchImplementation, {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "same-origin",
    ...(signal ? { signal } : {}),
  });
}

export async function selectPublicDemoPersona(
  persona: PersonaKey,
  fetchImplementation: DemoSessionFetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal,
): Promise<PublicDemoSession> {
  if (persona !== "guest" && persona !== "subscriber") {
    throw new TypeError("Choose the Guest or Subscriber fictional demo persona.");
  }
  return requestPublicDemoSession(fetchImplementation, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "same-origin",
    body: JSON.stringify({ persona }),
    ...(signal ? { signal } : {}),
  });
}

/** Selects an allowlisted display scenario; the server derives access itself. */
export async function selectPublicDemoScenario(
  scenarioId: DemoScenarioId,
  fetchImplementation: DemoSessionFetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal,
): Promise<PublicDemoSession> {
  if (!isDemoScenarioId(scenarioId)) {
    throw new TypeError("Choose a valid simulated publisher scenario.");
  }
  return requestPublicDemoSession(fetchImplementation, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "same-origin",
    body: JSON.stringify({ scenarioId }),
    ...(signal ? { signal } : {}),
  });
}

export async function clearPublicDemoSession(
  fetchImplementation: DemoSessionFetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal,
): Promise<PublicDemoSession> {
  return requestPublicDemoSession(fetchImplementation, {
    method: "DELETE",
    headers: { accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "same-origin",
    ...(signal ? { signal } : {}),
  });
}

export function announceDemoSessionChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEMO_SESSION_CHANGED_EVENT));
  }
}

async function requestPublicDemoSession(
  fetchImplementation: DemoSessionFetch,
  init: RequestInit,
): Promise<PublicDemoSession> {
  const response = await fetchImplementation(DEMO_SESSION_ENDPOINT, init);
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    value = undefined;
  }
  if (!response.ok) {
    const code = isRecord(value) && isRecord(value.error)
      && typeof value.error.code === "string"
      ? value.error.code
      : "DEMO_SESSION_UNAVAILABLE";
    throw new DemoSessionRequestError(code, response.status);
  }
  const session = isRecord(value) ? parsePublicDemoSession(value.session) : null;
  if (!session) throw new DemoSessionRequestError("INVALID_SESSION_RESPONSE", response.status);
  return session;
}

export function parsePublicDemoSession(value: unknown): PublicDemoSession | null {
  if (!isRecord(value)
    || value.mode !== "fictional_demo_session"
    || value.simulated !== true
    || value.productionIdentity !== false
    || typeof value.active !== "boolean") return null;

  const forbidden = [
    "entitlement", "entitlements", "entitlementKeys", "sessionId", "cookie",
    "token", "accessToken", "authorization", "credential", "credentials", "receipt",
  ];
  if (forbidden.some((key) => key in value)) return null;
  if (!value.active) {
    return Object.freeze({
      active: false,
      mode: "fictional_demo_session",
      simulated: true,
      productionIdentity: false,
    });
  }

  if (!isDemoScenarioId(value.scenarioId)
    || !isIsoDate(value.issuedAt)
    || !isIsoDate(value.expiresAt)
    || Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)
    || value.credentialModel !== PROPOSED_AGENT_CREDENTIAL_MODEL) return null;
  const scenario = demoScenarioForId(value.scenarioId);
  if (!scenario
    || (value.persona !== "guest" && value.persona !== "subscriber")
    || value.persona !== demoPersonaForScenario(scenario)
    || !providerStatesMatch(value.providers, scenario.providers)) return null;

  return Object.freeze({
    active: true,
    mode: "fictional_demo_session",
    persona: value.persona,
    scenarioId: scenario.id,
    simulated: true,
    productionIdentity: false,
    credentialModel: scenario.credentialModel,
    providers: scenario.providers,
    issuedAt: value.issuedAt,
    expiresAt: value.expiresAt,
  });
}

function providerStatesMatch(value: unknown, expected: DemoScenarioProviderStates): boolean {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !isRecord(value.journal)) {
    return false;
  }
  const journal = value.journal;
  return Object.keys(journal).length === 2
    && journal.signedIn === expected.journal.signedIn
    && journal.proposedAgentCredentialRecognition
      === expected.journal.proposedAgentCredentialRecognition;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

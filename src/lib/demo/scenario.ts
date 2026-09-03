// SPDX-License-Identifier: Apache-2.0

import type { PersonaKey } from "@/src/data";

export const DEMO_PROVIDER_IDS = ["journal"] as const;
export type DemoProviderId = (typeof DEMO_PROVIDER_IDS)[number];

/**
 * A simulated publisher recognition decision used to demonstrate a proposed
 * policy layer. A recognized credential is still not proof of downstream
 * behavior, and WebMCP does not issue or verify the credential.
 */
export type ProposedAgentCredentialRecognition = "not_recognized" | "recognized";

export interface SimulatedProviderScenarioState {
  signedIn: boolean;
  proposedAgentCredentialRecognition: ProposedAgentCredentialRecognition;
}

export type DemoScenarioProviderStates = Readonly<
  Record<DemoProviderId, Readonly<SimulatedProviderScenarioState>>
>;

export type DemoScenarioId = "s0" | "s1" | "s2" | "s3";

export const PROPOSED_AGENT_CREDENTIAL_MODEL =
  "simulated_external_credential_recognition_not_webmcp_verification" as const;

export interface DemoScenario {
  id: DemoScenarioId;
  simulated: true;
  credentialModel: typeof PROPOSED_AGENT_CREDENTIAL_MODEL;
  providers: DemoScenarioProviderStates;
}

export const GUEST_DEMO_SCENARIO_ID = "s0" as const;
export const SUBSCRIBER_DEMO_SCENARIO_ID = "s1" as const;

export function isDemoScenarioId(value: unknown): value is DemoScenarioId {
  return value === "s0" || value === "s1" || value === "s2" || value === "s3";
}

/** Encodes the two judge-visible switches without carrying authorization facts. */
export function demoScenarioIdFor(
  providers: DemoScenarioProviderStates,
): DemoScenarioId {
  assertProviderStates(providers);
  const state = providers.journal;
  const mask = (state.signedIn ? 1 : 0)
    | (state.proposedAgentCredentialRecognition === "recognized" ? 2 : 0);
  return `s${mask}` as DemoScenarioId;
}

/** Returns a deeply immutable scenario for a canonical ID, or `null`. */
export function demoScenarioForId(value: unknown): DemoScenario | null {
  if (!isDemoScenarioId(value)) return null;
  const mask = Number(value.slice(1));
  return Object.freeze({
    id: value,
    simulated: true,
    credentialModel: PROPOSED_AGENT_CREDENTIAL_MODEL,
    providers: Object.freeze({
      journal: Object.freeze({
        signedIn: Boolean(mask & 1),
        proposedAgentCredentialRecognition: mask & 2 ? "recognized" : "not_recognized",
      }),
    }),
  });
}

export function demoScenarioIdForPersona(persona: PersonaKey): DemoScenarioId {
  return persona === "subscriber" ? SUBSCRIBER_DEMO_SCENARIO_ID : GUEST_DEMO_SCENARIO_ID;
}

export function demoPersonaForScenario(scenario: DemoScenario): PersonaKey {
  return scenario.providers.journal.signedIn ? "subscriber" : "guest";
}

export function demoProviderPersonaForScenario(
  scenario: DemoScenario,
  provider: DemoProviderId,
): PersonaKey {
  return scenario.providers[provider].signedIn ? "subscriber" : "guest";
}

function assertProviderStates(
  providers: DemoScenarioProviderStates,
): asserts providers is DemoScenarioProviderStates {
  if (!providers || typeof providers !== "object" || Array.isArray(providers)) {
    throw new TypeError("A complete simulated provider-state record is required.");
  }
  const keys = Object.keys(providers);
  const state = providers.journal;
  if (keys.length !== 1 || keys[0] !== "journal" || !state
    || typeof state.signedIn !== "boolean"
    || (state.proposedAgentCredentialRecognition !== "recognized"
      && state.proposedAgentCredentialRecognition !== "not_recognized")) {
    throw new TypeError("The simulated journal state must be explicit and valid.");
  }
}

// SPDX-License-Identifier: Apache-2.0

import {
  demoScenarioIdFor,
  type ProposedAgentCredentialRecognition,
} from "@/src/lib/demo/scenario";
import type { PublicDemoSession } from "@/src/lib/integration/demo-session-client";

const DEMO_STATE_STORAGE_KEY = "openinquiry:journal-demo-state:v2";

export type PublisherDecidesEntitlement = "guest" | "entitled";

export type PublisherDecidesState = Readonly<{
  credentialRecognition: ProposedAgentCredentialRecognition;
  entitlement: PublisherDecidesEntitlement;
}>;

export function publisherDecidesScenarioFor({
  credentialRecognition,
  entitlement,
}: PublisherDecidesState) {
  return demoScenarioIdFor({
    journal: {
      signedIn: entitlement === "entitled",
      proposedAgentCredentialRecognition: credentialRecognition,
    },
  });
}

export function publisherDecidesStateForSession(
  session: PublicDemoSession,
): PublisherDecidesState | null {
  if (!session.active) return null;
  return {
    entitlement: session.providers.journal.signedIn ? "entitled" : "guest",
    credentialRecognition: session.providers.journal.proposedAgentCredentialRecognition,
  };
}

export function readPublisherDecidesState(): PublisherDecidesState | null {
  try {
    const value = window.sessionStorage.getItem(DEMO_STATE_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<PublisherDecidesState>;
    if (
      (parsed.entitlement === "guest" || parsed.entitlement === "entitled")
      && (parsed.credentialRecognition === "not_recognized"
        || parsed.credentialRecognition === "recognized")
    ) {
      return parsed as PublisherDecidesState;
    }
  } catch {
    // Session continuity is an enhancement; a blocked store must not block the journal.
  }
  return null;
}

export function writePublisherDecidesState(value: PublisherDecidesState) {
  try {
    window.sessionStorage.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The signed-in page remains usable when session storage is unavailable.
  }
}

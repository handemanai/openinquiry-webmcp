// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  GUEST_DEMO_SCENARIO_ID,
  PROPOSED_AGENT_CREDENTIAL_MODEL,
  SUBSCRIBER_DEMO_SCENARIO_ID,
  demoPersonaForScenario,
  demoScenarioForId,
  demoScenarioIdFor,
  demoScenarioIdForPersona,
} from "./scenario";

describe("journal demo scenarios", () => {
  it("round-trips all four judge-visible combinations", () => {
    for (const id of ["s0", "s1", "s2", "s3"] as const) {
      const scenario = demoScenarioForId(id);
      expect(scenario).not.toBeNull();
      if (!scenario) continue;
      expect(demoScenarioIdFor(scenario.providers)).toBe(id);
      expect(scenario.credentialModel).toBe(PROPOSED_AGENT_CREDENTIAL_MODEL);
    }
  });

  it("keeps reader access separate from the proposed agent signal", () => {
    expect(demoScenarioForId("s1")?.providers.journal).toEqual({
      signedIn: true,
      proposedAgentCredentialRecognition: "not_recognized",
    });
    expect(demoScenarioForId("s2")?.providers.journal).toEqual({
      signedIn: false,
      proposedAgentCredentialRecognition: "recognized",
    });
  });

  it("maps public and signed-in personas without changing the assurance bit", () => {
    expect(demoScenarioIdForPersona("guest")).toBe(GUEST_DEMO_SCENARIO_ID);
    expect(demoScenarioIdForPersona("subscriber")).toBe(SUBSCRIBER_DEMO_SCENARIO_ID);
    expect(demoPersonaForScenario(demoScenarioForId("s2")!)).toBe("guest");
    expect(demoPersonaForScenario(demoScenarioForId("s3")!)).toBe("subscriber");
  });

  it("rejects unknown identifiers", () => {
    for (const invalid of ["s4", "s00", "S1", "", null]) {
      expect(demoScenarioForId(invalid)).toBeNull();
    }
  });
});

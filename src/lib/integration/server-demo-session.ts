// SPDX-License-Identifier: Apache-2.0

import { cookies } from "next/headers";

import type { PersonaKey } from "@/src/data";
import {
  demoProviderPersonaForScenario,
  type DemoProviderId,
} from "@/src/lib/demo/scenario";
import {
  DEMO_SESSION_COOKIE_NAME,
  demoScenarioForSession,
  readDemoSessionToken,
  type DemoSession,
} from "@/src/lib/session";

/**
 * Selects presentation state from the signed server cookie only. This helper
 * never executes a knowledge tool and therefore never spends retrieval budget.
 */
export async function getServerDemoPersona(): Promise<PersonaKey> {
  return (await getServerDemoSession())?.persona ?? "guest";
}

/**
 * Resolves one provider's native signed-in presentation from the verified
 * simulated scenario. Proposed assurance recognition is deliberately not an
 * authentication decision and does not affect this result.
 */
export async function getServerProviderPersona(
  provider: DemoProviderId,
): Promise<PersonaKey> {
  const session = await getServerDemoSession();
  if (!session) return "guest";
  return demoProviderPersonaForScenario(demoScenarioForSession(session), provider);
}

/**
 * Returns only a verified signed demo session. Server presentation models use
 * this object, rather than a client-supplied persona, when deciding whether a
 * protected human-view field may cross an RSC/client boundary.
 */
export async function getServerDemoSession(): Promise<DemoSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value;
  return readDemoSessionToken(token);
}

export function getDemoPersonaFromSignedToken(
  token: string | undefined,
): PersonaKey {
  return readDemoSessionToken(token)?.persona ?? "guest";
}

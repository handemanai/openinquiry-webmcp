// SPDX-License-Identifier: Apache-2.0

import {
  announceDemoSessionChange,
  clearPublicDemoSession,
  type DemoSessionFetch,
  type PublicDemoSession,
} from "./demo-session-client";
import {
  knowledgeClientStore,
  type KnowledgeClientStore,
} from "../webmcp/client";
import {
  announceDemoEvidenceReset,
  clearPublisherDecidesEvidence,
} from "./demo-evidence-client";

export const DOCUMENTED_DEMO_START_PATH = "/demo" as const;

const RESTORE_START_FOCUS_KEY = "openinquiry:restore-demo-start-focus";

export interface DemoResetStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

/**
 * Clears the trusted server session first, then clears the page-local outcome
 * store only after that operation succeeds. This keeps a failed reset from
 * misrepresenting the active server access context.
 */
export async function resetOpenInquiryDemo(
  fetchImplementation: DemoSessionFetch = globalThis.fetch.bind(globalThis),
  signal?: AbortSignal,
  store: KnowledgeClientStore = knowledgeClientStore,
): Promise<Extract<PublicDemoSession, { active: false }>> {
  const session = await clearPublicDemoSession(fetchImplementation, signal);
  if (session.active) {
    throw new Error("The demo reset endpoint did not return the inactive session baseline.");
  }
  store.reset();
  clearPublisherDecidesEvidence();
  announceDemoEvidenceReset();
  announceDemoSessionChange();
  return session;
}

/** Marks a full navigation so the `/demo` inspector can restore its top focus. */
export function requestDocumentedDemoStartFocus(
  storage: DemoResetStorage | null = browserSessionStorage(),
): void {
  try {
    storage?.setItem(RESTORE_START_FOCUS_KEY, "1");
  } catch {
    // Reset still succeeds if a privacy setting makes session storage unavailable.
  }
}

/** Consumes the one-time focus restoration marker after navigation to `/demo`. */
export function consumeDocumentedDemoStartFocus(
  storage: DemoResetStorage | null = browserSessionStorage(),
): boolean {
  try {
    if (storage?.getItem(RESTORE_START_FOCUS_KEY) !== "1") return false;
    storage.removeItem(RESTORE_START_FOCUS_KEY);
    return true;
  } catch {
    return false;
  }
}

function browserSessionStorage(): DemoResetStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// SPDX-License-Identifier: Apache-2.0

import {
  JOURNAL_GUIDELINE_CATALOG,
  type JournalGuidelineId,
} from "@/src/lib/demo/journal-guidelines-catalog";

export const DEMO_EVIDENCE_CHANNEL_NAME =
  "openinquiry:journal-agent-evidence:v1" as const;

const EVIDENCE_STORAGE_PREFIX = "openinquiry:journal-agent-evidence:v2:";
const LEGACY_EVIDENCE_STORAGE_PREFIX = "openinquiry:journal-agent-evidence:v1:";

export interface DemoEvidenceStorage {
  removeItem(key: string): void;
}

export function publisherDecidesEvidenceStorageKey(resourceId: JournalGuidelineId) {
  return `${EVIDENCE_STORAGE_PREFIX}${resourceId}`;
}

export function clearPublisherDecidesEvidence(
  storage: DemoEvidenceStorage | null = browserSessionStorage(),
) {
  try {
    for (const guideline of JOURNAL_GUIDELINE_CATALOG) {
      storage?.removeItem(publisherDecidesEvidenceStorageKey(guideline.id));
      storage?.removeItem(`${LEGACY_EVIDENCE_STORAGE_PREFIX}${guideline.id}`);
    }
  } catch {
    // A blocked store does not affect the server-enforced policy decision.
  }
}

/** Tells other open demo tabs to discard evidence from the replaced session. */
export function announceDemoEvidenceReset() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(DEMO_EVIDENCE_CHANNEL_NAME);
  channel.postMessage({ type: "session_reset" });
  window.setTimeout(() => channel.close(), 0);
}

function browserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// SPDX-License-Identifier: Apache-2.0

import type { AccessGrantFixture, ResourceAccessPolicy } from "./types";

export const SYNTHETIC_CONTENT_NOTICE =
  "Fictional OpenInquiry demonstration content created solely for a WebMCP reference demo. Not for clinical use.";

export const CONTENT_LICENSE = "CC-BY-4.0" as const;

const guestPreview: AccessGrantFixture = {
  state: "limited",
  basis: "public_web",
  basisLabel: "Guest preview",
  representations: ["metadata", "abstract", "summary", "link_only"],
  maxCharacters: 700,
  actions: [
    {
      type: "subscribe",
      label: "View full-article access options",
      path: "/demo",
      providerId: "journal",
    },
  ],
};

const fullArticleAccess: AccessGrantFixture = {
  state: "entitled",
  basis: "institutional_license",
  basisLabel: "Fictional full-article access",
  representations: ["metadata", "abstract", "summary", "full_text", "quotation", "link_only"],
  requiredEntitlements: ["journal_full_article_access"],
  actions: [],
};

export const rightsPolicies: ResourceAccessPolicy[] = [
  {
    policyId: "journal-guidelines-bounded-v1",
    rightsDecision: "allow_with_limits",
    allowedUses: ["display", "link", "quote", "summarize", "compare"],
    prohibitedUses: [
      "bulk_export",
      "redistribute",
      "persistent_storage",
      "model_training",
    ],
    attributionText:
      "The Journal of Guidelines; retain the article title, authors, and original source link.",
    mustLinkToCanonical: true,
    requestedHandling: {
      retention: "transient_only",
      training: "not_permitted",
      verification: "not_verified_by_webmcp",
    },
    byPersona: {
      guest: guestPreview,
      subscriber: fullArticleAccess,
    },
  },
];

export function policyFor(policyId: string): ResourceAccessPolicy {
  const policy = rightsPolicies.find((candidate) => candidate.policyId === policyId);
  if (!policy) throw new Error(`Unknown journal policy: ${policyId}`);
  return policy;
}

// SPDX-License-Identifier: Apache-2.0

/** Stable provider identity carried by every Journal of Guidelines response. */
export const PROFILE_PROVIDER_IDS = Object.freeze({
  journal: "journal-of-guidelines",
} as const);

export type ProfileProviderId =
  (typeof PROFILE_PROVIDER_IDS)[keyof typeof PROFILE_PROVIDER_IDS];

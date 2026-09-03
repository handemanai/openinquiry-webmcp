// SPDX-License-Identifier: CC-BY-4.0

export * from "./journal-guidelines";
export * from "./journal-policy";
export * from "./types";

import { journalGuidelines } from "./journal-guidelines";
import type { SyntheticResource } from "./types";

export const allTextResources: readonly SyntheticResource[] = journalGuidelines;

export function findTextResource(
  resourceId: string,
): SyntheticResource | undefined {
  return journalGuidelines.find((resource) => resource.id === resourceId);
}

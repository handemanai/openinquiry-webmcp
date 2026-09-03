// SPDX-License-Identifier: Apache-2.0

import {
  type ContentSection,
  type ProviderActionFixture,
  type SyntheticResource,
  type SyntheticVideo,
  type VideoTranscriptSegment,
} from "../../data/index";
import type {
  ContentType,
  KnowledgeResource,
  ProfileWarning,
  ProviderAction,
  ResourceLocator,
} from "../profile/index";
import type { ServerProviderConfig } from "./provider-config";
import { trustedApplicationUrl } from "./provider-config";

export type SourceResource = SyntheticResource | SyntheticVideo;
export type SourceUnit = ContentSection | VideoTranscriptSegment;

function profileContentType(value: SourceResource["contentType"]): ContentType {
  switch (value) {
    case "journal_article":
    case "book_chapter":
    case "guideline":
    case "consensus_statement":
    case "video":
      return value;
    case "conference_panel":
      return "conference_material";
    default:
      return "other";
  }
}

export function profileLocator(unit: SourceUnit | undefined): ResourceLocator | undefined {
  if (!unit) return undefined;
  return {
    ...unit.locator,
    ...(typeof (unit as VideoTranscriptSegment).endSeconds === "number"
      ? { timestampEndSeconds: (unit as VideoTranscriptSegment).endSeconds }
      : {}),
  };
}

export function mapSourceResource(
  resource: SourceResource,
  applicationOrigin: URL,
  unit?: SourceUnit,
): KnowledgeResource {
  return {
    id: resource.id,
    type: profileContentType(resource.contentType),
    title: resource.title,
    authors: resource.authors.map((author) => ({ name: author.name })),
    ...(resource.responsibleOrganization
      ? { responsibleOrganization: resource.responsibleOrganization }
      : {}),
    ...(resource.containerTitle ? { containerTitle: resource.containerTitle } : {}),
    identifiers: resource.identifiers.map((identifier) => ({ ...identifier })),
    canonicalUrl: trustedApplicationUrl(applicationOrigin, resource.canonicalPath),
    deepLink: trustedApplicationUrl(
      applicationOrigin,
      unit?.deepLinkPath ?? resource.deepLinkPath,
    ),
    ...(profileLocator(unit) ? { locator: profileLocator(unit) } : {}),
    dates: { ...resource.dates },
    version: resource.version,
    status: resource.status,
    ...(resource.statusNote ? { statusNote: resource.statusNote } : {}),
    ...(resource.statusPath
      ? { statusUrl: trustedApplicationUrl(applicationOrigin, resource.statusPath) }
      : {}),
  };
}

export function integrityWarnings(
  resources: readonly KnowledgeResource[],
): ProfileWarning[] {
  const warnings: ProfileWarning[] = [];
  for (const resource of resources) {
    if (resource.status === "corrected") {
      warnings.push({
        code: "RESOURCE_CORRECTED",
        message: resource.statusNote
          ?? "The provider supplied the corrected current record and correction pathway.",
      });
    } else if (resource.status === "updated") {
      warnings.push({
        code: "RESOURCE_UPDATED",
        message: resource.statusNote ?? "The provider supplied the current updated record.",
      });
    }
  }
  return warnings;
}

function actionKey(action: ProviderAction): string {
  return `${action.type}:${action.url}`;
}

export function canonicalActions(
  provider: ServerProviderConfig,
  resources: readonly KnowledgeResource[],
  applicationOrigin: URL,
  extraActions: readonly ProviderActionFixture[] = [],
): ProviderAction[] {
  const actions: ProviderAction[] = resources.map((resource) => ({
    type: resource.deepLink ? "deep_link" : "open",
    label: resource.deepLink ? "Open the exact canonical source" : "Open the canonical source",
    url: resource.deepLink ?? resource.canonicalUrl,
    providerId: provider.profileId,
  }));
  for (const action of extraActions) {
    actions.push({
      type: action.type,
      label: action.label,
      url: trustedApplicationUrl(applicationOrigin, action.path),
      // This is the provider returning the action, including a library handoff.
      providerId: provider.profileId,
    });
  }
  return [...new Map(actions.map((action) => [actionKey(action), action])).values()];
}

export function selectExactUnit(
  resource: SourceResource,
  locator: {
    sectionId?: string;
    page?: string;
    figureId?: string;
    timestampSeconds?: number;
  } | undefined,
): SourceUnit | undefined {
  const units: readonly SourceUnit[] = "transcriptSegments" in resource
    ? resource.transcriptSegments
    : resource.sections;
  if (!locator) return undefined;
  if (locator.figureId) return undefined;
  return units.find((unit) =>
    (locator.sectionId === undefined || unit.id === locator.sectionId)
    && (locator.page === undefined || unit.locator.page === locator.page)
    && (locator.timestampSeconds === undefined
      || unit.locator.timestampSeconds === locator.timestampSeconds));
}

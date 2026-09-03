// SPDX-License-Identifier: Apache-2.0

import {
  KNOWLEDGE_TOOL_NAMES,
  type KnowledgeProviderIdentity,
  type KnowledgeRouteContext,
  type KnowledgeToolName,
} from "../index.ts";
import { PROFILE_PROVIDER_IDS } from "../../../config/profile-provider-identities.ts";

export type OpenInquiryProviderId = "journal";

const ALL_PROVIDER_TOOLS = Object.freeze([...KNOWLEDGE_TOOL_NAMES]);
const JOURNAL_ARTICLE_TOOLS = Object.freeze([
  "knowledge_access",
  "knowledge_retrieve",
  "knowledge_resolve",
  "knowledge_open",
  "knowledge_status",
] as const satisfies readonly KnowledgeToolName[]);

export const JOURNAL_CLIENT_PROVIDER_DEFINITION = Object.freeze({
  id: "journal" as const,
  profileId: PROFILE_PROVIDER_IDS.journal,
  name: "The Journal of Guidelines",
  role: "publisher" as const,
  routePrefix: "/demo" as const,
  supportedTools: ALL_PROVIDER_TOOLS,
  allowedOpenRoutePrefixes: Object.freeze(["/demo", "/demo/article"] as const),
});

export const CLIENT_PROVIDER_DEFINITIONS = Object.freeze({
  journal: JOURNAL_CLIENT_PROVIDER_DEFINITION,
});

export function clientProviderDefinition(providerId: OpenInquiryProviderId) {
  return CLIENT_PROVIDER_DEFINITIONS[providerId];
}

export interface ResolvedClientRoute {
  providerMatchesRoute: boolean;
  expectedProviderId: OpenInquiryProviderId | null;
  route: Readonly<KnowledgeRouteContext>;
}

export function providerIdForPathname(pathname: string): OpenInquiryProviderId | null {
  const normalized = normalizeClientPathname(pathname);
  return normalized === "/demo" || normalized.startsWith("/demo/")
    ? "journal"
    : null;
}

/** A route may only narrow the provider's registered tool surface. */
export function resolveClientRoute(
  providerId: OpenInquiryProviderId,
  pathname: string,
  requestedCapabilities?: readonly KnowledgeToolName[],
): ResolvedClientRoute {
  const normalized = normalizeClientPathname(pathname);
  const expectedProviderId = providerIdForPathname(normalized);
  const providerMatchesRoute = expectedProviderId === providerId;
  const requested = requestedCapabilities ? new Set(requestedCapabilities) : null;
  const routeTools = normalized.startsWith("/demo/article/")
    ? JOURNAL_ARTICLE_TOOLS
    : normalized === "/demo"
      ? ALL_PROVIDER_TOOLS
      : [];
  const capabilities = providerMatchesRoute
    ? requested
      ? routeTools.filter((toolName) => requested.has(toolName))
      : routeTools
    : [];
  return Object.freeze({
    providerMatchesRoute,
    expectedProviderId,
    route: Object.freeze({
      pathname: normalized,
      capabilities: Object.freeze([...capabilities]),
    }),
  });
}

export function createClientProviderIdentity(
  providerId: OpenInquiryProviderId,
  origin: string,
): Readonly<KnowledgeProviderIdentity> {
  const definition = clientProviderDefinition(providerId);
  const normalizedOrigin = normalizeOrigin(origin);
  return Object.freeze({
    id: definition.profileId,
    name: definition.name,
    role: definition.role,
    canonicalUrl: new URL(definition.routePrefix, normalizedOrigin).href,
  });
}

export function normalizeOrigin(origin: string): string {
  const parsed = new URL(origin);
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:")
    || parsed.origin === "null") {
    throw new TypeError("OpenInquiry client origin must be an HTTP(S) origin.");
  }
  return parsed.origin;
}

export function normalizeClientPathname(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/u, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/u, "")
    : withLeadingSlash;
}

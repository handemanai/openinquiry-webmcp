// SPDX-License-Identifier: Apache-2.0

import {
  PROFILE_PROVIDER_IDS,
  type ProfileProviderId,
} from "../../config/profile-provider-identities";
import type { KnowledgeToolName, ProviderIdentity } from "../profile/index";

export const PROVIDER_ROUTE_KEYS = ["journal"] as const;
export type ProviderRouteKey = (typeof PROVIDER_ROUTE_KEYS)[number];

const ALL_PROVIDER_TOOLS = [
  "knowledge_describe",
  "knowledge_access",
  "knowledge_search",
  "knowledge_retrieve",
  "knowledge_resolve",
  "knowledge_open",
  "knowledge_status",
] as const satisfies readonly KnowledgeToolName[];

export interface ServerProviderConfig {
  routeKey: ProviderRouteKey;
  id: "journal";
  profileId: ProfileProviderId;
  role: "publisher";
  name: string;
  description: string;
  canonicalPath: string;
  policyPath: string;
  collections: readonly string[];
  supportedTools: readonly KnowledgeToolName[];
}

export const JOURNAL_PROVIDER_CONFIG: ServerProviderConfig = Object.freeze({
  routeKey: "journal",
  id: "journal",
  profileId: PROFILE_PROVIDER_IDS.journal,
  role: "publisher",
  name: "The Journal of Guidelines",
  description:
    "A fictional journal website publishing current synthetic guideline articles for this demonstration.",
  canonicalPath: "/demo",
  policyPath: "/demo/publisher-decides",
  collections: Object.freeze(["Current fictional guideline articles"]),
  supportedTools: Object.freeze([...ALL_PROVIDER_TOOLS]),
});

export const SERVER_PROVIDER_CONFIG: Readonly<Record<ProviderRouteKey, ServerProviderConfig>> =
  Object.freeze({ journal: JOURNAL_PROVIDER_CONFIG });

export function isProviderRouteKey(value: string): value is ProviderRouteKey {
  return value === "journal";
}

export function providerConfigFor(value: string): ServerProviderConfig | null {
  return isProviderRouteKey(value) ? SERVER_PROVIDER_CONFIG[value] : null;
}

export function providerIdentity(
  config: ServerProviderConfig,
  applicationOrigin: URL,
  rightsHolderName?: string,
): ProviderIdentity {
  return {
    id: config.profileId,
    name: config.name,
    role: config.role,
    canonicalUrl: trustedApplicationUrl(applicationOrigin, config.canonicalPath),
    ...(rightsHolderName ? { rightsHolderName } : {}),
    policyUrl: trustedApplicationUrl(applicationOrigin, config.policyPath),
  };
}

export function configuredApplicationOrigin(
  configured = process.env.OPENINQUIRY_APP_ORIGIN,
): URL {
  const explicit = configured?.trim();
  if (!explicit && process.env.NODE_ENV === "production") {
    throw new Error("OPENINQUIRY_APP_ORIGIN is required in production.");
  }
  const value = explicit || "http://localhost:3000";
  const url = new URL(value);
  if ((url.protocol !== "https:" && url.protocol !== "http:")
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash) {
    throw new Error("OPENINQUIRY_APP_ORIGIN must be a bare trusted HTTP(S) origin.");
  }
  return new URL(url.origin);
}

export function trustedApplicationUrl(applicationOrigin: URL, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Provider paths must be origin-relative.");
  }
  const url = new URL(path, applicationOrigin);
  if (url.origin !== applicationOrigin.origin) {
    throw new Error("Provider path escaped the trusted application origin.");
  }
  return url.toString();
}

export function requestHasTrustedOrigin(request: Request, applicationOrigin: URL): boolean {
  const supplied = request.headers.get("origin");
  if (!supplied) return false;
  try {
    const parsed = new URL(supplied);
    return !parsed.username
      && !parsed.password
      && parsed.pathname === "/"
      && !parsed.search
      && !parsed.hash
      && parsed.origin === applicationOrigin.origin;
  } catch {
    return false;
  }
}

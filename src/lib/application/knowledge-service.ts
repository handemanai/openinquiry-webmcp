// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";

import {
  journalGuidelines,
  type AccessGrantFixture,
  type Representation,
  type SyntheticResource,
  type SyntheticVideo,
} from "../../data/index";
import {
  PROFILE_VERSION,
  createResponseEnvelope,
  createSourceReceipt,
  evaluateRetrieval,
  validateKnowledgeResponse,
  type AccessDecision,
  type AllowedUse,
  type ContentGrant,
  type ContentRepresentation,
  type KnowledgeOpenRequest,
  type KnowledgeRequestContext,
  type KnowledgeResolveRequest,
  type KnowledgeResponse,
  type KnowledgeRetrieveRequest,
  type KnowledgeSearchRequest,
  type KnowledgeStatusRequest,
  type KnowledgeToolName,
  type ProfileErrorCode,
  type ProviderAction,
  type ProviderIdentity,
  type ResourcePolicy,
  type RightsDecision,
  type TrustedAccessContext,
} from "../profile/index";
import {
  validateKnowledgeToolInput,
  type KnowledgeToolName as RuntimeKnowledgeToolName,
} from "../webmcp/index";
import {
  demoScenarioForSession,
  createDemoRetrievalBudget,
  sha256Digest,
  type DemoRetrievalBudget,
  type DemoSession,
} from "../session/index";
import {
  SERVER_PROVIDER_CONFIG,
  configuredApplicationOrigin,
  providerConfigFor,
  providerIdentity,
  trustedApplicationUrl,
  type ProviderRouteKey,
  type ServerProviderConfig,
} from "./provider-config";
import {
  canonicalActions,
  integrityWarnings,
  mapSourceResource,
  selectExactUnit,
  type SourceResource,
  type SourceUnit,
} from "./resource-mapper";
import {
  bestResourceUnit,
  rankResource,
  rankResourceUnits,
  searchTokens,
} from "./search";

const DISCOVERY_PROHIBITIONS = [
  "bulk_export",
  "redistribute",
  "persistent_storage",
  "model_training",
] as const;

const PROPOSED_AGENT_ASSURANCE_POLICY_SUFFIX =
  "-proposed-agent-assurance-demo" as const;
const UNASSURED_AGENT_SECTION_MAX_CHARACTERS = 2_000;
const DEMO_FULL_TEXT_PROVIDER_BUDGET_CHARACTERS = 250_000;

export interface OpenInquiryExecution {
  providerRoute: ProviderRouteKey;
  toolName: KnowledgeToolName;
  input: unknown;
  session: DemoSession;
  signal?: AbortSignal;
}

export interface OpenInquiryApplicationOptions {
  applicationOrigin?: URL;
  budget?: DemoRetrievalBudget;
  now?: () => Date;
  createReceiptId?: () => string;
}

export interface BoundaryErrorInput {
  providerRoute: ProviderRouteKey;
  toolName: KnowledgeToolName;
  code: ProfileErrorCode;
  message: string;
  field?: string;
  status?: "denied" | "not_found" | "error";
  retryable?: boolean;
}

export interface OpenInquiryApplication {
  readonly applicationOrigin: URL;
  execute(execution: OpenInquiryExecution): Promise<KnowledgeResponse>;
  createBoundaryError(input: BoundaryErrorInput): KnowledgeResponse;
}

function isSourceVideo(resource: SourceResource): resource is SyntheticVideo {
  return "transcriptSegments" in resource;
}

function providerResources(): SourceResource[] {
  return [...journalGuidelines];
}

function resourceById(resourceId: string): SourceResource | undefined {
  return journalGuidelines.find((resource) => resource.id === resourceId);
}

function hasEntitlement(session: DemoSession, key: string): boolean {
  return session.entitlementKeys.includes(key);
}

function providerAccess(config: ServerProviderConfig, session: DemoSession): AccessDecision {
  const entitled = hasEntitlement(session, "journal_full_article_access");
  return {
    state: entitled ? "entitled" : "limited",
    basis: entitled ? "institutional_license" : "public_web",
    basisLabel: entitled
      ? "Full article access recognized for this simulated signed-in reader."
      : "Public preview only; full article access is not established.",
    decidedBy: config.profileId,
  };
}

function rights(
  config: ServerProviderConfig,
  policyId: string,
  decision: RightsDecision["decision"],
  allowedUses: readonly AllowedUse[],
  limits?: RightsDecision["limits"],
): RightsDecision {
  return {
    policyId,
    decision,
    allowedUses: [...allowedUses],
    prohibitedUses: [...DISCOVERY_PROHIBITIONS],
    ...(limits ? { limits: { ...limits } } : {}),
    attribution: {
      required: true,
      text: `${config.name}; retain the source title, authorship, status, and canonical link.`,
      mustLinkToCanonical: true,
    },
    requestedHandling: {
      retention: "transient_only",
      training: "not_permitted",
      verification: "not_verified_by_webmcp",
    },
  };
}

function mapRepresentations(values: readonly Representation[]): ContentRepresentation[] {
  return values.map((value) => value as ContentRepresentation);
}

function requiredEntitlement(resource: SourceResource): string | undefined {
  return resource.access.byPersona.subscriber.requiredEntitlements?.[0];
}

function grantForSession(resource: SourceResource, session: DemoSession): AccessGrantFixture {
  const required = requiredEntitlement(resource);
  return required && hasEntitlement(session, required)
    ? resource.access.byPersona.subscriber
    : resource.access.byPersona.guest;
}

function retrievalAccess(
  config: ServerProviderConfig,
  resource: SourceResource,
  session: DemoSession,
): TrustedAccessContext {
  const required = requiredEntitlement(resource);
  const grant = grantForSession(resource, session);
  return {
    providerId: config.profileId,
    state: required && hasEntitlement(session, required)
      ? "entitled"
      : required
        ? "not_entitled"
        : "public",
    basis: grant.basis,
    basisLabel: grant.basisLabel,
    entitlementKeys: session.entitlementKeys,
  };
}

function accessDecisionForResource(
  config: ServerProviderConfig,
  resource: SourceResource,
  session: DemoSession,
): AccessDecision {
  const trusted = retrievalAccess(config, resource, session);
  return {
    state: trusted.state,
    basis: trusted.basis,
    ...(trusted.basisLabel ? { basisLabel: trusted.basisLabel } : {}),
    decidedBy: config.profileId,
  };
}

/**
 * The 0.1 envelope carries one access decision, while `knowledge_status` can
 * refresh several resources at once. Preserve a shared resource decision when
 * every resource agrees. If the state, basis, or validity differs, report that
 * no single aggregate decision applies instead of allowing one resource to
 * make the whole set look public or entitled.
 */
function aggregateAccessDecisions(
  config: ServerProviderConfig,
  decisions: readonly AccessDecision[],
): AccessDecision {
  const first = decisions[0];
  if (!first) {
    return {
      state: "unknown",
      basis: "unknown",
      basisLabel: "No resource-specific access decision was available.",
      decidedBy: config.profileId,
    };
  }
  if (decisions.length === 1) return first;

  const sameDecisionScope = decisions.every((decision) =>
    decision.state === first.state
      && decision.basis === first.basis
      && decision.validUntil === first.validUntil);
  if (sameDecisionScope) {
    const basisLabels = [...new Set(decisions
      .map((decision) => decision.basisLabel)
      .filter((label): label is string => Boolean(label)))];
    return {
      state: first.state,
      basis: first.basis,
      ...(basisLabels.length === 1
        ? { basisLabel: basisLabels[0] }
        : {
            basisLabel:
              `Consistent ${first.state.replaceAll("_", " ")} access across the requested resources; provider details remain resource-specific.`,
          }),
      decidedBy: config.profileId,
      ...(first.validUntil ? { validUntil: first.validUntil } : {}),
    };
  }

  const decisionSummaries = [...new Set(decisions.map((decision) =>
    `${decision.state.replaceAll("_", " ")} via ${decision.basis.replaceAll("_", " ")}`))];
  return {
    state: "unknown",
    basis: "unknown",
    basisLabel:
      `Mixed resource-specific access (${decisionSummaries.join("; ")}); no single access decision applies. Resolve or retrieve each resource for its own access decision.`,
    decidedBy: config.profileId,
  };
}

function fallbackRepresentation(publicRepresentations: readonly Representation[]):
  | Exclude<ContentRepresentation, "link_only" | "metadata">
  | undefined {
  for (const representation of ["summary", "abstract", "recommendation"] as const) {
    if (publicRepresentations.includes(representation)) return representation;
  }
  return undefined;
}

function proposedAssuranceIsRecognized(
  config: ServerProviderConfig,
  session: DemoSession,
): boolean {
  return demoScenarioForSession(session)
    .providers.journal
    .proposedAgentCredentialRecognition === "recognized";
}

function retrievalPolicy(
  config: ServerProviderConfig,
  resource: SourceResource,
  session: DemoSession,
  applicationOrigin: URL,
  requestedRepresentation: ContentRepresentation,
): ResourcePolicy {
  const currentGrant = grantForSession(resource, session);
  const entitlement = requiredEntitlement(resource);
  const entitled = Boolean(entitlement && hasEntitlement(session, entitlement));
  const assuranceRecognized = proposedAssuranceIsRecognized(config, session);
  const proposedAssuranceApplied = assuranceRecognized;
  const ordinaryMaximum = currentGrant.maxCharacters;
  const assuranceLimitedRepresentation = requestedRepresentation === "quotation"
    || requestedRepresentation === "recommendation"
    || requestedRepresentation === "transcript_segment"
    || requestedRepresentation === "full_text";
  const maxCharacters = entitled
    && !assuranceRecognized
    && assuranceLimitedRepresentation
    ? ordinaryMaximum === undefined
      ? UNASSURED_AGENT_SECTION_MAX_CHARACTERS
      : Math.min(UNASSURED_AGENT_SECTION_MAX_CHARACTERS, ordinaryMaximum)
    : ordinaryMaximum;
  const fallback = requestedRepresentation === "full_text" && entitled && !assuranceRecognized
    ? "quotation" as const
    : assuranceRecognized
      ? "summary" as const
      : fallbackRepresentation(resource.access.byPersona.guest.representations);
  const entitledRepresentations = mapRepresentations(
    resource.access.byPersona.subscriber.representations,
  ).filter((representation) => assuranceRecognized || representation !== "full_text");
  if (
    (resource.contentType === "guideline"
      || resource.contentType === "consensus_statement")
    && !entitledRepresentations.includes("recommendation")
  ) {
    entitledRepresentations.push("recommendation");
  }
  const accessActions = [
    ...currentGrant.actions,
    ...resource.ctaPathways.filter((action) => action.type !== "open" && action.type !== "deep_link"),
  ].map((action): ProviderAction => ({
    type: action.type,
    label: action.label,
    url: trustedApplicationUrl(applicationOrigin, action.path),
    providerId: config.profileId,
  }));
  return {
    policyId: proposedAssuranceApplied
      ? `${resource.access.policyId}${PROPOSED_AGENT_ASSURANCE_POLICY_SUFFIX}`
      : resource.access.policyId,
    providerId: config.profileId,
    policyUrl: trustedApplicationUrl(applicationOrigin, config.policyPath),
    ...(entitlement ? { requiredEntitlement: entitlement } : {}),
    publicAccessBasis: "public_web",
    publicRepresentations: mapRepresentations(resource.access.byPersona.guest.representations),
    entitledRepresentations,
    ...(fallback ? { fallbackRepresentation: fallback } : {}),
    allowedUses: [...resource.access.allowedUses],
    prohibitedUses: [...resource.access.prohibitedUses],
    ...(maxCharacters !== undefined ? { maxCharacters } : {}),
    maxSegments: 1,
    attribution: {
      required: true,
      text: resource.access.attributionText,
      mustLinkToCanonical: true,
    },
    requestedHandling: { ...resource.access.requestedHandling },
    accessActions,
  };
}

function availableContent(
  resource: SourceResource,
  unit: SourceUnit | undefined,
): Partial<Record<ContentRepresentation, string>> {
  return {
    abstract: resource.abstract,
    summary: resource.publisherSummary ?? resource.abstract,
    ...(!isSourceVideo(resource) ? { full_text: fullArticleText(resource) } : {}),
    ...(unit && !isSourceVideo(resource)
      ? {
          quotation: unit.text,
          ...(resource.contentType === "guideline" || resource.contentType === "consensus_statement"
            ? { recommendation: unit.text }
            : {}),
        }
      : {}),
    ...(unit && isSourceVideo(resource) ? { transcript_segment: unit.text } : {}),
  };
}

/**
 * Builds the complete, ordered reader work from provider-owned source fields.
 * The publisher summary is intentionally excluded because it is contextual
 * agent material rather than part of the canonical article.
 */
function fullArticleText(resource: SyntheticResource): string {
  return [
    resource.title,
    `Abstract\n${resource.abstract}`,
    ...resource.sections.map((section) => `${section.heading}\n${section.text}`),
  ].join("\n\n");
}

function isJournalGuideline(resource: SourceResource): resource is SyntheticResource {
  return !isSourceVideo(resource)
    && resource.contentType === "guideline"
    && resource.containerTitle === "The Journal of Guidelines";
}

function grant(
  resourceId: string,
  representation: ContentGrant["representation"],
  content: string,
  locator?: ContentGrant["locator"],
): ContentGrant {
  return {
    resourceId,
    representation,
    content,
    ...(locator ? { locator: { ...locator } } : {}),
    suppliedByProvider: true,
    contentDigest: sha256Digest(content),
  };
}

interface SentenceSpan {
  start: number;
  end: number;
  text: string;
}

function sentenceSpans(value: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const expression = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/gu;
  for (const match of value.matchAll(expression)) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const trailing = raw.length - raw.trimEnd().length;
    const start = (match.index ?? 0) + leading;
    const end = (match.index ?? 0) + raw.length - trailing;
    if (end > start) spans.push({ start, end, text: value.slice(start, end) });
  }
  return spans;
}

function occurrences(value: string, tokens: readonly string[]): number {
  const indexedTokens = new Set(
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu) ?? [],
  );
  return tokens.reduce(
    (score, token) => score + (indexedTokens.has(token) ? 1 : 0),
    0,
  );
}

/** Selects the strongest consecutive whole-sentence passage, not a prefix clip. */
function relevantExcerpt(
  unit: SourceUnit,
  focusedQuery: string | undefined,
  maximum = UNASSURED_AGENT_SECTION_MAX_CHARACTERS,
): string {
  if (unit.text.length <= maximum) return unit.text;
  const spans = sentenceSpans(unit.text);
  if (spans.length === 0) return unit.text.slice(0, maximum);
  const tokens = searchTokens(focusedQuery ?? unit.heading);
  let best = spans.find((span) => span.text.length <= maximum) ?? spans[0];
  let bestScore = -1;
  for (let start = 0; start < spans.length; start += 1) {
    for (let end = start; end < spans.length; end += 1) {
      const length = spans[end].end - spans[start].start;
      if (length > maximum) break;
      const text = unit.text.slice(spans[start].start, spans[end].end);
      const score = occurrences(text, tokens) * 100 + Math.min(length, maximum) / maximum;
      if (score > bestScore) {
        best = { start: spans[start].start, end: spans[end].end, text };
        bestScore = score;
      }
    }
  }
  if (best.text.length <= maximum) return best.text;
  const queryToken = tokens.find((token) =>
    best.text.toLocaleLowerCase("en-US").includes(token));
  const matchIndex = queryToken
    ? best.text.toLocaleLowerCase("en-US").indexOf(queryToken)
    : 0;
  const start = Math.max(0, Math.min(matchIndex - Math.floor(maximum / 3), best.text.length - maximum));
  return best.text.slice(start, start + maximum);
}

function relevantGuidelineUnit(
  resource: SourceResource,
  selected: SourceUnit | undefined,
  focusedQuery: string | undefined,
): SourceUnit | undefined {
  if (!isJournalGuideline(resource)) return selected;
  if (selected?.id !== "executive-summary") return selected;
  if (!focusedQuery) return selected;
  return rankResourceUnits(resource, focusedQuery)
    .find(({ unit, score }) => unit.id !== "executive-summary" && score > 0)?.unit
    ?? selected;
}

function withBundleDigest(response: KnowledgeResponse): KnowledgeResponse {
  const supplied = response.grants?.filter(
    (candidate): candidate is ContentGrant & { content: string } =>
      typeof candidate.content === "string",
  ) ?? [];
  for (const item of supplied) item.contentDigest = sha256Digest(item.content);
  if (supplied.length > 0) {
    response.receipt.returnedUnitDigest = supplied.length === 1
      ? supplied[0].contentDigest
      : sha256Digest(
          supplied.map((item) => `${item.representation}:${item.content}`).join("\n\u241e\n"),
        );
  }
  return response;
}

function journalGuidelineBundle(input: {
  response: KnowledgeResponse;
  resource: SourceResource;
  selectedUnit: SourceUnit | undefined;
  request: KnowledgeRetrieveRequest;
  entitled: boolean;
  assuranceRecognized: boolean;
}): KnowledgeResponse {
  const { response, resource, request, entitled, assuranceRecognized } = input;
  if (!isJournalGuideline(resource)
    || (request.requestedRepresentation !== "recommendation"
      && request.requestedRepresentation !== "quotation"
      && request.requestedRepresentation !== "full_text")) {
    return withBundleDigest(response);
  }

  if (request.requestedRepresentation === "full_text") {
    if (entitled && assuranceRecognized) {
      if (response.rights) response.rights.decision = "allow_with_limits";
      return withBundleDigest(response);
    }

    const unit = entitled
      ? relevantGuidelineUnit(resource, input.selectedUnit, request.focusedQuery)
      : undefined;
    const grants: ContentGrant[] = [];
    if (!entitled || assuranceRecognized) {
      grants.push(grant(resource.id, "abstract", resource.abstract));
    }
    if (!entitled && assuranceRecognized) {
      const summaryUnit = resource.sections.find((section) => section.id === "executive-summary");
      grants.push(grant(
        resource.id,
        "summary",
        resource.publisherSummary ?? summaryUnit?.text ?? resource.abstract,
        summaryUnit?.locator,
      ));
    }
    if (entitled && unit) {
      grants.push(grant(
        resource.id,
        "quotation",
        relevantExcerpt(
          unit,
          request.focusedQuery,
          UNASSURED_AGENT_SECTION_MAX_CHARACTERS,
        ),
        unit.locator,
      ));
    }

    response.status = "limited";
    response.error = entitled ? undefined : response.error;
    response.warnings = response.warnings?.filter(({ code }) => code !== "CONTENT_TRUNCATED");
    response.receipt.decision = "limited";
    response.grants = grants;
    if (response.rights) {
      response.rights.decision = "allow_with_limits";
      response.rights.limits = {
        maxCharacters: grants.reduce(
          (total, item) => total + (item.content?.length ?? 0),
          0,
        ),
        maxSegments: grants.length,
      };
    }
    return withBundleDigest(response);
  }

  const summaryUnit = resource.sections.find((section) => section.id === "executive-summary");
  const summary = resource.publisherSummary ?? summaryUnit?.text ?? resource.abstract;
  const totalMaximum = Math.min(
    request.maxCharacters ?? UNASSURED_AGENT_SECTION_MAX_CHARACTERS,
    assuranceRecognized
      ? request.maxCharacters ?? UNASSURED_AGENT_SECTION_MAX_CHARACTERS
      : UNASSURED_AGENT_SECTION_MAX_CHARACTERS,
  );
  const grants: ContentGrant[] = [];
  const unit = entitled
    ? relevantGuidelineUnit(resource, input.selectedUnit, request.focusedQuery)
    : undefined;
  const passageMaximum = assuranceRecognized
    ? totalMaximum
    : Math.min(totalMaximum, UNASSURED_AGENT_SECTION_MAX_CHARACTERS);
  const passage = unit
    ? grant(
        resource.id,
        request.requestedRepresentation,
        relevantExcerpt(unit, request.focusedQuery, passageMaximum),
        unit.locator,
      )
    : undefined;
  // Reserve the requested evidence before spending the response budget on
  // generic context. Grants retain a reader-friendly context-first order.
  let remaining = totalMaximum - (passage?.content?.length ?? 0);

  const append = (
    representation: ContentGrant["representation"],
    content: string,
    locator?: ContentGrant["locator"],
  ) => {
    if (remaining < 1) return;
    const bounded = content.slice(0, remaining);
    grants.push(grant(resource.id, representation, bounded, locator));
    remaining -= bounded.length;
  };

  // Public context accompanies the requested passage only when the remaining
  // response budget permits it. The complete work never crosses this boundary.
  append("abstract", resource.abstract);
  if (assuranceRecognized || entitled) {
    append("summary", summary, summaryUnit?.locator);
  }
  if (passage) grants.push(passage);

  response.status = entitled && assuranceRecognized ? "ok" : "limited";
  if (response.rights) {
    response.rights.decision = "allow_with_limits";
    response.rights.limits = {
      maxCharacters: totalMaximum,
      maxSegments: grants.length,
    };
  }
  if (entitled) response.error = undefined;
  response.warnings = response.warnings?.filter(({ code }) => code !== "CONTENT_TRUNCATED");
  response.receipt.decision = entitled && assuranceRecognized ? "supplied" : "limited";

  response.grants = grants;
  return withBundleDigest(response);
}

function resourceMatchesSearchFilters(
  resource: SourceResource,
  request: KnowledgeSearchRequest,
): boolean {
  if (request.contentTypes?.length) {
    const mapped = resource.contentType === "conference_panel"
      ? "conference_material"
      : resource.contentType === "review"
        ? "other"
        : resource.contentType;
    if (!request.contentTypes.includes(mapped)) return false;
  }
  if (request.publishedAfter && resource.dates.published < request.publishedAfter) return false;
  if (request.status?.length && !request.status.includes(
    resource.status as (typeof request.status)[number],
  )) return false;
  return true;
}

export function createOpenInquiryApplication(
  options: OpenInquiryApplicationOptions = {},
): OpenInquiryApplication {
  const applicationOrigin = options.applicationOrigin ?? configuredApplicationOrigin();
  const budget = options.budget ?? createDemoRetrievalBudget();
  const now = options.now ?? (() => new Date());
  const createReceiptId = options.createReceiptId ?? (() => `oi_${randomUUID()}`);

  function receipt(
    provider: ServerProviderConfig,
    toolName: KnowledgeToolName,
    resourceIds: readonly string[],
    decision: "supplied" | "limited" | "denied" | "metadata_only",
    access?: AccessDecision,
    policyId?: string,
    returnedUnitDigest?: string,
  ) {
    return createSourceReceipt({
      seed: {
        receiptId: createReceiptId(),
        issuedAt: now().toISOString(),
        retention: "session",
        ...(returnedUnitDigest ? { returnedUnitDigest } : {}),
      },
      providerId: provider.profileId,
      toolName,
      resourceIds,
      ...(access ? { access } : {}),
      ...(policyId ? { policyId } : {}),
      decision,
    });
  }

  function genericError(
    provider: ServerProviderConfig,
    toolName: KnowledgeToolName,
    code: ProfileErrorCode,
    message: string,
    status: "denied" | "not_found" | "error" = "error",
    retryable = false,
    field?: string,
  ): KnowledgeResponse {
    return createResponseEnvelope({
      status,
      provider: providerIdentity(provider, applicationOrigin),
      receipt: receipt(provider, toolName, [], "denied"),
      error: { code, message, retryable, ...(field ? { field } : {}) },
    });
  }

  function resourceError(input: {
    provider: ServerProviderConfig;
    providerIdentity: ProviderIdentity;
    toolName: KnowledgeToolName;
    code: ProfileErrorCode;
    message: string;
    resource: ReturnType<typeof mapSourceResource>;
    access: AccessDecision;
    actions: ProviderAction[];
    policyId: string;
  }): KnowledgeResponse {
    return createResponseEnvelope({
      status: "denied",
      provider: input.providerIdentity,
      access: input.access,
      rights: rights(input.provider, input.policyId, "deny", ["display", "link"]),
      resources: [input.resource],
      receipt: receipt(
        input.provider,
        input.toolName,
        [input.resource.id],
        "denied",
        input.access,
        input.policyId,
      ),
      actions: input.actions,
      error: { code: input.code, message: input.message, retryable: false },
    });
  }

  function validateOrThrow(response: KnowledgeResponse): KnowledgeResponse {
    const errors = validateKnowledgeResponse(response);
    if (errors.length) throw new Error("Application produced a non-conforming profile response.");
    return response;
  }

  function describe(config: ServerProviderConfig, session: DemoSession): KnowledgeResponse {
    const access = providerAccess(config, session);
    const identity = providerIdentity(config, applicationOrigin);
    const resource = {
      id: `${config.id}-provider-profile`,
      type: "other",
      title: `${config.name} fictional provider profile`,
      authors: [{ name: config.name }],
      responsibleOrganization: config.name,
      canonicalUrl: identity.canonicalUrl,
      deepLink: identity.canonicalUrl,
      dates: { checked: "2026-08-26T12:00:00Z" },
      version: "OpenInquiry discussion draft 0.1 reference implementation",
      status: "current" as const,
    };
    const schemaUrl = trustedApplicationUrl(
      applicationOrigin,
      "/openinquiry/profile/0.1/schema",
    );
    const content = [
      config.description,
      `Collections: ${config.collections.join("; ")}.`,
      `Supported OpenInquiry 0.1 operations: ${config.supportedTools.join(", ")}.`,
      "Recommended evidence workflow: knowledge_search, knowledge_status, knowledge_retrieve, then knowledge_open.",
      "Use knowledge_access when recognized session access is in question and knowledge_resolve when the person needs a legitimate access path.",
      `Canonical profile schema: ${schemaUrl}.`,
      `Policy details: ${identity.policyUrl}.`,
      "This is a fictional demonstration and not a production identity, licensing, or clinical system.",
    ].join(" ");
    const policyId = `${config.id}-provider-description-v1`;
    const digest = sha256Digest(content);
    const response = createResponseEnvelope({
      status: "ok",
      provider: identity,
      access,
      rights: rights(config, policyId, "allow_with_limits", ["display", "link"], {
        maxCharacters: 900,
      }),
      resources: [resource],
      grants: [{
        resourceId: resource.id,
        representation: "summary",
        content,
        suppliedByProvider: true,
        contentDigest: digest,
      }],
      receipt: receipt(config, "knowledge_describe", [resource.id], "supplied", access, policyId, digest),
      actions: canonicalActions(config, [resource], applicationOrigin),
    });
    return {
      ...response,
      profile: {
        ...response.profile,
        schemaUrl,
        supportedVersions: [PROFILE_VERSION],
      },
    };
  }

  function access(config: ServerProviderConfig, session: DemoSession): KnowledgeResponse {
    const decision = providerAccess(config, session);
    return createResponseEnvelope({
      status: "ok",
      provider: providerIdentity(config, applicationOrigin),
      access: decision,
      receipt: receipt(config, "knowledge_access", [], "supplied", decision),
    });
  }

  function notFound(
    config: ServerProviderConfig,
    toolName: KnowledgeToolName,
  ): KnowledgeResponse {
    return genericError(
      config,
      toolName,
      "RESOURCE_NOT_FOUND",
      "No provider-issued resource matched the request.",
      "not_found",
    );
  }

  function search(
    config: ServerProviderConfig,
    request: KnowledgeSearchRequest,
    session: DemoSession,
  ): KnowledgeResponse {
    const limit = request.limit ?? 4;
    const queryTokenCount = searchTokens(request.query).length;
    if (queryTokenCount === 0) {
      return genericError(
        config,
        "knowledge_search",
        "QUERY_TOO_BROAD",
        "Use at least one specific topic term from the publication you want to find.",
        "error",
        true,
        "query",
      );
    }
    const minimumMatchedTokens = queryTokenCount >= 3 ? 2 : 1;
    const ranked = providerResources()
      .filter((resource) => resourceMatchesSearchFilters(resource, request))
      .map((resource) => rankResource(resource, request.query))
      .filter((candidate) => candidate.score > 0
        && candidate.matchedTokenCount >= minimumMatchedTokens)
      .sort((left, right) => right.score - left.score
        || left.resource.id.localeCompare(right.resource.id))
      .slice(0, limit);
    if (!ranked.length) return notFound(config, "knowledge_search");
    const resources = ranked.map(({ resource, selectedUnit }) =>
      mapSourceResource(resource, applicationOrigin, selectedUnit));
    const accessDecision = aggregateAccessDecisions(
      config,
      ranked.map(({ resource }) => accessDecisionForResource(config, resource, session)),
    );
    const policyId = `${config.id}-metadata-discovery-v1`;
    return createResponseEnvelope({
      status: "ok",
      provider: providerIdentity(config, applicationOrigin),
      access: accessDecision,
      rights: rights(config, policyId, "allow", ["display", "link"], {
        maxSegments: resources.length,
      }),
      resources,
      receipt: receipt(
        config,
        "knowledge_search",
        resources.map((resource) => resource.id),
        "metadata_only",
        accessDecision,
        policyId,
      ),
      actions: canonicalActions(config, resources, applicationOrigin),
      ...(integrityWarnings(resources).length ? { warnings: integrityWarnings(resources) } : {}),
    });
  }

  function retrievalUnit(
    resource: SourceResource,
    request: KnowledgeRetrieveRequest,
  ): SourceUnit | undefined {
    if (request.locator) return selectExactUnit(resource, request.locator);
    if (request.focusedQuery) {
      return rankResourceUnits(resource, request.focusedQuery)
        .find(({ score }) => score > 0)?.unit;
    }
    return bestResourceUnit(resource);
  }

  function applyReturnedDigest(response: KnowledgeResponse): KnowledgeResponse {
    return withBundleDigest(response);
  }

  function budgetDenied(
    config: ServerProviderConfig,
    response: KnowledgeResponse,
  ): KnowledgeResponse {
    const resource = response.resources?.[0];
    const accessDecision = response.access;
    const policyId = response.rights?.policyId ?? `${config.id}-demo-budget-v1`;
    if (!resource || !accessDecision || !response.actions) {
      return genericError(
        config,
        "knowledge_retrieve",
        "RATE_LIMITED",
        "The deterministic fictional-session retrieval budget has been reached.",
        "denied",
      );
    }
    return resourceError({
      provider: config,
      providerIdentity: response.provider,
      toolName: "knowledge_retrieve",
      code: "RATE_LIMITED",
      message: "The deterministic fictional-session retrieval budget blocked a repeated, overlapping, or cumulative content request. Start a new explicit demo session to reset this demonstration control.",
      resource,
      access: accessDecision,
      actions: response.actions,
      policyId,
    });
  }

  function retrieve(
    config: ServerProviderConfig,
    request: KnowledgeRetrieveRequest,
    session: DemoSession,
  ): KnowledgeResponse {
    const source = resourceById(request.resourceId);
    if (!source) return notFound(config, "knowledge_retrieve");
    const unit = retrievalUnit(source, request);
    const passageRequested = request.requestedRepresentation === "recommendation"
      || request.requestedRepresentation === "quotation"
      || request.requestedRepresentation === "full_text"
      || request.requestedRepresentation === "figure_description"
      || request.requestedRepresentation === "transcript_segment";
    if ((request.locator || passageRequested) && !unit) {
      return genericError(
        config,
        "knowledge_retrieve",
        "RESOURCE_NOT_FOUND",
        request.locator
          ? "No provider-issued source unit matched the locator."
          : "No relevant source unit matched the focused query.",
        "not_found",
        false,
        request.locator ? "locator" : "focusedQuery",
      );
    }
    const mapped = mapSourceResource(source, applicationOrigin, unit);
    const trustedAccess = retrievalAccess(config, source, session);
    const policy = retrievalPolicy(
      config,
      source,
      session,
      applicationOrigin,
      request.requestedRepresentation,
    );

    if (source.status === "retracted" || source.status === "withdrawn") {
      const accessDecision: AccessDecision = {
        state: trustedAccess.state,
        basis: trustedAccess.basis,
        ...(trustedAccess.basisLabel ? { basisLabel: trustedAccess.basisLabel } : {}),
        decidedBy: config.profileId,
      };
      return resourceError({
        provider: config,
        providerIdentity: providerIdentity(config, applicationOrigin),
        toolName: "knowledge_retrieve",
        code: source.status === "withdrawn" ? "RESOURCE_WITHDRAWN" : "RESOURCE_RETRACTED",
        message: source.status === "withdrawn"
          ? "The provider exposes only the withdrawn record and notice through search/status/open; retrieval returns no content grant."
          : "The provider exposes only the retracted record and notice through search/status/open; retrieval returns no content grant.",
        resource: mapped,
        access: accessDecision,
        actions: canonicalActions(config, [mapped], applicationOrigin, source.ctaPathways),
        policyId: source.access.policyId,
      });
    }

    const evaluated = journalGuidelineBundle({
      response: applyReturnedDigest(evaluateRetrieval({
      request,
      provider: providerIdentity(config, applicationOrigin),
      resource: mapped,
      policy,
      trustedAccess,
      availableContent: availableContent(source, unit),
      receipt: {
        receiptId: createReceiptId(),
        issuedAt: now().toISOString(),
        retention: "session",
      },
      })),
      resource: source,
      selectedUnit: unit,
      request,
      entitled: trustedAccess.state === "entitled",
      assuranceRecognized: proposedAssuranceIsRecognized(config, session),
    });
    const contentGrants = evaluated.grants?.filter(
      (candidate): candidate is ContentGrant & { content: string } =>
        typeof candidate.content === "string",
    ) ?? [];
    if (contentGrants.length === 0 || evaluated.status === "denied") return evaluated;

    if (isJournalGuideline(source) && trustedAccess.state !== "entitled") return evaluated;

    const protectedContent = isJournalGuideline(source)
      ? contentGrants
          .filter(({ representation }) =>
            representation === "full_text"
            || representation === "quotation"
            || representation === "recommendation")
          .map(({ content }) => content)
          .join("\n")
      : contentGrants[0].content;
    if (!protectedContent) return evaluated;

    const decision = budget.checkAndRecord({
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
      providerId: config.profileId,
      resourceId: source.id,
      unitId: [
        unit?.id ?? `${source.id}-default-unit`,
        ...contentGrants.map(({ representation }) => representation),
        sha256Digest(protectedContent).slice("sha256:".length, "sha256:".length + 16),
      ].join(":"),
      content: protectedContent,
      returnedUnitDigest: sha256Digest(protectedContent),
      ...(isJournalGuideline(source)
        ? proposedAssuranceIsRecognized(config, session)
          ? {
              resourceCharacterLimit: DEMO_FULL_TEXT_PROVIDER_BUDGET_CHARACTERS,
              providerCharacterLimit: DEMO_FULL_TEXT_PROVIDER_BUDGET_CHARACTERS,
              resourceUnitLimit: 3,
            }
          : {
              resourceCharacterLimit: UNASSURED_AGENT_SECTION_MAX_CHARACTERS,
              resourceUnitLimit: 1,
            }
        : {}),
    });
    return decision.allowed ? evaluated : budgetDenied(config, evaluated);
  }

  function resolve(
    config: ServerProviderConfig,
    request: KnowledgeResolveRequest,
    session: DemoSession,
  ): KnowledgeResponse {
    const source = resourceById(request.resourceId);
    if (!source) return notFound(config, "knowledge_resolve");
    const unit = bestResourceUnit(source);
    const resource = mapSourceResource(source, applicationOrigin, unit);
    const trusted = retrievalAccess(config, source, session);
    const entitled = trusted.state === "public" || trusted.state === "entitled";
    const accessDecision: AccessDecision = {
      state: trusted.state,
      basis: trusted.basis,
      ...(trusted.basisLabel ? { basisLabel: trusted.basisLabel } : {}),
      decidedBy: config.profileId,
    };
    const policyId = source.access.policyId;
    return createResponseEnvelope({
      status: entitled ? "ok" : "limited",
      provider: providerIdentity(config, applicationOrigin),
      access: accessDecision,
      rights: rights(config, policyId, entitled ? "allow" : "allow_with_limits", ["display", "link"]),
      resources: [resource],
      grants: [{ resourceId: resource.id, representation: "link_only", suppliedByProvider: true }],
      receipt: receipt(config, "knowledge_resolve", [resource.id], "metadata_only", accessDecision, policyId),
      actions: canonicalActions(config, [resource], applicationOrigin, source.ctaPathways),
      ...(integrityWarnings([resource]).length ? { warnings: integrityWarnings([resource]) } : {}),
      ...(!entitled
        ? { error: { code: "ENTITLEMENT_REQUIRED" as const, message: "The provider found the resource but this fictional session has only the declared public pathway." } }
        : {}),
    });
  }

  function open(
    config: ServerProviderConfig,
    request: KnowledgeOpenRequest,
    session: DemoSession,
  ): KnowledgeResponse {
    const source = resourceById(request.resourceId);
    if (!source) return notFound(config, "knowledge_open");
    const unit = request.locator
      ? selectExactUnit(source, request.locator)
      : bestResourceUnit(source);
    if (request.locator && !unit) return notFound(config, "knowledge_open");
    const resource = mapSourceResource(source, applicationOrigin, unit);
    const accessDecision = accessDecisionForResource(config, source, session);
    const policyId = `${source.access.policyId}-canonical-open`;
    return createResponseEnvelope({
      status: "ok",
      provider: providerIdentity(config, applicationOrigin),
      access: accessDecision,
      rights: rights(config, policyId, "allow", ["display", "link"]),
      resources: [resource],
      grants: [{ resourceId: resource.id, representation: "link_only", suppliedByProvider: true }],
      receipt: receipt(config, "knowledge_open", [resource.id], "supplied", accessDecision, policyId),
      actions: canonicalActions(config, [resource], applicationOrigin),
      ...(integrityWarnings([resource]).length ? { warnings: integrityWarnings([resource]) } : {}),
    });
  }

  function status(
    config: ServerProviderConfig,
    request: KnowledgeStatusRequest,
    session: DemoSession,
  ): KnowledgeResponse {
    const sources = request.resourceIds.map(resourceById);
    if (sources.some((source) => !source)) return notFound(config, "knowledge_status");
    const resources = sources
      .filter((source): source is SourceResource => Boolean(source))
      .map((source) => mapSourceResource(source, applicationOrigin));
    const accessDecision = aggregateAccessDecisions(
      config,
      sources
        .filter((source): source is SourceResource => Boolean(source))
        .map((source) => accessDecisionForResource(config, source, session)),
    );
    const policyId = `${config.id}-publication-status-v1`;
    return createResponseEnvelope({
      status: "ok",
      provider: providerIdentity(config, applicationOrigin),
      access: accessDecision,
      rights: rights(config, policyId, "allow", ["display", "link"]),
      resources,
      receipt: receipt(config, "knowledge_status", resources.map((resource) => resource.id), "metadata_only", accessDecision, policyId),
      actions: canonicalActions(config, resources, applicationOrigin),
      ...(integrityWarnings(resources).length ? { warnings: integrityWarnings(resources) } : {}),
    });
  }

  function executeValidated(
    config: ServerProviderConfig,
    toolName: KnowledgeToolName,
    input: Readonly<Record<string, unknown>>,
    session: DemoSession,
  ): KnowledgeResponse {
    switch (toolName) {
      case "knowledge_describe":
        return describe(config, session);
      case "knowledge_access":
        return access(config, session);
      case "knowledge_search":
        return search(config, input as unknown as KnowledgeSearchRequest, session);
      case "knowledge_retrieve":
        return retrieve(config, input as unknown as KnowledgeRetrieveRequest, session);
      case "knowledge_resolve":
        return resolve(config, input as unknown as KnowledgeResolveRequest, session);
      case "knowledge_open":
        return open(config, input as unknown as KnowledgeOpenRequest, session);
      case "knowledge_status":
        return status(config, input as unknown as KnowledgeStatusRequest, session);
    }
  }

  async function execute(execution: OpenInquiryExecution): Promise<KnowledgeResponse> {
    const config = SERVER_PROVIDER_CONFIG[execution.providerRoute];
    try {
      if (execution.signal?.aborted) throw new Error("Tool execution was cancelled.");
      const validation = validateKnowledgeToolInput(
        execution.toolName as RuntimeKnowledgeToolName,
        execution.input,
      );
      if (!validation.ok) {
        return validateOrThrow(genericError(
          config,
          execution.toolName,
          validation.failure.code,
          validation.failure.message,
          "error",
          validation.failure.retryable,
          validation.failure.issues?.[0]?.path,
        ));
      }
      if (!config.supportedTools.includes(execution.toolName)) {
        return validateOrThrow(genericError(
          config,
          execution.toolName,
          "USE_NOT_PERMITTED",
          "This provider does not expose that operation.",
          "denied",
        ));
      }
      return validateOrThrow(
        executeValidated(config, execution.toolName, validation.value, execution.session),
      );
    } catch {
      return genericError(
        config,
        execution.toolName,
        "PROVIDER_UNAVAILABLE",
        "The fictional provider could not complete this operation. No request content or internal diagnostic was returned.",
        "error",
        true,
      );
    }
  }

  return Object.freeze({
    applicationOrigin,
    execute,
    createBoundaryError(input: BoundaryErrorInput): KnowledgeResponse {
      return genericError(
        SERVER_PROVIDER_CONFIG[input.providerRoute],
        input.toolName,
        input.code,
        input.message,
        input.status,
        input.retryable,
        input.field,
      );
    },
  });
}

export function isKnowledgeToolName(value: string): value is KnowledgeToolName {
  return ([
    "knowledge_describe",
    "knowledge_access",
    "knowledge_search",
    "knowledge_retrieve",
    "knowledge_resolve",
    "knowledge_open",
    "knowledge_status",
  ] as readonly string[]).includes(value);
}

export function isProfileRequestContext(value: unknown): value is KnowledgeRequestContext {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && (value as { profileVersion?: unknown }).profileVersion === PROFILE_VERSION;
}

export { providerConfigFor };

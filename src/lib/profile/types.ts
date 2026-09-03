/**
 * OpenInquiry Publisher Knowledge Access Profile 0.1.
 *
 * These types describe the interoperable provider boundary. They do not model
 * authentication credentials or allow a client to assert an entitlement.
 */

export const PROFILE_NAME = "openinquiry.publisher-knowledge-access" as const;
export const PROFILE_VERSION = "0.1" as const;

export type ProfileVersion = typeof PROFILE_VERSION;
export type ProviderRole =
  | "publisher"
  | "society"
  | "library"
  | "repository"
  | "other";

export type RequestedUse =
  | "discover"
  | "link"
  | "quote"
  | "summarize"
  | "compare";

export type ContentType =
  | "journal_article"
  | "book_chapter"
  | "guideline"
  | "consensus_statement"
  | "video"
  | "transcript"
  | "conference_material"
  | "other";

export type ResourceStatus =
  | "current"
  | "updated"
  | "corrected"
  | "retracted"
  | "withdrawn"
  | "unknown";

export type ContentRepresentation =
  | "metadata"
  | "abstract"
  | "summary"
  | "full_text"
  | "recommendation"
  | "quotation"
  | "figure_description"
  | "transcript_segment"
  | "link_only";

export interface KnowledgeRequestContext {
  profileVersion: ProfileVersion;
  /** Opaque correlation value only; never a prompt, query, or user identity. */
  requestId?: string;
}

/** Discovery may omit a version so a caller can learn the current contract. */
export interface KnowledgeDescribeRequest {
  profileVersion?: ProfileVersion;
  /** Opaque correlation value only; never a prompt, query, or user identity. */
  requestId?: string;
}
export type KnowledgeAccessRequest = KnowledgeRequestContext;

export interface KnowledgeSearchRequest extends KnowledgeRequestContext {
  query: string;
  contentTypes?: ContentType[];
  publishedAfter?: string;
  status?: Array<Extract<ResourceStatus, "current" | "updated" | "corrected" | "retracted" | "withdrawn">>;
  limit?: number;
}

export interface ResourceLocator {
  sectionTitle?: string;
  sectionId?: string;
  page?: string;
  figureId?: string;
  timestampSeconds?: number;
  timestampEndSeconds?: number;
  timestampLabel?: string;
}

export interface KnowledgeRetrieveRequest extends KnowledgeRequestContext {
  requestedUse?: RequestedUse[];
  resourceId: string;
  /** A provider-issued locator may be passed through unchanged from discovery. */
  locator?: ResourceLocator;
  focusedQuery?: string;
  requestedRepresentation: Exclude<ContentRepresentation, "link_only">;
  maxCharacters?: number;
}

export interface KnowledgeResolveRequest extends KnowledgeRequestContext {
  resourceId: string;
}

export interface KnowledgeOpenRequest extends KnowledgeRequestContext {
  resourceId: string;
  /** A provider-issued locator may be passed through unchanged from discovery. */
  locator?: ResourceLocator;
}

export interface KnowledgeStatusRequest extends KnowledgeRequestContext {
  resourceIds: string[];
}

export interface ProviderIdentity {
  id: string;
  name: string;
  role: ProviderRole;
  canonicalUrl: string;
  /** Required when this response provider is not the rights holder. */
  rightsHolderName?: string;
  policyUrl?: string;
}

export interface ResourceAuthor {
  name: string;
  identifier?: string;
}

export interface KnowledgeResource {
  id: string;
  type: ContentType | string;
  title: string;
  authors: ResourceAuthor[];
  responsibleOrganization?: string;
  containerTitle?: string;
  identifiers?: Array<{ scheme: string; value: string }>;
  canonicalUrl: string;
  deepLink?: string;
  locator?: ResourceLocator;
  dates: {
    /** RFC 3339 full-date (`YYYY-MM-DD`). */
    published?: string;
    /** RFC 3339 full-date (`YYYY-MM-DD`). */
    updated?: string;
    /** RFC 3339 date-time with a UTC offset; the instant at which status was checked. */
    checked?: string;
  };
  version?: string;
  status: ResourceStatus;
  statusNote?: string;
  statusUrl?: string;
}

export type AccessState =
  | "public"
  | "entitled"
  | "limited"
  | "not_entitled"
  | "unknown";

export type AccessBasis =
  | "open_access"
  | "public_web"
  | "personal_subscription"
  | "society_membership"
  | "institutional_license"
  | "library_resolution"
  | "demo_session"
  | "unknown";

export interface AccessDecision {
  state: AccessState;
  basis: AccessBasis;
  basisLabel?: string;
  decidedBy: string;
  /** RFC 3339 date-time with a UTC offset. */
  validUntil?: string;
}

export type AllowedUse = "display" | "link" | "quote" | "summarize" | "compare";
export type ProhibitedUse =
  | "bulk_export"
  | "redistribute"
  | "persistent_storage"
  | "model_training";

export interface RightsDecision {
  policyId: string;
  decision: "allow" | "allow_with_limits" | "deny";
  /** What the provider permits; not evidence that downstream behavior complied. */
  allowedUses: AllowedUse[];
  prohibitedUses?: ProhibitedUse[];
  limits?: {
    maxCharacters?: number;
    maxSegments?: number;
    /** RFC 3339 date-time with a UTC offset. */
    expiresAt?: string;
  };
  attribution: {
    required: boolean;
    text?: string;
    mustLinkToCanonical?: boolean;
  };
  requestedHandling?: {
    retention?: "transient_only" | "provider_unspecified";
    training?: "not_permitted" | "provider_unspecified";
    /** 0.1 declares handling requests but cannot attest to downstream compliance. */
    verification: "not_verified_by_webmcp";
  };
  policyUrl?: string;
}

export interface ContentGrant {
  resourceId: string;
  representation: ContentRepresentation;
  content?: string;
  locator?: ResourceLocator;
  suppliedByProvider: true;
  /** Digest of only the returned unit, never the complete underlying work. */
  contentDigest?: string;
}

export type ProviderActionType =
  | "open"
  | "deep_link"
  | "sign_in"
  | "join"
  | "subscribe"
  | "institutional_access"
  | "purchase"
  | "contact_library";

export interface ProviderAction {
  type: ProviderActionType;
  label: string;
  url: string;
  providerId: string;
}

export type ProfileErrorCode =
  | "INVALID_REQUEST"
  | "ENTITLEMENT_REQUIRED"
  | "USE_NOT_PERMITTED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_RETRACTED"
  | "RESOURCE_WITHDRAWN"
  | "QUERY_TOO_BROAD"
  | "REQUEST_TOO_LARGE"
  | "SENSITIVE_QUERY_REJECTED"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROFILE_VERSION_UNSUPPORTED";

export interface ProfileError {
  code: ProfileErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

export interface ProfileWarning {
  code: "RESOURCE_CORRECTED" | "RESOURCE_UPDATED" | "STATUS_UNKNOWN" | "CONTENT_TRUNCATED";
  message: string;
}

export interface SourceReceipt {
  receiptId: string;
  /** RFC 3339 date-time with a UTC offset. */
  issuedAt: string;
  providerId: string;
  toolName: KnowledgeToolName;
  resourceIds: string[];
  accessState?: AccessState;
  accessBasis?: AccessBasis;
  policyId?: string;
  decision: "supplied" | "limited" | "denied" | "metadata_only";
  returnedUnitDigest?: string;
  retention: "session" | "provider_policy";
}

export type KnowledgeToolName =
  | "knowledge_describe"
  | "knowledge_access"
  | "knowledge_search"
  | "knowledge_retrieve"
  | "knowledge_resolve"
  | "knowledge_open"
  | "knowledge_status";

export type KnowledgeResponseStatus = "ok" | "limited" | "denied" | "not_found" | "error";

export interface KnowledgeResponse {
  profile: {
    name: typeof PROFILE_NAME;
    version: ProfileVersion;
    /** Present on discovery responses so clients can inspect the canonical contract. */
    schemaUrl?: string;
    /** Present on discovery responses; currently contains only version 0.1. */
    supportedVersions?: ProfileVersion[];
  };
  status: KnowledgeResponseStatus;
  provider: ProviderIdentity;
  access?: AccessDecision;
  rights?: RightsDecision;
  resources?: KnowledgeResource[];
  grants?: ContentGrant[];
  receipt: SourceReceipt;
  actions?: ProviderAction[];
  warnings?: ProfileWarning[];
  error?: ProfileError;
}

/** Trusted provider-side context. This is deliberately absent from every request type. */
export interface TrustedAccessContext {
  providerId: string;
  state: AccessState;
  basis: AccessBasis;
  basisLabel?: string;
  validUntil?: string;
  entitlementKeys: readonly string[];
}

export interface ResourcePolicy {
  policyId: string;
  providerId: string;
  policyUrl?: string;
  requiredEntitlement?: string;
  publicAccessBasis?: Extract<AccessBasis, "open_access" | "public_web">;
  publicRepresentations: readonly ContentRepresentation[];
  entitledRepresentations: readonly ContentRepresentation[];
  fallbackRepresentation?: Exclude<ContentRepresentation, "link_only" | "metadata">;
  allowedUses: readonly AllowedUse[];
  /** Optional rights narrowing for the exact unit that is returned. */
  representationAllowedUses?: Partial<
    Record<ContentRepresentation, readonly AllowedUse[]>
  >;
  prohibitedUses?: readonly ProhibitedUse[];
  maxCharacters?: number;
  maxSegments?: number;
  attribution: RightsDecision["attribution"];
  requestedHandling?: RightsDecision["requestedHandling"];
  accessActions?: readonly ProviderAction[];
}

export interface ReceiptSeed {
  receiptId: string;
  issuedAt: string;
  retention?: SourceReceipt["retention"];
  returnedUnitDigest?: string;
}

export interface RetrievalEvaluationInput {
  request: KnowledgeRetrieveRequest;
  provider: ProviderIdentity;
  resource: KnowledgeResource;
  policy: ResourcePolicy;
  /** Supplied only by trusted server/application state, never parsed from the request. */
  trustedAccess: TrustedAccessContext;
  /** Provider-owned units keyed by representation. */
  availableContent: Partial<Record<ContentRepresentation, string>>;
  contentDigests?: Partial<Record<ContentRepresentation, string>>;
  receipt: ReceiptSeed;
}

export const ODRL_CONCEPTUAL_MAPPING = {
  profileStatus: "explicit-conceptual-mapping-only",
  odrlConformanceClaimed: false,
  resource: "Asset",
  providerOrRightsHolder: "Assigner party",
  allowedUse: "Permission/action",
  prohibitedUse: "Prohibition/action",
  requiredAttribution: "Duty",
  characterTimeOrAccessLimit: "Constraint",
  policyIdOrUrl: "Policy identifier/reference",
} as const;

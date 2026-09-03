/**
 * Local source-data model for the fictional Journal of Guidelines demo.
 *
 * This intentionally describes content and provider facts, rather than the
 * OpenInquiry response envelope. The profile/policy lane turns these facts
 * into rights-aware `knowledge_*` responses.
 */

export type ProviderId = "journal";

export type ProviderRole = "publisher";

export type ContentType =
  | "journal_article"
  | "book_chapter"
  | "review"
  | "guideline"
  | "consensus_statement"
  | "video"
  | "conference_panel"
  | "holding";

export type ResourceStatus =
  | "current"
  | "updated"
  | "corrected"
  | "retracted"
  | "withdrawn";

export type Representation =
  | "metadata"
  | "abstract"
  | "summary"
  | "full_text"
  | "recommendation"
  | "quotation"
  | "transcript_segment"
  | "link_only";

export type PersonaKey = "guest" | "subscriber";

export type AccessState = "public" | "entitled" | "limited" | "not_entitled";

export type AccessBasis =
  | "open_access"
  | "public_web"
  | "society_membership"
  | "institutional_license"
  | "library_resolution"
  | "demo_session";

export type ActionType =
  | "open"
  | "deep_link"
  | "sign_in"
  | "join"
  | "subscribe"
  | "institutional_access"
  | "purchase"
  | "contact_library";

export interface Author {
  name: string;
  role?: "author" | "editor" | "speaker" | "panelist" | "organization";
}

export interface ProviderActionFixture {
  type: ActionType;
  label: string;
  path: string;
  providerId: ProviderId;
}

export interface AccessGrantFixture {
  state: AccessState;
  basis: AccessBasis;
  basisLabel: string;
  representations: Representation[];
  maxCharacters?: number;
  requiredEntitlements?: string[];
  actions: ProviderActionFixture[];
}

/**
 * The policy engine must derive a persona from its trusted session. This
 * fixture only states the expected result for the two public demo personas.
 */
export interface ResourceAccessPolicy {
  policyId: string;
  rightsDecision: "allow" | "allow_with_limits" | "deny";
  allowedUses: Array<"display" | "link" | "quote" | "summarize" | "compare">;
  prohibitedUses: Array<
    "bulk_export" | "redistribute" | "persistent_storage" | "model_training"
  >;
  attributionText: string;
  mustLinkToCanonical: true;
  requestedHandling: {
    retention: "transient_only" | "provider_unspecified";
    training: "not_permitted" | "provider_unspecified";
    verification: "not_verified_by_webmcp";
  };
  byPersona: Record<PersonaKey, AccessGrantFixture>;
}

export interface SourceLocator {
  sectionId?: string;
  sectionTitle?: string;
  page?: string;
  timestampSeconds?: number;
  timestampLabel?: string;
}

export interface ContentSection {
  id: string;
  heading: string;
  locator: SourceLocator;
  deepLinkPath: string;
  text: string;
  keywords: string[];
}

export interface SyntheticResource {
  id: string;
  providerId: ProviderId;
  rightsHolderName: string;
  contentType: Exclude<ContentType, "holding">;
  title: string;
  authors: Author[];
  responsibleOrganization?: string;
  containerTitle?: string;
  identifiers: Array<{ scheme: "doi" | "isbn" | "internal"; value: string }>;
  dates: {
    published: string;
    updated?: string;
    checked: string;
  };
  version: string;
  status: ResourceStatus;
  statusNote?: string;
  statusPath?: string;
  canonicalPath: string;
  deepLinkPath: string;
  abstract: string;
  /** Provider-authored overview for agent use; distinct from the publication abstract. */
  publisherSummary?: string;
  sections: ContentSection[];
  keywords: string[];
  access: ResourceAccessPolicy;
  ctaPathways: ProviderActionFixture[];
  license: "CC-BY-4.0";
  syntheticNotice: string;
}

export interface VideoTranscriptSegment extends ContentSection {
  startSeconds: number;
  endSeconds: number;
}

export interface SyntheticVideo
  extends Omit<SyntheticResource, "sections" | "contentType"> {
  contentType: "video" | "conference_panel";
  durationSeconds: number;
  transcriptSegments: VideoTranscriptSegment[];
}

export interface LibraryHolding {
  id: string;
  providerId: ProviderId;
  providerName: string;
  providerRole: ProviderRole;
  rightsHolderName: string;
  resourceId?: string;
  title: string;
  contentType: ContentType;
  authors: Author[];
  publicationDate: string;
  canonicalPath: string;
  providerDeepLinkPath: string;
  status: ResourceStatus;
  availability: Record<PersonaKey, {
    state: "available" | "unavailable" | "separate_relationship_required";
    accessBasis?: AccessBasis;
    accessLabel: string;
    routeId?: string;
  }>;
  accessRoutes: ProviderActionFixture[];
  license: "CC-BY-4.0";
  syntheticNotice: string;
}

export interface DemoPersona {
  key: PersonaKey;
  displayName: string;
  roleLabel: string;
  affiliations: string[];
  memberships: string[];
  entitlements: string[];
  isSynthetic: true;
}

export interface ProviderFixture {
  id: ProviderId;
  name: string;
  role: ProviderRole;
  tagline: string;
  route: "/demo";
  canonicalPath: string;
  policyPath: string;
  description: string;
  contentOwnership: string;
  license: "CC-BY-4.0";
  syntheticNotice: string;
}

export interface PublicationIntegrityFixture {
  resourceId: string;
  status: Extract<ResourceStatus, "corrected" | "retracted" | "withdrawn">;
  statusPath: string;
  summary: string;
  behavior: "content_with_status" | "no_content_grant";
}

export interface CorpusValidationIssue {
  code: string;
  message: string;
  resourceId?: string;
}

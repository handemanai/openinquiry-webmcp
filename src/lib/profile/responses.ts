import {
  PROFILE_NAME,
  PROFILE_VERSION,
  type KnowledgeResponse,
  type KnowledgeResponseStatus,
  type ProfileError,
  type ProviderAction,
  type ProviderIdentity,
  type SourceReceipt,
} from "./types.ts";

export type ResponseEnvelopeFields = Omit<KnowledgeResponse, "profile">;

/** Adds the immutable profile identity to any provider result. */
export function createResponseEnvelope(fields: ResponseEnvelopeFields): KnowledgeResponse {
  return {
    profile: { name: PROFILE_NAME, version: PROFILE_VERSION },
    ...fields,
  };
}

export interface ProviderErrorResponseInput {
  status: Extract<KnowledgeResponseStatus, "denied" | "not_found" | "error">;
  provider: ProviderIdentity;
  receipt: SourceReceipt;
  error: ProfileError;
  actions?: ProviderAction[];
}

/**
 * Minimal common envelope for failures outside resource retrieval, such as an
 * unsupported profile version or provider outage. The caller still supplies a
 * privacy-minimized receipt; this helper never accepts raw request text.
 */
export function createProviderErrorResponse(
  input: ProviderErrorResponseInput,
): KnowledgeResponse {
  return createResponseEnvelope({
    status: input.status,
    provider: input.provider,
    receipt: input.receipt,
    error: input.error,
    ...(input.actions ? { actions: input.actions.map((action) => ({ ...action })) } : {}),
  });
}

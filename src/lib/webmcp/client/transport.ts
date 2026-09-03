// SPDX-License-Identifier: Apache-2.0

import {
  createProviderErrorResponse,
  createSourceReceipt,
  validateKnowledgeResponse,
  type KnowledgeResponse,
  type ProfileErrorCode,
  type ProviderIdentity,
} from "../../profile/index.ts";
import {
  createKnowledgeProviderAdapter,
  validateKnowledgeToolInput,
  type KnowledgeProviderAdapter,
  type KnowledgeToolName,
  type ProfileToolInvocation,
  type ToolBoundaryFailure,
} from "../index.ts";
import type { KnowledgeActivityDelivery } from "./visible-result.ts";
import {
  CLIENT_PROVIDER_DEFINITIONS,
  clientProviderDefinition,
  createClientProviderIdentity,
  type OpenInquiryProviderId,
} from "./provider-config.ts";

export type KnowledgeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface KnowledgeTransportResultContext {
  providerId: OpenInquiryProviderId;
  toolName: KnowledgeToolName;
  input?: Readonly<Record<string, unknown>>;
  response: KnowledgeResponse;
  delivery: KnowledgeActivityDelivery;
}

export interface CreateSameOriginKnowledgeAdapterOptions {
  providerId: OpenInquiryProviderId;
  origin: string;
  fetch?: KnowledgeFetch;
  now?: () => Date;
  createReceiptId?: () => string;
  onResult?: (
    context: Readonly<KnowledgeTransportResultContext>,
  ) => Promise<void> | void;
}

const FORBIDDEN_AUTHORITY_FIELDS = new Set([
  "persona",
  "entitlement",
  "entitlements",
  "accessbasis",
  "accessstate",
  "accessdecision",
  "authorization",
  "authentication",
  "auth",
  "token",
  "accesstoken",
  "credential",
  "credentials",
  "cookie",
  "conversation",
  "rawconversation",
  "messages",
  "prompt",
  "url",
  "href",
  "destination",
  "policydecision",
  "rightsdecision",
]);

/**
 * Creates the page adapter for the provider application boundary. The endpoint
 * path identifies provider/tool; the JSON body is only the validated profile
 * input and never carries client-asserted authority.
 */
export function createSameOriginKnowledgeProviderAdapter(
  options: CreateSameOriginKnowledgeAdapterOptions,
): KnowledgeProviderAdapter {
  const definition = clientProviderDefinition(options.providerId);
  const provider = createClientProviderIdentity(options.providerId, options.origin);
  const fetchImplementation = options.fetch ?? globalThis.fetch?.bind(globalThis);
  const now = options.now ?? (() => new Date());
  const createReceiptId = options.createReceiptId ?? defaultClientReceiptId;

  const emit = async (
    toolName: KnowledgeToolName,
    response: KnowledgeResponse,
    delivery: KnowledgeActivityDelivery,
    input?: Readonly<Record<string, unknown>>,
  ) => {
    await options.onResult?.(
      Object.freeze({
        providerId: options.providerId,
        toolName,
        ...(input ? { input } : {}),
        response,
        delivery,
      }),
    );
    return response;
  };

  return createKnowledgeProviderAdapter({
    provider,
    supportedTools: definition.supportedTools,
    // Source-bearing discovery and retrieval results must remain explicitly
    // untrusted to the agent even when they came from the current provider.
    untrustedOutputTools: ["knowledge_search", "knowledge_retrieve"],
    service: {
      execute: async (invocation: ProfileToolInvocation) => {
        const validation = validateKnowledgeToolInput(
          invocation.toolName,
          invocation.input,
        );
        const containsForbiddenField = containsForbiddenAuthorityField(invocation.input);
        if (!validation.ok || containsForbiddenField) {
          const response = createMinimizedClientError({
            provider,
            toolName: invocation.toolName,
            code: containsForbiddenField
              ? "USE_NOT_PERMITTED"
              : validation.ok
                ? "INVALID_REQUEST"
                : validation.failure.code,
            message: containsForbiddenField
              ? "The request contains a field that cannot be accepted at the client boundary."
              : validation.ok
                ? "The request does not match this tool's input contract."
                : validation.failure.message,
            ...(!containsForbiddenField && !validation.ok && validation.failure.issues?.[0]?.path
              ? { field: validation.failure.issues[0].path }
              : {}),
            retryable: true,
            now,
            createReceiptId,
          });
          return emit(invocation.toolName, response, "client_boundary");
        }

        if (!fetchImplementation) {
          return emit(
            invocation.toolName,
            createMinimizedClientError({
              provider,
              toolName: invocation.toolName,
              code: "PROVIDER_UNAVAILABLE",
              message: "The provider request transport is unavailable.",
              retryable: true,
              now,
              createReceiptId,
            }),
            "transport_failure",
          );
        }

        let httpResponse: Response;
        try {
          httpResponse = await fetchImplementation(
            endpointFor(options.providerId, invocation.toolName),
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "content-type": "application/json",
              },
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
              referrerPolicy: "same-origin",
              body: JSON.stringify(validation.value),
              signal: invocation.signal,
            },
          );
        } catch (error: unknown) {
          if (invocation.signal.aborted || isAbortError(error)) throw error;
          return emit(
            invocation.toolName,
            createMinimizedClientError({
              provider,
              toolName: invocation.toolName,
              code: "PROVIDER_UNAVAILABLE",
              message: "The provider could not complete this request.",
              retryable: true,
              now,
              createReceiptId,
            }),
            "transport_failure",
          );
        }

        if (!httpResponse.ok) {
          return emit(
            invocation.toolName,
            createMinimizedClientError({
              provider,
              toolName: invocation.toolName,
              code:
                httpResponse.status === 429
                  ? "RATE_LIMITED"
                  : "PROVIDER_UNAVAILABLE",
              message:
                httpResponse.status === 429
                  ? "The provider is temporarily rate limited."
                  : "The provider could not complete this request.",
              retryable: true,
              now,
              createReceiptId,
            }),
            "transport_failure",
          );
        }

        let value: unknown;
        try {
          value = await httpResponse.json();
        } catch {
          value = undefined;
        }

        const profileErrors = validateKnowledgeResponse(value);
        const responseMatchesInvocation =
          profileErrors.length === 0 &&
          responseMatchesExpectedProvider(
            value as KnowledgeResponse,
            provider,
            invocation.toolName,
          );
        if (!responseMatchesInvocation) {
          return emit(
            invocation.toolName,
            createMinimizedClientError({
              provider,
              toolName: invocation.toolName,
              code: "PROVIDER_UNAVAILABLE",
              message: "The provider returned an invalid profile response.",
              retryable: true,
              now,
              createReceiptId,
            }),
            "transport_failure",
          );
        }

        const validatedResponse = value as KnowledgeResponse;
        if (validatedResponse.status === "error") {
          return emit(
            invocation.toolName,
            createMinimizedClientError({
              provider,
              toolName: invocation.toolName,
              code: validatedResponse.error?.code ?? "PROVIDER_UNAVAILABLE",
              message: "The provider could not complete this request.",
              retryable: validatedResponse.error?.retryable ?? true,
              now,
              createReceiptId,
            }),
            "validated_provider_response",
          );
        }
        const safeResponse = minimizeEmbeddedProfileError(validatedResponse);

        return emit(
          invocation.toolName,
          safeResponse,
          "validated_provider_response",
          validation.value,
        );
      },
      toErrorResponse: async ({ failure }) => {
        const response = boundaryFailureResponse(
          provider,
          failure,
          now,
          createReceiptId,
        );
        return emit(failure.toolName, response, "client_boundary");
      },
    },
  });
}

export function endpointFor(
  providerId: OpenInquiryProviderId,
  toolName: KnowledgeToolName,
): string {
  const routeKey = CLIENT_PROVIDER_DEFINITIONS[providerId].id;
  return `/api/openinquiry/${routeKey}/tools/${toolName}`;
}

export function containsForbiddenAuthorityField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenAuthorityField(item));
  }
  if (!isPlainRecord(value)) return false;
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replaceAll(/[-_]/gu, "");
    if (FORBIDDEN_AUTHORITY_FIELDS.has(normalizedKey)) return true;
    if (containsForbiddenAuthorityField(child)) return true;
  }
  return false;
}

function responseMatchesExpectedProvider(
  response: KnowledgeResponse,
  provider: Readonly<ProviderIdentity>,
  toolName: KnowledgeToolName,
): boolean {
  return (
    response.provider.id === provider.id &&
    response.provider.role === provider.role &&
    response.receipt.providerId === provider.id &&
    response.receipt.toolName === toolName
  );
}

function minimizeEmbeddedProfileError(
  response: KnowledgeResponse,
): KnowledgeResponse {
  if (!response.error) return response;
  return {
    ...response,
    error: {
      code: response.error.code,
      message: safeProfileErrorMessage(response.error.code),
      ...(response.error.field ? { field: response.error.field } : {}),
      ...(response.error.retryable !== undefined
        ? { retryable: response.error.retryable }
        : {}),
      ...(response.error.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: response.error.retryAfterSeconds }
        : {}),
    },
  };
}

function safeProfileErrorMessage(code: ProfileErrorCode): string {
  switch (code) {
    case "INVALID_REQUEST":
      return "The request does not match this tool's input contract.";
    case "ENTITLEMENT_REQUIRED":
      return "The provider requires a recognized access relationship for the requested unit.";
    case "USE_NOT_PERMITTED":
      return "The provider does not permit the requested use.";
    case "RESOURCE_NOT_FOUND":
      return "The provider could not find the requested resource.";
    case "RESOURCE_RETRACTED":
      return "The requested resource is retracted and cannot supply this content unit.";
    case "RESOURCE_WITHDRAWN":
      return "The requested resource is withdrawn and cannot supply this content unit.";
    case "QUERY_TOO_BROAD":
      return "The provider requires a narrower query.";
    case "REQUEST_TOO_LARGE":
      return "The provider requires a smaller bounded request.";
    case "SENSITIVE_QUERY_REJECTED":
      return "The provider rejected the request under its query-sensitivity policy.";
    case "RATE_LIMITED":
      return "The provider is temporarily rate limited.";
    case "PROVIDER_UNAVAILABLE":
      return "The provider could not complete this request.";
    case "PROFILE_VERSION_UNSUPPORTED":
      return "The provider does not support the requested profile version.";
  }
}

function boundaryFailureResponse(
  provider: Readonly<ProviderIdentity>,
  failure: Readonly<ToolBoundaryFailure>,
  now: () => Date,
  createReceiptId: () => string,
): KnowledgeResponse {
  const isUnapprovedOpenField =
    failure.toolName === "knowledge_open" &&
    failure.issues?.some((issue) => issue.keyword === "additionalProperties");
  return createMinimizedClientError({
    provider,
    toolName: failure.toolName,
    code: isUnapprovedOpenField ? "USE_NOT_PERMITTED" : failure.code,
    message: isUnapprovedOpenField
      ? "Knowledge open accepts only a provider resource and bounded locator."
      : failure.message,
    ...(failure.issues?.[0]?.path ? { field: failure.issues[0].path } : {}),
    retryable: failure.retryable,
    now,
    createReceiptId,
  });
}

interface MinimizedClientErrorOptions {
  provider: Readonly<ProviderIdentity>;
  toolName: KnowledgeToolName;
  code: ProfileErrorCode;
  message: string;
  field?: string;
  retryable: boolean;
  now: () => Date;
  createReceiptId: () => string;
}

function createMinimizedClientError(
  options: MinimizedClientErrorOptions,
): KnowledgeResponse {
  return createProviderErrorResponse({
    status: "error",
    provider: { ...options.provider },
    receipt: createSourceReceipt({
      seed: {
        receiptId: options.createReceiptId(),
        issuedAt: options.now().toISOString(),
        retention: "session",
      },
      providerId: options.provider.id,
      toolName: options.toolName,
      resourceIds: [],
      decision: "denied",
    }),
    error: {
      code: options.code,
      message: options.message,
      ...(options.field ? { field: options.field } : {}),
      retryable: options.retryable,
    },
  });
}

function defaultClientReceiptId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  return randomUUID
    ? `webmcp-client-${randomUUID.call(globalThis.crypto)}`
    : `webmcp-client-${Date.now().toString(36)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

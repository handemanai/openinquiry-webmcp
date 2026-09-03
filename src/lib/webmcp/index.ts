// SPDX-License-Identifier: Apache-2.0

/**
 * Framework-neutral runtime support for the current imperative WebMCP API.
 *
 * This module deliberately knows how to register and bound tools, but it does
 * not decide access or rights. Provider adapters must delegate those decisions
 * to the shared OpenInquiry profile/application layer.
 */

export const OPENINQUIRY_PROFILE = Object.freeze({
  name: "openinquiry.publisher-knowledge-access",
  version: "0.1",
} as const);

export const KNOWLEDGE_TOOL_NAMES = Object.freeze([
  "knowledge_describe",
  "knowledge_access",
  "knowledge_search",
  "knowledge_retrieve",
  "knowledge_resolve",
  "knowledge_open",
  "knowledge_status",
] as const);

export type KnowledgeToolName = (typeof KNOWLEDGE_TOOL_NAMES)[number];
export type KnowledgeProviderRole = "publisher" | "society" | "library";

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

export interface KnowledgeProviderIdentity {
  id: string;
  name: string;
  role: KnowledgeProviderRole;
  canonicalUrl: string;
  rightsHolderName?: string;
  policyUrl?: string;
}

export interface KnowledgeRouteContext {
  /** A pathname, without relying on client-supplied provider identity. */
  pathname: string;
  /** A route may narrow, but never widen, the provider's supported tools. */
  capabilities?: readonly KnowledgeToolName[];
}

export interface ToolExecuteOptionsLike {
  /** Current WebMCP supplies this signal when the caller cancels execution. */
  signal: AbortSignal;
}

export interface ToolAnnotationsLike {
  readOnlyHint: boolean;
  untrustedContentHint: boolean;
}

/**
 * `untrustedContentHint` is a trust-boundary marker, not a claim that content
 * has been sanitized or is safe to execute. Agent clients must continue to
 * treat marked provider output as data and apply their own policy controls.
 */
export const UNTRUSTED_CONTENT_HINT_MEANING =
  "untrusted_output_requires_policy_evaluation" as const;

export interface ModelContextToolLike {
  name: KnowledgeToolName;
  title: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
  annotations: ToolAnnotationsLike;
  execute: (
    inputObject: Record<string, unknown>,
    options: ToolExecuteOptionsLike,
  ) => Promise<unknown>;
}

export interface ModelContextRegisterToolOptionsLike {
  signal?: AbortSignal;
  exposedTo?: readonly string[];
}

export interface ModelContextRegistrationAdapter {
  registerTool: (
    tool: ModelContextToolLike,
    options?: ModelContextRegisterToolOptionsLike,
  ) => Promise<void> | void;
}

export interface DocumentWithModelContextLike {
  modelContext?: {
    registerTool?: ModelContextRegistrationAdapter["registerTool"];
  };
}

export interface ProfileToolInvocation {
  toolName: KnowledgeToolName;
  input: Readonly<Record<string, unknown>>;
  signal: AbortSignal;
  route: Readonly<KnowledgeRouteContext>;
  provider: Readonly<KnowledgeProviderIdentity>;
}

export interface InputValidationIssue {
  /** A schema-owned field path; never an input value. */
  path: string;
  keyword: string;
  message: string;
}

export interface ToolBoundaryFailure {
  code: ProfileErrorCode;
  message: string;
  toolName: KnowledgeToolName;
  retryable: boolean;
  issues?: readonly InputValidationIssue[];
}

export interface BoundaryErrorContext {
  failure: Readonly<ToolBoundaryFailure>;
  route: Readonly<KnowledgeRouteContext>;
  provider: Readonly<KnowledgeProviderIdentity>;
}

/**
 * The only provider-specific seam in this package.
 *
 * `execute` should call shared application/profile services that derive access
 * from the trusted site session. It must not implement a second authorization
 * path or accept entitlement asserted in tool input.
 */
export interface KnowledgeProviderAdapter {
  provider: Readonly<KnowledgeProviderIdentity>;
  supportedTools: readonly KnowledgeToolName[];
  untrustedOutputTools?: readonly KnowledgeToolName[];
  execute: (invocation: ProfileToolInvocation) => Promise<unknown>;
  toErrorResponse?: (context: BoundaryErrorContext) => Promise<unknown> | unknown;
}

export interface SharedKnowledgeProfileService {
  execute: (invocation: ProfileToolInvocation) => Promise<unknown>;
  toErrorResponse?: (context: BoundaryErrorContext) => Promise<unknown> | unknown;
}

export interface CreateKnowledgeProviderAdapterOptions {
  provider: KnowledgeProviderIdentity;
  supportedTools: readonly KnowledgeToolName[];
  service: SharedKnowledgeProfileService;
  untrustedOutputTools?: readonly KnowledgeToolName[];
}

/**
 * Binds a provider to the shared profile service without adding policy logic.
 */
export function createKnowledgeProviderAdapter(
  options: CreateKnowledgeProviderAdapterOptions,
): KnowledgeProviderAdapter {
  assertKnownToolNames(options.supportedTools, "supportedTools");
  assertKnownToolNames(options.untrustedOutputTools ?? [], "untrustedOutputTools");

  const supportedTools = Object.freeze([...new Set(options.supportedTools)]);
  const untrustedOutputTools = Object.freeze([
    ...new Set(options.untrustedOutputTools ?? []),
  ]);

  return Object.freeze({
    provider: Object.freeze({ ...options.provider }),
    supportedTools,
    untrustedOutputTools,
    execute: (invocation: ProfileToolInvocation) => options.service.execute(invocation),
    toErrorResponse: options.service.toErrorResponse
      ? (context: BoundaryErrorContext) => options.service.toErrorResponse?.(context)
      : undefined,
  });
}

const REQUESTED_USE_VALUES = [
  "discover",
  "link",
  "quote",
  "summarize",
  "compare",
] as const;

const CONTENT_TYPE_VALUES = [
  "journal_article",
  "book_chapter",
  "guideline",
  "consensus_statement",
  "video",
  "transcript",
  "conference_material",
  "other",
] as const;

const REPRESENTATION_VALUES = [
  "metadata",
  "abstract",
  "summary",
  "full_text",
  "recommendation",
  "quotation",
  "figure_description",
  "transcript_segment",
] as const;

const RESOURCE_STATUS_VALUES = [
  "current",
  "updated",
  "corrected",
  "retracted",
  "withdrawn",
] as const;

const PROFILE_VERSION_SCHEMA = Object.freeze({
  type: "string",
  const: OPENINQUIRY_PROFILE.version,
  description: "OpenInquiry profile version requested by the caller.",
});

const REQUEST_ID_SCHEMA = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 64,
  pattern: "^[A-Za-z0-9._:-]+$",
  description: "Optional opaque request ID; never include prompt or patient text.",
});

const REQUESTED_USE_SCHEMA = Object.freeze({
  type: "array",
  items: { type: "string", enum: REQUESTED_USE_VALUES },
  minItems: 1,
  maxItems: REQUESTED_USE_VALUES.length,
  uniqueItems: true,
  description: "Requested uses for the bounded provider response.",
});

const RESOURCE_ID_SCHEMA = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9._:-]+$",
  description: "Provider-issued resource ID, not a URL or entitlement claim.",
});

const LOCATOR_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    sectionTitle: {
      type: "string",
      minLength: 1,
      maxLength: 240,
      description: "Provider-issued human-readable section title; not an authority signal by itself.",
    },
    sectionId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[A-Za-z0-9._:-]+$",
      description: "Provider-issued section identifier.",
    },
    page: {
      type: "string",
      minLength: 1,
      maxLength: 40,
      pattern: "^[A-Za-z0-9 ._:-]+$",
      description: "Provider-formatted page or page range.",
    },
    figureId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[A-Za-z0-9._:-]+$",
      description: "Provider-issued figure identifier.",
    },
    timestampSeconds: {
      type: "number",
      minimum: 0,
      maximum: 86400,
      description: "Media position in seconds, bounded to 24 hours.",
    },
    timestampEndSeconds: {
      type: "number",
      minimum: 0,
      maximum: 86400,
      description: "Optional provider-issued end of a bounded media segment.",
    },
    timestampLabel: {
      type: "string",
      minLength: 1,
      maxLength: 24,
      description: "Provider-issued human-readable media position; not an authority signal by itself.",
    },
  },
  minProperties: 1,
  additionalProperties: false,
});

const BASE_REQUEST_PROPERTIES = Object.freeze({
  profileVersion: PROFILE_VERSION_SCHEMA,
  requestId: REQUEST_ID_SCHEMA,
});

const FOCUSED_REPRESENTATION_VALUES = Object.freeze([
  "full_text",
  "recommendation",
  "quotation",
  "figure_description",
  "transcript_segment",
] as const);

/** JSON Schemas are descriptive; handlers also enforce these bounds in code. */
export const KNOWLEDGE_TOOL_INPUT_SCHEMAS: Readonly<
  Record<KnowledgeToolName, Readonly<Record<string, unknown>>>
> = Object.freeze({
  knowledge_describe: Object.freeze({
    type: "object",
    properties: BASE_REQUEST_PROPERTIES,
    additionalProperties: false,
  }),
  knowledge_access: Object.freeze({
    type: "object",
    properties: BASE_REQUEST_PROPERTIES,
    required: ["profileVersion"],
    additionalProperties: false,
  }),
  knowledge_search: Object.freeze({
    type: "object",
    properties: {
      ...BASE_REQUEST_PROPERTIES,
      query: {
        type: "string",
        minLength: 2,
        maxLength: 300,
        description: "Focused topic or generic educational question; do not include PHI.",
      },
      contentTypes: {
        type: "array",
        items: { type: "string", enum: CONTENT_TYPE_VALUES },
        minItems: 1,
        maxItems: 6,
        uniqueItems: true,
        description: "Optional provider content types to include.",
      },
      publishedAfter: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Optional lower publication date in YYYY-MM-DD format.",
      },
      status: {
        type: "array",
        items: { type: "string", enum: RESOURCE_STATUS_VALUES },
        minItems: 1,
        maxItems: RESOURCE_STATUS_VALUES.length,
        uniqueItems: true,
        description: "Optional publication-status filter.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 6,
        description: "Maximum concise source records to return, from 1 to 6.",
      },
    },
    required: ["profileVersion", "query"],
    additionalProperties: false,
  }),
  knowledge_retrieve: Object.freeze({
    type: "object",
    properties: {
      ...BASE_REQUEST_PROPERTIES,
      requestedUse: REQUESTED_USE_SCHEMA,
      resourceId: RESOURCE_ID_SCHEMA,
      locator: LOCATOR_SCHEMA,
      focusedQuery: {
        type: "string",
        minLength: 2,
        maxLength: 300,
        description: "The question the person is trying to answer. The provider uses it to select a relevant permitted passage rather than a fixed excerpt.",
      },
      requestedRepresentation: {
        type: "string",
        enum: REPRESENTATION_VALUES,
        description: "Requested representation. Request full_text with focusedQuery for the fullest publisher-permitted source; the provider may substitute a less complete representation under its current access and agent-assurance policy.",
      },
      maxCharacters: {
        type: "integer",
        minimum: 1,
        description: "Optional caller-selected content limit. Omit it when requesting the complete provider-permitted representation; provider policy may still return less.",
      },
    },
    required: ["profileVersion", "resourceId", "requestedRepresentation"],
    allOf: [{
      if: {
        properties: {
          requestedRepresentation: { enum: FOCUSED_REPRESENTATION_VALUES },
        },
        required: ["requestedRepresentation"],
      },
      then: {
        anyOf: [
          { required: ["focusedQuery"] },
          { required: ["locator"] },
        ],
      },
    }],
    additionalProperties: false,
  }),
  knowledge_resolve: Object.freeze({
    type: "object",
    properties: {
      ...BASE_REQUEST_PROPERTIES,
      resourceId: RESOURCE_ID_SCHEMA,
    },
    required: ["profileVersion", "resourceId"],
    additionalProperties: false,
  }),
  knowledge_open: Object.freeze({
    type: "object",
    properties: {
      ...BASE_REQUEST_PROPERTIES,
      resourceId: RESOURCE_ID_SCHEMA,
      locator: LOCATOR_SCHEMA,
    },
    required: ["profileVersion", "resourceId"],
    additionalProperties: false,
  }),
  knowledge_status: Object.freeze({
    type: "object",
    properties: {
      ...BASE_REQUEST_PROPERTIES,
      resourceIds: {
        type: "array",
        items: RESOURCE_ID_SCHEMA,
        minItems: 1,
        maxItems: 8,
        uniqueItems: true,
        description: "One to eight provider-issued resource IDs to refresh.",
      },
    },
    required: ["profileVersion", "resourceIds"],
    additionalProperties: false,
  }),
});

const TOOL_READ_ONLY: Readonly<Record<KnowledgeToolName, boolean>> = Object.freeze({
  knowledge_describe: true,
  knowledge_access: true,
  knowledge_search: true,
  // Retrieval consumes a server-side, session-scoped content budget. It is
  // therefore not read-only even though it does not edit the publication.
  knowledge_retrieve: false,
  knowledge_resolve: true,
  knowledge_open: false,
  knowledge_status: true,
});

const DEFAULT_ROLE_TOOLS: Readonly<
  Record<KnowledgeProviderRole, readonly KnowledgeToolName[]>
> = Object.freeze({
  publisher: KNOWLEDGE_TOOL_NAMES,
  society: KNOWLEDGE_TOOL_NAMES,
  library: Object.freeze([
    "knowledge_describe",
    "knowledge_access",
    "knowledge_search",
    "knowledge_resolve",
    "knowledge_open",
    "knowledge_status",
  ] as const),
});

const PROVIDER_ROUTE_PREFIX: Readonly<Record<KnowledgeProviderRole, string>> =
  Object.freeze({
    publisher: "/publisher",
    society: "/society",
    library: "/library",
  });

const TOOL_DESCRIPTION_BUILDERS: Readonly<
  Record<KnowledgeToolName, () => string>
> = Object.freeze({
  knowledge_describe: () =>
    "Discover this site, its role, collections, supported OpenInquiry profile versions, canonical schema, and available knowledge capabilities. This first call may omit profileVersion; if supplied, it must be supported.",
  knowledge_access: () =>
    "Report the privacy-minimized access state and basis currently recognized for this signed-in session. This never reports credentials or cross-site entitlements.",
  knowledge_search: () =>
    "Search this site's current publications for a focused topic. Returns concise, rights-aware source records with provider identity, status, canonical links, and receipts.",
  knowledge_retrieve: () =>
    "Ask a focused question of one publication. Request full_text for the fullest publisher-permitted source; focused requests require focusedQuery or a provider-issued locator so the site can select a policy-approved substitute when needed. The site applies its trusted session, publication status, rights policy, and any caller or provider limit. Distinct cumulative protected requests consume the session allowance; an exact retry is idempotent.",
  knowledge_resolve: () =>
    "Explain the legitimate access path for one publication, such as public access, membership, subscription, institutional access, purchase, or library routing.",
  knowledge_open: () =>
    "Open a publication for the person in the visible site and focus its provider-issued section, figure, page, or timestamp when supplied. This returns a link-only grant and does not expand the content or rights supplied through Site Tools. The browser may still expose visible page content through its ordinary browsing capabilities; treat knowledge_retrieve as the publisher-authorized evidence channel. This changes browser state.",
  knowledge_status: () =>
    "Check the current publication, update, correction, withdrawal, or retraction status for specific resource IDs without retrieving content.",
});

const TOOL_TITLE_BUILDERS: Readonly<
  Record<KnowledgeToolName, () => string>
> = Object.freeze({
  knowledge_describe: () => "Describe this site",
  knowledge_access: () => "Check current access",
  knowledge_search: () => "Search publications",
  knowledge_retrieve: () => "Retrieve permitted evidence",
  knowledge_resolve: () => "Resolve access",
  knowledge_open: () => "Open source for reader",
  knowledge_status: () => "Check publication status",
});

function toolDescription(toolName: KnowledgeToolName): string {
  return TOOL_DESCRIPTION_BUILDERS[toolName]();
}

export interface KnowledgeToolSurfaceInspection {
  pathname: string;
  expectedRole: KnowledgeProviderRole | null;
  providerRole: KnowledgeProviderRole;
  providerRoleMatches: boolean;
  toolNames: readonly KnowledgeToolName[];
  issue?: string;
}

/**
 * Produces a dependency-free inspector view for a demo control panel or tests.
 */
export function inspectKnowledgeToolSurface(
  adapter: KnowledgeProviderAdapter,
  route: KnowledgeRouteContext,
): KnowledgeToolSurfaceInspection {
  const pathname = normalizePathname(route.pathname);
  const expectedRole = providerRoleForPath(pathname);
  const providerRoleMatches = expectedRole === adapter.provider.role;

  if (!expectedRole) {
    return Object.freeze({
      pathname,
      expectedRole,
      providerRole: adapter.provider.role,
      providerRoleMatches: false,
      toolNames: Object.freeze([]),
      issue: "The route is outside the publisher, society, and library surfaces.",
    });
  }

  if (!providerRoleMatches) {
    return Object.freeze({
      pathname,
      expectedRole,
      providerRole: adapter.provider.role,
      providerRoleMatches,
      toolNames: Object.freeze([]),
      issue: `The ${expectedRole} route cannot register a ${adapter.provider.role} adapter.`,
    });
  }

  const providerTools = new Set(adapter.supportedTools);
  const roleTools = new Set(DEFAULT_ROLE_TOOLS[adapter.provider.role]);
  const routeTools = route.capabilities ? new Set(route.capabilities) : null;
  const toolNames = KNOWLEDGE_TOOL_NAMES.filter(
    (toolName) =>
      providerTools.has(toolName) &&
      roleTools.has(toolName) &&
      (!routeTools || routeTools.has(toolName)),
  );

  return Object.freeze({
    pathname,
    expectedRole,
    providerRole: adapter.provider.role,
    providerRoleMatches,
    toolNames: Object.freeze(toolNames),
  });
}

export interface CreateKnowledgeToolDefinitionsOptions {
  adapter: KnowledgeProviderAdapter;
  route: KnowledgeRouteContext;
  /** Revokes active calls when the trusted demo-session context changes. */
  executionRevocationSignal?: AbortSignal;
  now?: () => Date;
  createReceiptId?: () => string;
}

export function createKnowledgeToolDefinitions(
  options: CreateKnowledgeToolDefinitionsOptions,
): readonly ModelContextToolLike[] {
  const route = freezeRoute(options.route);
  const inspection = inspectKnowledgeToolSurface(options.adapter, route);
  const untrustedTools = new Set(options.adapter.untrustedOutputTools ?? []);
  const now = options.now ?? (() => new Date());
  const createReceiptId = options.createReceiptId ?? defaultReceiptId;

  return Object.freeze(
    inspection.toolNames.map((toolName) =>
      Object.freeze({
        name: toolName,
        title: TOOL_TITLE_BUILDERS[toolName](),
        description: toolDescription(toolName),
        inputSchema: KNOWLEDGE_TOOL_INPUT_SCHEMAS[toolName],
        annotations: Object.freeze({
          readOnlyHint: TOOL_READ_ONLY[toolName],
          untrustedContentHint: untrustedTools.has(toolName),
        }),
        execute: async (
          inputObject: Record<string, unknown>,
          executeOptions: ToolExecuteOptionsLike,
        ) => {
          const callerSignal = executeOptions?.signal ?? new AbortController().signal;
          const execution = combineAbortSignals(
            callerSignal,
            options.executionRevocationSignal,
          );
          const { signal } = execution;
          try {
            throwIfAborted(signal);

            const validation = validateKnowledgeToolInput(toolName, inputObject);
            if (!validation.ok) {
              return respondToBoundaryFailure(
                options.adapter,
                route,
                validation.failure,
                now,
                createReceiptId,
              );
            }

            const result = await options.adapter.execute({
              toolName,
              input: validation.value,
              signal,
              route,
              provider: options.adapter.provider,
            });
            throwIfAborted(signal);

            if (!isSerializableResult(result)) {
              return respondToBoundaryFailure(
                options.adapter,
                route,
                {
                  code: "PROVIDER_UNAVAILABLE",
                  message: "The provider returned a result that could not be serialized.",
                  toolName,
                  retryable: true,
                },
                now,
                createReceiptId,
              );
            }

            return result;
          } catch (error: unknown) {
            if (signal.aborted || isAbortError(error)) {
              throw signal.aborted ? abortReason(signal) : error;
            }

            return respondToBoundaryFailure(
              options.adapter,
              route,
              {
                code: "PROVIDER_UNAVAILABLE",
                message: "The provider could not complete this request.",
                toolName,
                retryable: true,
              },
              now,
              createReceiptId,
            );
          } finally {
            execution.dispose();
          }
        },
      }),
    ),
  );
}

export interface RegisterKnowledgeToolsOptions
  extends CreateKnowledgeToolDefinitionsOptions {
  /** Inject this in tests; omit it to read the current document.modelContext. */
  modelContext?: ModelContextRegistrationAdapter | null;
  /** Optional document injection avoids reading a browser global in tests/SSR. */
  document?: DocumentWithModelContextLike | null;
  /** Aborting this signal disposes every registration in this route scope. */
  signal?: AbortSignal;
  /** Cross-origin exposure is opt-in and never inferred from routes. */
  exposedTo?: readonly string[];
}

export interface KnowledgeToolRegistration {
  supported: boolean;
  registeredToolNames: readonly KnowledgeToolName[];
  inspection: KnowledgeToolSurfaceInspection;
  signal: AbortSignal;
  dispose: () => void;
}

export class WebMcpRegistrationError extends Error {
  readonly toolName: KnowledgeToolName;
  readonly cause: unknown;

  constructor(toolName: KnowledgeToolName, cause: unknown) {
    super(`WebMCP registration failed for ${toolName}.`);
    this.name = "WebMcpRegistrationError";
    this.toolName = toolName;
    this.cause = cause;
  }
}

/**
 * Registers the route's tools with the current two-argument imperative API.
 * Calling `dispose()` aborts the registration signal, which unregisters every
 * tool. The execution signal supplied by WebMCP remains separate.
 */
export async function registerKnowledgeTools(
  options: RegisterKnowledgeToolsOptions,
): Promise<KnowledgeToolRegistration> {
  const inspection = inspectKnowledgeToolSurface(options.adapter, options.route);
  const controller = new AbortController();
  const unlinkCallerSignal = linkAbortSignal(options.signal, controller);
  const dispose = () => {
    if (!controller.signal.aborted) {
      controller.abort(createAbortError("WebMCP route scope disposed."));
    }
    unlinkCallerSignal();
  };

  const modelContext =
    options.modelContext !== undefined
      ? options.modelContext
      : getDocumentModelContext(options.document);

  if (!modelContext) {
    return Object.freeze({
      supported: false,
      registeredToolNames: Object.freeze([]),
      inspection,
      signal: controller.signal,
      dispose,
    });
  }

  if (controller.signal.aborted) {
    return Object.freeze({
      supported: true,
      registeredToolNames: Object.freeze([]),
      inspection,
      signal: controller.signal,
      dispose,
    });
  }

  let exposedTo: readonly string[] | undefined;
  try {
    exposedTo = validateExposedOrigins(options.exposedTo);
  } catch (error: unknown) {
    dispose();
    throw error;
  }
  const definitions = createKnowledgeToolDefinitions(options);
  const registeredToolNames: KnowledgeToolName[] = [];

  for (const definition of definitions) {
    try {
      await modelContext.registerTool(definition, {
        signal: controller.signal,
        ...(exposedTo ? { exposedTo } : {}),
      });
      registeredToolNames.push(definition.name);
    } catch (error: unknown) {
      if (controller.signal.aborted || isAbortError(error)) {
        dispose();
        return Object.freeze({
          supported: true,
          registeredToolNames: Object.freeze([]),
          inspection,
          signal: controller.signal,
          dispose,
        });
      }

      dispose();
      throw new WebMcpRegistrationError(definition.name, error);
    }
  }

  return Object.freeze({
    supported: true,
    registeredToolNames: Object.freeze([...registeredToolNames]),
    inspection,
    signal: controller.signal,
    dispose,
  });
}

/** Safely binds the experimental method to its owning ModelContext object. */
export function getDocumentModelContext(
  injectedDocument?: DocumentWithModelContextLike | null,
): ModelContextRegistrationAdapter | null {
  const documentLike =
    injectedDocument === undefined
      ? (globalThis as { document?: DocumentWithModelContextLike }).document
      : injectedDocument;
  const modelContext = documentLike?.modelContext;

  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return null;
  }

  return Object.freeze({
    registerTool: (
      tool: ModelContextToolLike,
      options?: ModelContextRegisterToolOptionsLike,
    ) =>
      Promise.resolve(modelContext.registerTool?.call(modelContext, tool, options)),
  });
}

export type KnowledgeToolInputValidation =
  | {
      ok: true;
      value: Readonly<Record<string, unknown>>;
    }
  | {
      ok: false;
      failure: ToolBoundaryFailure;
    };

/** Runtime validation mirrors the exported schemas because clients may not. */
export function validateKnowledgeToolInput(
  toolName: KnowledgeToolName,
  input: unknown,
): KnowledgeToolInputValidation {
  const issues: InputValidationIssue[] = [];
  validateSchemaValue(KNOWLEDGE_TOOL_INPUT_SCHEMAS[toolName], input, "$", issues);

  if (
    (toolName === "knowledge_retrieve" || toolName === "knowledge_open")
    && isPlainRecord(input)
    && isPlainRecord(input.locator)
    && !["sectionId", "page", "figureId", "timestampSeconds"].some((field) =>
      Object.hasOwn(input.locator as Record<string, unknown>, field))
  ) {
    addIssue(
      issues,
      "$.locator",
      "requiredSelector",
      "locator must include a provider-issued section, page, figure, or timestamp selector.",
    );
  }

  if (
    toolName === "knowledge_retrieve"
    && isPlainRecord(input)
    && FOCUSED_REPRESENTATION_VALUES.includes(
      input.requestedRepresentation as (typeof FOCUSED_REPRESENTATION_VALUES)[number],
    )
    && !Object.hasOwn(input, "focusedQuery")
    && !Object.hasOwn(input, "locator")
  ) {
    addIssue(
      issues,
      "focusedQuery",
      "focusedRetrieval",
      "Passage retrieval requires a focusedQuery or provider-issued locator.",
    );
  }

  if (issues.length > 0) {
    const profileVersionIssue = issues.find(
      (issue) => issue.path === "profileVersion" && issue.keyword === "const",
    );
    const requestIsTooLarge = issues.some((issue) =>
      issue.keyword === "maxLength"
      || issue.keyword === "maxItems"
      || issue.keyword === "maximum");
    const code: ProfileErrorCode = profileVersionIssue
      ? "PROFILE_VERSION_UNSUPPORTED"
      : requestIsTooLarge
        ? "REQUEST_TOO_LARGE"
        : "INVALID_REQUEST";

    return {
      ok: false,
      failure: Object.freeze({
        code,
        message: profileVersionIssue
          ? `Only profile version ${OPENINQUIRY_PROFILE.version} is supported.`
          : issues[0]?.message ?? "The request did not match the tool input contract.",
        toolName,
        retryable: true,
        issues: Object.freeze(issues.slice(0, 8)),
      }),
    };
  }

  return {
    ok: true,
    value: Object.freeze({ ...(input as Record<string, unknown>) }),
  };
}

function validateSchemaValue(
  schemaValue: Readonly<Record<string, unknown>>,
  value: unknown,
  path: string,
  issues: InputValidationIssue[],
): void {
  if (issues.length >= 8) return;

  if (Object.hasOwn(schemaValue, "const") && value !== schemaValue.const) {
    addIssue(issues, path, "const", `${displayPath(path)} is not a supported value.`);
    return;
  }

  const enumValues = schemaValue.enum;
  if (Array.isArray(enumValues) && !enumValues.includes(value)) {
    addIssue(issues, path, "enum", `${displayPath(path)} is not an allowed value.`);
    return;
  }

  switch (schemaValue.type) {
    case "object":
      validateObjectSchema(schemaValue, value, path, issues);
      return;
    case "array":
      validateArraySchema(schemaValue, value, path, issues);
      return;
    case "string":
      validateStringSchema(schemaValue, value, path, issues);
      return;
    case "integer":
      validateNumberSchema(schemaValue, value, path, issues, true);
      return;
    case "number":
      validateNumberSchema(schemaValue, value, path, issues, false);
      return;
    default:
      return;
  }
}

function validateObjectSchema(
  schema: Readonly<Record<string, unknown>>,
  value: unknown,
  path: string,
  issues: InputValidationIssue[],
): void {
  if (!isPlainRecord(value)) {
    addIssue(issues, path, "type", `${displayPath(path)} must be an object.`);
    return;
  }

  const properties = isPlainRecord(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required) ? schema.required : [];

  for (const requiredName of required) {
    if (typeof requiredName === "string" && !Object.hasOwn(value, requiredName)) {
      addIssue(
        issues,
        childPath(path, requiredName),
        "required",
        `${requiredName} is required.`,
      );
    }
  }

  if (schema.additionalProperties === false) {
    for (const propertyName of Object.keys(value)) {
      if (!Object.hasOwn(properties, propertyName)) {
        addIssue(
          issues,
          path,
          "additionalProperties",
          "The request contains an unsupported field.",
        );
      }
    }
  }

  const minProperties = asFiniteNumber(schema.minProperties);
  if (minProperties !== null && Object.keys(value).length < minProperties) {
    addIssue(
      issues,
      path,
      "minProperties",
      `${displayPath(path)} must include at least ${minProperties} field.`,
    );
  }

  for (const [propertyName, propertyValue] of Object.entries(value)) {
    const propertySchema = properties[propertyName];
    if (isPlainRecord(propertySchema)) {
      validateSchemaValue(
        propertySchema,
        propertyValue,
        childPath(path, propertyName),
        issues,
      );
    }
  }
}

function validateArraySchema(
  schema: Readonly<Record<string, unknown>>,
  value: unknown,
  path: string,
  issues: InputValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "type", `${displayPath(path)} must be an array.`);
    return;
  }

  const minItems = asFiniteNumber(schema.minItems);
  const maxItems = asFiniteNumber(schema.maxItems);
  if (minItems !== null && value.length < minItems) {
    addIssue(
      issues,
      path,
      "minItems",
      `${displayPath(path)} must include at least ${minItems} item.`,
    );
  }
  if (maxItems !== null && value.length > maxItems) {
    addIssue(
      issues,
      path,
      "maxItems",
      `${displayPath(path)} may include at most ${maxItems} items.`,
    );
  }

  if (schema.uniqueItems === true) {
    const serialized = value.map((item) => JSON.stringify(item));
    if (new Set(serialized).size !== serialized.length) {
      addIssue(issues, path, "uniqueItems", `${displayPath(path)} must be unique.`);
    }
  }

  if (isPlainRecord(schema.items)) {
    value.forEach((item, index) =>
      validateSchemaValue(schema.items as Readonly<Record<string, unknown>>, item, `${path}[${index}]`, issues),
    );
  }
}

function validateStringSchema(
  schema: Readonly<Record<string, unknown>>,
  value: unknown,
  path: string,
  issues: InputValidationIssue[],
): void {
  if (typeof value !== "string") {
    addIssue(issues, path, "type", `${displayPath(path)} must be a string.`);
    return;
  }

  const minLength = asFiniteNumber(schema.minLength);
  const maxLength = asFiniteNumber(schema.maxLength);
  if (minLength !== null && value.length < minLength) {
    addIssue(
      issues,
      path,
      "minLength",
      `${displayPath(path)} must contain at least ${minLength} characters.`,
    );
  }
  if (maxLength !== null && value.length > maxLength) {
    addIssue(
      issues,
      path,
      "maxLength",
      `${displayPath(path)} may contain at most ${maxLength} characters.`,
    );
  }

  if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
    addIssue(issues, path, "pattern", `${displayPath(path)} has an invalid format.`);
  }
}

function validateNumberSchema(
  schema: Readonly<Record<string, unknown>>,
  value: unknown,
  path: string,
  issues: InputValidationIssue[],
  integer: boolean,
): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (integer && !Number.isInteger(value))
  ) {
    addIssue(
      issues,
      path,
      "type",
      `${displayPath(path)} must be ${integer ? "an integer" : "a number"}.`,
    );
    return;
  }

  const minimum = asFiniteNumber(schema.minimum);
  const maximum = asFiniteNumber(schema.maximum);
  if (minimum !== null && value < minimum) {
    addIssue(issues, path, "minimum", `${displayPath(path)} must be at least ${minimum}.`);
  }
  if (maximum !== null && value > maximum) {
    addIssue(issues, path, "maximum", `${displayPath(path)} may be at most ${maximum}.`);
  }
}

async function respondToBoundaryFailure(
  adapter: KnowledgeProviderAdapter,
  route: KnowledgeRouteContext,
  failure: ToolBoundaryFailure,
  now: () => Date,
  createReceiptId: () => string,
): Promise<unknown> {
  const context = Object.freeze({
    failure,
    route: Object.freeze({ ...route }),
    provider: adapter.provider,
  });

  if (adapter.toErrorResponse) {
    try {
      const response = await adapter.toErrorResponse(context);
      if (isSerializableResult(response)) return response;
    } catch {
      // Fall through to a small profile-shaped response with no raw input.
    }
  }

  return createFallbackBoundaryResponse(
    adapter.provider,
    failure,
    now(),
    createReceiptId(),
  );
}

function createFallbackBoundaryResponse(
  provider: Readonly<KnowledgeProviderIdentity>,
  failure: Readonly<ToolBoundaryFailure>,
  issuedAt: Date,
  receiptId: string,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    profile: OPENINQUIRY_PROFILE,
    status: "error",
    provider,
    receipt: Object.freeze({
      receiptId,
      issuedAt: issuedAt.toISOString(),
      providerId: provider.id,
      toolName: failure.toolName,
      resourceIds: Object.freeze([]),
      decision: "denied",
      retention: "session",
    }),
    error: Object.freeze({
      code: failure.code,
      message: failure.message,
      ...(failure.issues?.[0]?.path ? { field: failure.issues[0].path } : {}),
      retryable: failure.retryable,
    }),
  });
}

function providerRoleForPath(pathname: string): KnowledgeProviderRole | null {
  if (
    pathname === "/demo"
    || pathname.startsWith("/demo/article/")
  ) {
    return "publisher";
  }
  for (const role of Object.keys(PROVIDER_ROUTE_PREFIX) as KnowledgeProviderRole[]) {
    const prefix = PROVIDER_ROUTE_PREFIX[role];
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return role;
  }
  return null;
}

function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/u, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/u, "")
    : withLeadingSlash;
}

function freezeRoute(route: KnowledgeRouteContext): Readonly<KnowledgeRouteContext> {
  return Object.freeze({
    pathname: route.pathname,
    ...(route.capabilities
      ? { capabilities: Object.freeze([...route.capabilities]) }
      : {}),
  });
}

function validateExposedOrigins(
  origins: readonly string[] | undefined,
): readonly string[] | undefined {
  if (origins === undefined) return undefined;
  const normalized: string[] = [];

  for (const value of origins) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new TypeError("WebMCP exposedTo entries must be absolute origins.");
    }

    const isHttps = url.protocol === "https:";
    const isLocalHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "[::1]");
    if ((!isHttps && !isLocalHttp) || url.origin === "null") {
      throw new TypeError("WebMCP exposedTo entries must be potentially trustworthy origins.");
    }
    normalized.push(url.origin);
  }

  return Object.freeze([...new Set(normalized)]);
}

function linkAbortSignal(
  source: AbortSignal | undefined,
  target: AbortController,
): () => void {
  if (!source) return () => undefined;
  const abort = () => target.abort(abortReason(source));
  if (source.aborted) {
    abort();
    return () => undefined;
  }
  source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}

function combineAbortSignals(
  callerSignal: AbortSignal,
  resetSignal: AbortSignal | undefined,
): { signal: AbortSignal; dispose: () => void } {
  if (!resetSignal) {
    return { signal: callerSignal, dispose: () => undefined };
  }

  const controller = new AbortController();
  const removers: Array<() => void> = [];
  for (const source of [callerSignal, resetSignal]) {
    const abort = () => {
      if (!controller.signal.aborted) controller.abort(abortReason(source));
    };
    if (source.aborted) {
      abort();
    } else {
      source.addEventListener("abort", abort, { once: true });
      removers.push(() => source.removeEventListener("abort", abort));
    }
  }

  return {
    signal: controller.signal,
    dispose: () => removers.forEach((remove) => remove()),
  };
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? createAbortError("The operation was aborted.");
}

function throwIfAborted(signal: AbortSignal): void {
  if (typeof signal.throwIfAborted === "function") {
    signal.throwIfAborted();
    return;
  }
  if (signal.aborted) throw abortReason(signal);
}

function createAbortError(message: string): Error {
  if (typeof DOMException === "function") return new DOMException(message, "AbortError");
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isSerializableResult(value: unknown): boolean {
  try {
    return JSON.stringify(value) !== undefined;
  } catch {
    return false;
  }
}

function defaultReceiptId(): string {
  const randomUUID = (globalThis.crypto as { randomUUID?: () => string } | undefined)
    ?.randomUUID;
  return randomUUID
    ? `webmcp-boundary-${randomUUID.call(globalThis.crypto)}`
    : `webmcp-boundary-${Date.now().toString(36)}`;
}

function assertKnownToolNames(toolNames: readonly string[], label: string): void {
  const known = new Set<string>(KNOWLEDGE_TOOL_NAMES);
  for (const toolName of toolNames) {
    if (!known.has(toolName)) {
      throw new TypeError(`${label} contains an unknown OpenInquiry knowledge tool.`);
    }
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function childPath(parent: string, child: string): string {
  return parent === "$" ? child : `${parent}.${child}`;
}

function displayPath(path: string): string {
  return path === "$" ? "The request" : path;
}

function addIssue(
  issues: InputValidationIssue[],
  path: string,
  keyword: string,
  message: string,
): void {
  if (issues.length >= 8) return;
  issues.push(Object.freeze({ path: path === "$" ? "$" : path, keyword, message }));
}

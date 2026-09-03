// SPDX-License-Identifier: Apache-2.0

import {
  registerKnowledgeTools,
  type DocumentWithModelContextLike,
  type KnowledgeToolName,
  type ModelContextRegistrationAdapter,
} from "../index.ts";
import {
  createAllowlistedKnowledgeOpenIntent,
  createBrowserKnowledgeNavigationBoundary,
  type KnowledgeNavigationBoundary,
} from "./navigation.ts";
import {
  normalizeOrigin,
  resolveClientRoute,
  type OpenInquiryProviderId,
} from "./provider-config.ts";
import {
  createSameOriginKnowledgeProviderAdapter,
  type KnowledgeFetch,
} from "./transport.ts";
import {
  attachOpenIntent,
  createKnowledgeVisibleResult,
  knowledgeClientStore,
  type KnowledgeClientStore,
} from "./visible-result.ts";

export interface StartKnowledgeClientBridgeOptions {
  providerId: OpenInquiryProviderId;
  pathname: string;
  capabilities?: readonly KnowledgeToolName[];
  origin?: string;
  fetch?: KnowledgeFetch;
  modelContext?: ModelContextRegistrationAdapter | null;
  document?: DocumentWithModelContextLike | null;
  navigation?: KnowledgeNavigationBoundary;
  store?: KnowledgeClientStore;
  signal?: AbortSignal;
  now?: () => Date;
  createReceiptId?: () => string;
  createScopeId?: () => string;
}

export interface KnowledgeClientBridgeRegistration {
  scopeId: string;
  supported: boolean;
  registeredToolNames: readonly KnowledgeToolName[];
  signal: AbortSignal;
  dispose: () => void;
}

/**
 * Starts one page-local registration scope. Route cleanup aborts the runtime's
 * registration signal without replacing the independent execution signal that
 * WebMCP passes to each active call.
 */
export async function startKnowledgeClientBridge(
  options: StartKnowledgeClientBridgeOptions,
): Promise<KnowledgeClientBridgeRegistration> {
  const store = options.store ?? knowledgeClientStore;
  const scopeId = (options.createScopeId ?? defaultScopeId)();
  const lifecycle = new AbortController();
  const unlinkCallerSignal = linkAbortSignal(options.signal, lifecycle);
  const resolvedRoute = resolveClientRoute(
    options.providerId,
    options.pathname,
    options.capabilities,
  );
  let runtimeDispose: (() => void) | undefined;

  const dispose = () => {
    runtimeDispose?.();
    if (!lifecycle.signal.aborted) {
      lifecycle.abort(createAbortError("OpenInquiry page-local bridge disposed."));
    }
    unlinkCallerSignal();
    store.clearScope(scopeId);
  };

  store.setSupport(
    Object.freeze({
      status: "registering",
      scopeId,
      providerId: options.providerId,
      pathname: resolvedRoute.route.pathname,
    }),
  );
  const scopeRevision = store.getRevision();
  const scopeIsCurrent = () =>
    !lifecycle.signal.aborted && store.getRevision() === scopeRevision;

  if (!resolvedRoute.providerMatchesRoute) {
    if (!scopeIsCurrent()) {
      return Object.freeze({
        scopeId,
        supported: false,
        registeredToolNames: Object.freeze([]),
        signal: lifecycle.signal,
        dispose,
      });
    }
    store.setSupport(
      Object.freeze({
        status: "provider_mismatch",
        scopeId,
        providerId: options.providerId,
        pathname: resolvedRoute.route.pathname,
        expectedProviderId: resolvedRoute.expectedProviderId,
        message:
          "This page cannot register tools for a different OpenInquiry provider.",
      }),
    );
    return Object.freeze({
      scopeId,
      supported: false,
      registeredToolNames: Object.freeze([]),
      signal: lifecycle.signal,
      dispose,
    });
  }

  let origin: string;
  try {
    origin = normalizeOrigin(options.origin ?? readBrowserOrigin());
  } catch {
    if (!scopeIsCurrent()) {
      return Object.freeze({
        scopeId,
        supported: false,
        registeredToolNames: Object.freeze([]),
        signal: lifecycle.signal,
        dispose,
      });
    }
    store.setSupport(
      Object.freeze({
        status: "registration_error",
        scopeId,
        providerId: options.providerId,
        pathname: resolvedRoute.route.pathname,
        message: "The page origin is unavailable for same-origin provider tools.",
      }),
    );
    return Object.freeze({
      scopeId,
      supported: false,
      registeredToolNames: Object.freeze([]),
      signal: lifecycle.signal,
      dispose,
    });
  }

  const navigation =
    options.navigation ?? createBrowserKnowledgeNavigationBoundary();
  const adapter = createSameOriginKnowledgeProviderAdapter({
    providerId: options.providerId,
    origin,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.now ? { now: options.now } : {}),
    ...(options.createReceiptId
      ? { createReceiptId: options.createReceiptId }
      : {}),
    onResult: async ({ toolName, input, response, delivery }) => {
      if (!scopeIsCurrent()) return;
      const requestedResourceId =
        typeof input?.resourceId === "string" ? input.resourceId : undefined;
      const visible = createKnowledgeVisibleResult(
        options.providerId,
        toolName,
        response,
        requestedResourceId,
      );
      const openIntent = createAllowlistedKnowledgeOpenIntent(
        options.providerId,
        origin,
        response,
        visible,
      );
      const visibleWithIntent = attachOpenIntent(visible, openIntent);
      if (!store.publishPageToolActivity({
        scopeId,
        pathname: resolvedRoute.route.pathname,
        providerId: options.providerId,
        delivery,
        result: visibleWithIntent,
      }, scopeRevision)) return;
      if (openIntent && scopeIsCurrent()) {
        try {
          await navigation.apply(openIntent);
        } catch {
          // The provider result remains visible. Navigation failures never
          // disclose request input or transform the response into new policy.
        }
      }
    },
  });

  try {
    const registration = await registerKnowledgeTools({
      adapter,
      route: resolvedRoute.route,
      executionRevocationSignal: store.getSessionExecutionSignal(),
      ...(options.modelContext !== undefined
        ? { modelContext: options.modelContext }
        : {}),
      ...(options.document !== undefined ? { document: options.document } : {}),
      signal: lifecycle.signal,
    });
    runtimeDispose = registration.dispose;

    if (!scopeIsCurrent()) {
      registration.dispose();
      store.clearScope(scopeId);
    } else if (!registration.supported) {
      store.setSupport(
        Object.freeze({
          status: "unsupported",
          scopeId,
          providerId: options.providerId,
          pathname: resolvedRoute.route.pathname,
          message:
            "Agent tools are unavailable in this browser. The source experience still works.",
        }),
      );
    } else {
      store.setSupport(
        Object.freeze({
          status: "ready",
          scopeId,
          providerId: options.providerId,
          pathname: resolvedRoute.route.pathname,
          registeredToolNames: Object.freeze([
            ...registration.registeredToolNames,
          ]),
        }),
      );
    }

    return Object.freeze({
      scopeId,
      supported: registration.supported,
      registeredToolNames: Object.freeze([
        ...registration.registeredToolNames,
      ]),
      signal: registration.signal,
      dispose,
    });
  } catch {
    if (scopeIsCurrent()) {
      store.setSupport(
        Object.freeze({
          status: "registration_error",
          scopeId,
          providerId: options.providerId,
          pathname: resolvedRoute.route.pathname,
          message: "Agent tools could not be registered for this page.",
        }),
      );
    }
    return Object.freeze({
      scopeId,
      supported: false,
      registeredToolNames: Object.freeze([]),
      signal: lifecycle.signal,
      dispose,
    });
  }
}

function readBrowserOrigin(): string {
  const location = (globalThis as { location?: { origin?: string } }).location;
  if (!location?.origin) {
    throw new TypeError("OpenInquiry browser origin is unavailable.");
  }
  return location.origin;
}

function linkAbortSignal(
  source: AbortSignal | undefined,
  target: AbortController,
): () => void {
  if (!source) return () => undefined;
  const abort = () =>
    target.abort(
      source.reason ?? createAbortError("OpenInquiry bridge scope aborted."),
    );
  if (source.aborted) {
    abort();
    return () => undefined;
  }
  source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}

function createAbortError(message: string): Error {
  if (typeof DOMException === "function") {
    return new DOMException(message, "AbortError");
  }
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function defaultScopeId(): string {
  return `webmcp-scope-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

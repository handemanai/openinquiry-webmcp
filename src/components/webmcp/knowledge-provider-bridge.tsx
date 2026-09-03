// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  DEMO_SESSION_CHANGED_EVENT,
} from "@/src/lib/integration/demo-session-client";

import type {
  DocumentWithModelContextLike,
  KnowledgeToolName,
  ModelContextRegistrationAdapter,
} from "@/src/lib/webmcp/index.ts";
import {
  knowledgeClientStore,
  startKnowledgeClientBridge,
  type KnowledgeClientState,
  type KnowledgeClientStore,
  type KnowledgeFetch,
  type KnowledgeNavigationBoundary,
  type OpenInquiryProviderId,
} from "@/src/lib/webmcp/client/index.ts";

export interface KnowledgeProviderBridgeProps {
  providerId: OpenInquiryProviderId;
  pathname: string;
  capabilities?: readonly KnowledgeToolName[];
  origin?: string;
  fetch?: KnowledgeFetch;
  modelContext?: ModelContextRegistrationAdapter | null;
  document?: DocumentWithModelContextLike | null;
  navigation?: KnowledgeNavigationBoundary;
  store?: KnowledgeClientStore;
}

/**
 * Headless page-local bridge. It renders no application UI and therefore does
 * not make ordinary provider pages depend on WebMCP support.
 */
export function KnowledgeProviderBridge({
  providerId,
  pathname,
  capabilities,
  origin,
  fetch,
  modelContext,
  document,
  navigation,
  store = knowledgeClientStore,
}: KnowledgeProviderBridgeProps) {
  const [sessionRevision, setSessionRevision] = useState(0);
  const capabilitiesKey = capabilities?.join("|") ?? "";
  const stableCapabilities = useMemo(
    () => (capabilities ? [...capabilities] : undefined),
    // The ordered tool-name string is the intended semantic dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capabilitiesKey],
  );

  useEffect(() => {
    const onDemoSessionChanged = () => {
      // Invalidate a visible outcome before route cleanup can finish, so a
      // late provider response cannot restore focus or navigation after reset.
      store.reset();
      setSessionRevision((current) => current + 1);
    };
    window.addEventListener(DEMO_SESSION_CHANGED_EVENT, onDemoSessionChanged);
    return () => window.removeEventListener(DEMO_SESSION_CHANGED_EVENT, onDemoSessionChanged);
  }, [store]);

  useEffect(() => {
    const lifecycle = new AbortController();
    let disposeRegistration: (() => void) | undefined;

    // Public-safe tools register immediately. The server—not this client—then
    // derives Guest or entitled access from the trusted session for each call.
    void startKnowledgeClientBridge({
      providerId,
      pathname,
      ...(stableCapabilities ? { capabilities: stableCapabilities } : {}),
      ...(origin ? { origin } : {}),
      ...(fetch ? { fetch } : {}),
      ...(modelContext !== undefined ? { modelContext } : {}),
      ...(document !== undefined ? { document } : {}),
      ...(navigation ? { navigation } : {}),
      store,
      signal: lifecycle.signal,
    }).then((registration) => {
        disposeRegistration = registration.dispose;
        if (lifecycle.signal.aborted) registration.dispose();
      })
      .catch(() => {
        if (lifecycle.signal.aborted) return;
        // startKnowledgeClientBridge records the specific support failure.
      });

    return () => {
      lifecycle.abort(
        new DOMException("OpenInquiry provider route changed.", "AbortError"),
      );
      disposeRegistration?.();
    };
  }, [
    document,
    fetch,
    modelContext,
    navigation,
    origin,
    pathname,
    providerId,
    sessionRevision,
    stableCapabilities,
    store,
  ]);

  return null;
}

export function useKnowledgeClientState(
  store: KnowledgeClientStore = knowledgeClientStore,
): Readonly<KnowledgeClientState> {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export interface WebMcpSupportNoticeProps {
  store?: KnowledgeClientStore;
  className?: string;
}

/** An optional progressive-enhancement notice; provider content stays usable. */
export function WebMcpSupportNotice({
  store = knowledgeClientStore,
  className,
}: WebMcpSupportNoticeProps) {
  const { support } = useKnowledgeClientState(store);
  if (
    support.status !== "session_required" &&
    support.status !== "unsupported" &&
    support.status !== "provider_mismatch" &&
    support.status !== "registration_error"
  ) {
    return null;
  }

  return (
    <p className={className} role="status">
      {support.message}
    </p>
  );
}

export interface KnowledgeActivityLineProps {
  store?: KnowledgeClientStore;
  className?: string;
}

export function KnowledgeActivityLine({
  store = knowledgeClientStore,
  className,
}: KnowledgeActivityLineProps) {
  const { visibleResult } = useKnowledgeClientState(store);
  if (!visibleResult) return null;

  return (
    <p className={className} aria-live="polite">
      {visibleResult.activityLine}
    </p>
  );
}

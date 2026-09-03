// SPDX-License-Identifier: Apache-2.0

import type { KnowledgeResponse } from "../../profile/index.ts";
import { clientProviderDefinition } from "./provider-config.ts";
import type { OpenInquiryProviderId } from "./provider-config.ts";
import type {
  KnowledgeOpenIntent,
  KnowledgeVisibleResult,
} from "./visible-result.ts";

export const KNOWLEDGE_OPEN_INTENT_EVENT =
  "openinquiry:knowledge-open-intent" as const;

export interface KnowledgeNavigationBoundary {
  apply: (intent: Readonly<KnowledgeOpenIntent>) => Promise<void> | void;
}

export interface BrowserNavigationWindowLike {
  location: {
    href: string;
    assign: (href: string) => void;
  };
  document: {
    dispatchEvent: (event: Event) => boolean;
    getElementById: (id: string) => HTMLElement | null;
    querySelector: (selectors: string) => Element | null;
  };
}

/**
 * Converts a provider-returned canonical action into a same-origin intent.
 * The client never accepts a destination URL in WebMCP input.
 */
export function createAllowlistedKnowledgeOpenIntent(
  providerId: OpenInquiryProviderId,
  origin: string,
  response: KnowledgeResponse,
  visibleResult: KnowledgeVisibleResult,
): KnowledgeOpenIntent | undefined {
  if (
    visibleResult.toolName !== "knowledge_open" ||
    response.status === "error" ||
    response.status === "denied" ||
    response.status === "not_found" ||
    !visibleResult.selectedSource
  ) {
    return undefined;
  }

  const source = visibleResult.selectedSource;
  const action = response.actions?.find(
    (candidate) =>
      (candidate.type === "open" || candidate.type === "deep_link") &&
      candidate.providerId === response.provider.id &&
      (candidate.url === source.deepLink || candidate.url === source.canonicalUrl),
  );
  if (!action) return undefined;

  const currentOrigin = new URL(origin).origin;
  let destination: URL;
  try {
    destination = new URL(action.url);
  } catch {
    return undefined;
  }
  if (
    destination.origin !== currentOrigin ||
    destination.username ||
    destination.password
  ) {
    return undefined;
  }

  const allowedPrefixes = clientProviderDefinition(providerId).allowedOpenRoutePrefixes;
  if (
    !allowedPrefixes.some(
      (prefix) =>
        destination.pathname === prefix ||
        destination.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return undefined;
  }

  if (!queryAndFragmentMatchFocus(destination, visibleResult)) {
    return undefined;
  }

  const accessibleLabel = createAccessibleLabel(visibleResult);
  return Object.freeze({
    kind: "knowledge_open",
    providerId,
    resourceId: source.id,
    href: destination.href,
    ...(visibleResult.focus ? { focus: visibleResult.focus } : {}),
    accessibleLabel,
  });
}

/**
 * Default browser behavior is deliberately visible. Provider UI may cancel
 * the event and apply a local focus/seek transition; otherwise the browser
 * navigates in the current tab to the already allowlisted same-origin URL.
 */
export function createBrowserKnowledgeNavigationBoundary(
  injectedWindow?: BrowserNavigationWindowLike,
): KnowledgeNavigationBoundary {
  return Object.freeze({
    apply: (intent: Readonly<KnowledgeOpenIntent>) => {
      const windowLike =
        injectedWindow ??
        ((globalThis as { window?: BrowserNavigationWindowLike }).window ?? null);
      if (!windowLike) return;

      const event = new CustomEvent(KNOWLEDGE_OPEN_INTENT_EVENT, {
        bubbles: true,
        cancelable: true,
        detail: intent,
      });
      const shouldUseDefault = windowLike.document.dispatchEvent(event);
      if (!shouldUseDefault) return;

      if (windowLike.location.href !== intent.href) {
        windowLike.location.assign(intent.href);
        return;
      }

      focusCurrentDocument(windowLike.document, intent);
    },
  });
}

function queryAndFragmentMatchFocus(
  destination: URL,
  visibleResult: KnowledgeVisibleResult,
): boolean {
  const focus = visibleResult.focus;
  const queryKeys = [...destination.searchParams.keys()];
  if (focus?.kind === "timestamp") {
    if (queryKeys.some((key) => key !== "t")) return false;
    if (destination.searchParams.get("t") !== String(focus.timestampSeconds)) {
      return false;
    }
  } else if (queryKeys.length > 0) {
    return false;
  }

  if (destination.hash) {
    if (focus?.kind !== "section") return false;
    let fragment: string;
    try {
      fragment = decodeURIComponent(destination.hash.slice(1));
    } catch {
      return false;
    }
    if (fragment !== focus.sectionId) {
      return false;
    }
  }
  return true;
}

function createAccessibleLabel(result: KnowledgeVisibleResult): string {
  const sourceTitle = result.selectedSource?.title ?? "Provider source";
  if (result.focus?.kind === "timestamp") {
    const section = result.focus.sectionTitle
      ? `: ${result.focus.sectionTitle}`
      : "";
    return `Transcript focused at ${spokenTimestamp(result.focus.timestampSeconds)}${section}.`;
  }
  if (result.focus?.kind === "section") {
    return `${sourceTitle} focused at ${result.focus.sectionTitle ?? result.focus.sectionId}.`;
  }
  return `${sourceTitle} opened in its canonical provider context.`;
}

function spokenTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} minute${minutes === 1 ? "" : "s"}, ${remainder} second${remainder === 1 ? "" : "s"}`;
}

function focusCurrentDocument(
  documentLike: BrowserNavigationWindowLike["document"],
  intent: Readonly<KnowledgeOpenIntent>,
): void {
  let target: HTMLElement | null = null;
  if (intent.focus?.kind === "section") {
    target = documentLike.getElementById(intent.focus.sectionId);
  } else if (intent.focus?.kind === "timestamp") {
    const element = documentLike.querySelector(
      `[data-openinquiry-timestamp-seconds="${intent.focus.timestampSeconds}"]`,
    );
    target = element instanceof HTMLElement ? element : null;
  } else if (intent.focus?.kind === "figure") {
    target = documentLike.getElementById(intent.focus.figureId);
  }

  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  target.focus({ preventScroll: true });
}

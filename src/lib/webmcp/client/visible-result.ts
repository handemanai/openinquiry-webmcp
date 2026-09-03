// SPDX-License-Identifier: Apache-2.0

import type {
  AccessDecision,
  KnowledgeResource,
  KnowledgeResponse,
  RightsDecision,
  SourceReceipt,
} from "../../profile/index.ts";
import type { KnowledgeToolName } from "../index.ts";
import type { OpenInquiryProviderId } from "./provider-config.ts";

export type KnowledgeVisibleFocus =
  | Readonly<{
      kind: "timestamp";
      resourceId: string;
      timestampSeconds: number;
      timestampLabel: string;
      sectionId?: string;
      sectionTitle?: string;
    }>
  | Readonly<{
      kind: "section";
      resourceId: string;
      sectionId: string;
      sectionTitle?: string;
    }>
  | Readonly<{
      kind: "figure";
      resourceId: string;
      figureId: string;
    }>
  | Readonly<{
      kind: "page";
      resourceId: string;
      page: string;
    }>;

export interface KnowledgeVisibleSource {
  id: string;
  type: string;
  title: string;
  authors: readonly string[];
  responsibleOrganization?: string;
  containerTitle?: string;
  status: KnowledgeResource["status"];
  canonicalUrl: string;
  deepLink?: string;
}

export interface KnowledgeOpenIntent {
  kind: "knowledge_open";
  providerId: OpenInquiryProviderId;
  resourceId: string;
  href: string;
  focus?: KnowledgeVisibleFocus;
  accessibleLabel: string;
}

export interface KnowledgeVisibleResult {
  providerId: OpenInquiryProviderId;
  providerName: string;
  toolName: KnowledgeToolName;
  status: KnowledgeResponse["status"];
  selectedSource?: Readonly<KnowledgeVisibleSource>;
  focus?: KnowledgeVisibleFocus;
  access?: Readonly<AccessDecision>;
  rights?: Readonly<{
    policyId: RightsDecision["policyId"];
    decision: RightsDecision["decision"];
    allowedUses: readonly RightsDecision["allowedUses"][number][];
    limits?: Readonly<NonNullable<RightsDecision["limits"]>>;
    attribution: Readonly<RightsDecision["attribution"]>;
  }>;
  receipt: Readonly<Omit<SourceReceipt, "resourceIds">> & {
    readonly resourceIds: readonly string[];
  };
  activityLine: string;
  openIntent?: Readonly<KnowledgeOpenIntent>;
  errorCode?: string;
}

/**
 * Describes how a page-tool execution ended without retaining its input or
 * attempting to identify its caller.
 */
export type KnowledgeActivityDelivery =
  | "validated_provider_response"
  | "client_boundary"
  | "transport_failure";

export interface KnowledgePageToolActivity {
  scopeId: string;
  pathname: string;
  providerId: OpenInquiryProviderId;
  sequence: number;
  delivery: KnowledgeActivityDelivery;
  result: Readonly<KnowledgeVisibleResult>;
}

export type KnowledgeBridgeSupport =
  | Readonly<{
      status: "idle";
      scopeId?: string;
    }>
  | Readonly<{
      status: "registering";
      scopeId: string;
      providerId: OpenInquiryProviderId;
      pathname: string;
    }>
  | Readonly<{
      status: "session_required";
      providerId: OpenInquiryProviderId;
      pathname: string;
      message: string;
    }>
  | Readonly<{
      status: "ready";
      scopeId: string;
      providerId: OpenInquiryProviderId;
      pathname: string;
      registeredToolNames: readonly KnowledgeToolName[];
    }>
  | Readonly<{
      status: "unsupported";
      scopeId: string;
      providerId: OpenInquiryProviderId;
      pathname: string;
      message: string;
    }>
  | Readonly<{
      status: "provider_mismatch";
      scopeId: string;
      providerId: OpenInquiryProviderId;
      pathname: string;
      expectedProviderId: OpenInquiryProviderId | null;
      message: string;
    }>
  | Readonly<{
      status: "registration_error";
      scopeId: string;
      providerId: OpenInquiryProviderId;
      pathname: string;
      message: string;
    }>;

export interface KnowledgeClientState {
  support: KnowledgeBridgeSupport;
  visibleResult: Readonly<KnowledgeVisibleResult> | null;
  /** A short-lived, route-scoped activity rail. It never stores tool input. */
  activity: readonly Readonly<KnowledgePageToolActivity>[];
}

export interface KnowledgeClientStore {
  getSnapshot: () => Readonly<KnowledgeClientState>;
  /** Monotonic lifecycle revision used to reject late tool completions. */
  getRevision: () => number;
  /** Revoked when the trusted demo-session context changes, never on route disposal. */
  getSessionExecutionSignal: () => AbortSignal;
  subscribe: (listener: () => void) => () => void;
  setSupport: (support: KnowledgeBridgeSupport) => void;
  /** Returns false when the result belongs to an invalidated route/session. */
  publishVisibleResult: (result: KnowledgeVisibleResult, revision?: number) => boolean;
  /** Publishes a page-tool result and keeps its compact route-local activity. */
  publishPageToolActivity: (
    activity: Omit<KnowledgePageToolActivity, "sequence">,
    revision?: number,
  ) => boolean;
  clearScope: (scopeId: string) => void;
  reset: () => void;
}

export function createKnowledgeClientStore(): KnowledgeClientStore {
  let state: Readonly<KnowledgeClientState> = freezeState({
    support: Object.freeze({ status: "idle" }),
    visibleResult: null,
    activity: Object.freeze([]),
  });
  const listeners = new Set<() => void>();
  let revision = 0;
  let sessionExecutionController = new AbortController();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return Object.freeze({
    getSnapshot: () => state,
    getRevision: () => revision,
    getSessionExecutionSignal: () => sessionExecutionController.signal,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSupport: (support: KnowledgeBridgeSupport) => {
      const startsNewLifecycle = support.status === "registering"
        || support.status === "session_required";
      if (startsNewLifecycle) revision += 1;
      state = freezeState({
        ...state,
        support,
        ...(startsNewLifecycle
          ? { visibleResult: null, activity: Object.freeze([]) }
          : {}),
      });
      emit();
    },
    publishVisibleResult: (result: KnowledgeVisibleResult, expectedRevision = revision) => {
      if (expectedRevision !== revision) return false;
      state = freezeState({
        ...state,
        visibleResult: freezeVisibleResult(result),
      });
      emit();
      return true;
    },
    publishPageToolActivity: (
      activity: Omit<KnowledgePageToolActivity, "sequence">,
      expectedRevision = revision,
    ) => {
      if (expectedRevision !== revision) return false;
      const nextActivity = Object.freeze([
        ...state.activity,
        Object.freeze({
          ...activity,
          sequence: state.activity.length
            ? state.activity[state.activity.length - 1]!.sequence + 1
            : 1,
          result: freezeVisibleResult(activity.result),
        }),
      ].slice(-3));
      state = freezeState({
        ...state,
        visibleResult: freezeVisibleResult(activity.result),
        activity: nextActivity,
      });
      emit();
      return true;
    },
    clearScope: (scopeId: string) => {
      if (!("scopeId" in state.support) || state.support.scopeId !== scopeId) return;
      revision += 1;
      state = freezeState({
        ...state,
        support: Object.freeze({ status: "idle" }),
        visibleResult: null,
        activity: Object.freeze([]),
      });
      emit();
    },
    reset: () => {
      const previousSessionExecution = sessionExecutionController;
      sessionExecutionController = new AbortController();
      revision += 1;
      state = freezeState({
        support: Object.freeze({ status: "idle" }),
        visibleResult: null,
        activity: Object.freeze([]),
      });
      if (!previousSessionExecution.signal.aborted) {
        previousSessionExecution.abort(createDemoSessionChangeAbortError());
      }
      emit();
    },
  });
}

export const knowledgeClientStore = createKnowledgeClientStore();

function createDemoSessionChangeAbortError(): Error {
  const message = "The OpenInquiry demo session changed, so this tool execution was canceled.";
  if (typeof DOMException === "function") return new DOMException(message, "AbortError");
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export function createKnowledgeVisibleResult(
  providerId: OpenInquiryProviderId,
  toolName: KnowledgeToolName,
  response: KnowledgeResponse,
  requestedResourceId?: string,
): KnowledgeVisibleResult {
  const resource = selectVisibleResource(response.resources, requestedResourceId);
  const selectedSource = resource ? toVisibleSource(resource) : undefined;
  const focus = resource ? toVisibleFocus(resource) : undefined;
  const rights = response.rights
    ? Object.freeze({
        policyId: response.rights.policyId,
        decision: response.rights.decision,
        allowedUses: Object.freeze([...response.rights.allowedUses]),
        ...(response.rights.limits
          ? { limits: Object.freeze({ ...response.rights.limits }) }
          : {}),
        attribution: Object.freeze({ ...response.rights.attribution }),
      })
    : undefined;

  return Object.freeze({
    providerId,
    providerName: response.provider.name,
    toolName,
    status: response.status,
    ...(selectedSource ? { selectedSource } : {}),
    ...(focus ? { focus } : {}),
    ...(response.access ? { access: Object.freeze({ ...response.access }) } : {}),
    ...(rights ? { rights } : {}),
    receipt: Object.freeze({
      ...response.receipt,
      resourceIds: Object.freeze([...response.receipt.resourceIds]),
    }),
    activityLine: createActivityLine(toolName, response, resource),
    ...(response.error?.code ? { errorCode: response.error.code } : {}),
  });
}

export function attachOpenIntent(
  result: KnowledgeVisibleResult,
  openIntent: KnowledgeOpenIntent | undefined,
): KnowledgeVisibleResult {
  return Object.freeze({
    ...result,
    ...(openIntent ? { openIntent: Object.freeze(openIntent) } : {}),
  });
}

function selectVisibleResource(
  resources: readonly KnowledgeResource[] | undefined,
  requestedResourceId: string | undefined,
): KnowledgeResource | undefined {
  if (!resources?.length) return undefined;
  if (requestedResourceId) {
    return (
      resources.find((resource) => resource.id === requestedResourceId) ??
      resources[0]
    );
  }
  return resources[0];
}

function toVisibleSource(resource: KnowledgeResource): KnowledgeVisibleSource {
  return Object.freeze({
    id: resource.id,
    type: resource.type,
    title: resource.title,
    authors: Object.freeze(resource.authors.map((author) => author.name)),
    ...(resource.responsibleOrganization
      ? { responsibleOrganization: resource.responsibleOrganization }
      : {}),
    ...(resource.containerTitle
      ? { containerTitle: resource.containerTitle }
      : {}),
    status: resource.status,
    canonicalUrl: resource.canonicalUrl,
    ...(resource.deepLink ? { deepLink: resource.deepLink } : {}),
  });
}

function toVisibleFocus(
  resource: KnowledgeResource,
): KnowledgeVisibleFocus | undefined {
  const locator = resource.locator;
  if (!locator) return undefined;
  if (typeof locator.timestampSeconds === "number") {
    return Object.freeze({
      kind: "timestamp",
      resourceId: resource.id,
      timestampSeconds: locator.timestampSeconds,
      timestampLabel:
        locator.timestampLabel ?? formatTimestamp(locator.timestampSeconds),
      ...(locator.sectionId ? { sectionId: locator.sectionId } : {}),
      ...(locator.sectionTitle ? { sectionTitle: locator.sectionTitle } : {}),
    });
  }
  if (locator.sectionId) {
    return Object.freeze({
      kind: "section",
      resourceId: resource.id,
      sectionId: locator.sectionId,
      ...(locator.sectionTitle ? { sectionTitle: locator.sectionTitle } : {}),
    });
  }
  if (locator.figureId) {
    return Object.freeze({
      kind: "figure",
      resourceId: resource.id,
      figureId: locator.figureId,
    });
  }
  if (locator.page) {
    return Object.freeze({
      kind: "page",
      resourceId: resource.id,
      page: locator.page,
    });
  }
  return undefined;
}

function createActivityLine(
  toolName: KnowledgeToolName,
  response: KnowledgeResponse,
  resource: KnowledgeResource | undefined,
): string {
  const provider = response.provider.name;
  const source = resource ? `“${resource.title}”` : "the current source";
  if (response.error) {
    return `${provider} could not complete ${toolLabel(toolName)} (${response.error.code})`;
  }

  switch (toolName) {
    case "knowledge_describe":
      return `${provider} described its available knowledge services`;
    case "knowledge_access":
      return `${provider} reported ${response.access?.basisLabel ?? response.access?.state ?? "the recognized"} access context`;
    case "knowledge_search":
      return `${provider} returned ${response.resources?.length ?? 0} source${response.resources?.length === 1 ? "" : "s"}`;
    case "knowledge_retrieve":
      return `${provider} selected ${source} and supplied ${representationLabel(response)}`;
    case "knowledge_resolve":
      return `${provider} showed the recognized access route for ${source}`;
    case "knowledge_open": {
      const timestamp = resource?.locator?.timestampLabel;
      return `${provider} opened ${source}${timestamp ? ` at ${timestamp}` : " in its canonical context"}`;
    }
    case "knowledge_status":
      return `${provider} refreshed the current source status`;
  }
}

function representationLabel(response: KnowledgeResponse): string {
  const representation = response.grants?.[0]?.representation;
  return representation ? representation.replaceAll("_", " ") : "a bounded result";
}

function toolLabel(toolName: KnowledgeToolName): string {
  return toolName.replace("knowledge_", "").replaceAll("_", " ");
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`;
}

function freezeVisibleResult(
  result: KnowledgeVisibleResult,
): Readonly<KnowledgeVisibleResult> {
  return Object.freeze({ ...result });
}

function freezeState(state: KnowledgeClientState): Readonly<KnowledgeClientState> {
  return Object.freeze({ ...state });
}

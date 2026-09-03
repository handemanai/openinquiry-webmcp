// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  KnowledgeProviderBridge,
} from "@/src/components/webmcp/knowledge-provider-bridge";
import {
  DEFAULT_JOURNAL_GUIDELINE_ID,
  JOURNAL_GUIDELINE_CATALOG,
  findJournalGuideline,
  journalGuidelinePath,
  type JournalGuidelineId,
} from "@/src/lib/demo/journal-guidelines-catalog";
import type { PublicGuidelinesReaderView } from "@/src/lib/demo/guidelines-reader-contract";
import {
  isDemoScenarioId,
  type DemoScenarioId,
  type ProposedAgentCredentialRecognition,
} from "@/src/lib/demo/scenario";
import {
  announceDemoSessionChange,
  getPublicDemoSession,
  selectPublicDemoScenario,
} from "@/src/lib/integration/demo-session-client";
import {
  DEMO_EVIDENCE_CHANNEL_NAME,
  announceDemoEvidenceReset,
  clearPublisherDecidesEvidence,
  publisherDecidesEvidenceStorageKey,
} from "@/src/lib/integration/demo-evidence-client";
import { getPublicGuidelinesReaderView } from "@/src/lib/integration/guidelines-reader-client";
import {
  validateKnowledgeResponse,
  type KnowledgeResponse,
} from "@/src/lib/profile";
import type { KnowledgeToolName } from "@/src/lib/webmcp";
import {
  createKnowledgeClientStore,
  type KnowledgeFetch,
  type KnowledgeNavigationBoundary,
} from "@/src/lib/webmcp/client";

import {
  PUBLISHER_DECIDES_AGENT_INSTRUCTION,
  PUBLISHER_DECIDES_DISCOVERY_PROMPT,
  PUBLISHER_DECIDES_DISCOVERY_QUESTION,
  publisherDecidesFollowUpPrompt,
  publisherDecidesFollowUpQuestion,
} from "./publisher-decides-prompts";
import {
  publisherDecidesScenarioFor,
  publisherDecidesStateForSession,
  readPublisherDecidesState,
  writePublisherDecidesState,
  type PublisherDecidesEntitlement,
} from "./publisher-decides-scenario";
import {
  buildPermissionResultCopy,
  PublisherPermissionResult,
} from "./publisher-permission-result";
import styles from "./publisher-decides-live.module.css";

const RESOURCE_ID = DEFAULT_JOURNAL_GUIDELINE_ID;
const ASSURANCE_POLICY_SUFFIX = "-proposed-agent-assurance-demo";

const PAGE_TOOLS = [
  "knowledge_describe",
  "knowledge_access",
  "knowledge_search",
  "knowledge_retrieve",
  "knowledge_resolve",
  "knowledge_open",
  "knowledge_status",
] as const satisfies readonly KnowledgeToolName[];

type PageTool = (typeof PAGE_TOOLS)[number];
type CopyTarget = "discovery" | "follow-up";

type EvidenceChannelMessage = Readonly<{
  type: "session_reset";
}> | Readonly<{
  type: "request";
  resourceId: JournalGuidelineId;
  scenarioId: DemoScenarioId;
}> | Readonly<{
  type: "response";
  resourceId: JournalGuidelineId;
  scenarioId: DemoScenarioId;
  response: KnowledgeResponse;
}>;

function evidenceStorageKey(resourceId: JournalGuidelineId) {
  return publisherDecidesEvidenceStorageKey(resourceId);
}

function readStoredEvidence(
  resourceId: JournalGuidelineId,
  scenarioId: DemoScenarioId,
): KnowledgeResponse | null {
  try {
    const value = window.sessionStorage.getItem(evidenceStorageKey(resourceId));
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as { scenarioId?: unknown; response?: unknown };
    if (record.scenarioId !== scenarioId
      || validateKnowledgeResponse(record.response).length > 0) return null;
    const response = record.response as KnowledgeResponse;
    const belongsToResource = response.grants?.some(
      (grant) => findJournalGuideline(grant.resourceId)?.id === resourceId,
    );
    return belongsToResource ? response : null;
  } catch {
    return null;
  }
}

function writeStoredEvidence(
  resourceId: JournalGuidelineId,
  scenarioId: DemoScenarioId,
  response: KnowledgeResponse,
) {
  try {
    window.sessionStorage.setItem(
      evidenceStorageKey(resourceId),
      JSON.stringify({ scenarioId, response }),
    );
  } catch {
    // The evidence remains visible in the current page even without persistence.
  }
}

function parseEvidenceChannelMessage(value: unknown): EvidenceChannelMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (message.type === "session_reset") return { type: "session_reset" };
  const resourceId = typeof message.resourceId === "string"
    ? findJournalGuideline(message.resourceId)?.id
    : undefined;
  if (!resourceId || !isDemoScenarioId(message.scenarioId)) return null;
  if (message.type === "request") {
    return { type: "request", resourceId, scenarioId: message.scenarioId };
  }
  if (message.type === "response"
    && validateKnowledgeResponse(message.response).length === 0) {
    return {
      type: "response",
      resourceId,
      scenarioId: message.scenarioId,
      response: message.response as KnowledgeResponse,
    };
  }
  return null;
}

function evidenceLabel(representation: string) {
  switch (representation) {
    case "abstract":
      return "Public abstract";
    case "summary":
      return "Publisher summary";
    case "full_text":
      return "Complete article text";
    case "quotation":
      return "Section excerpt";
    case "recommendation":
      return "Recommendation excerpt";
    case "transcript_segment":
      return "Transcript excerpt";
    case "metadata":
      return "Publication details";
    case "link_only":
      return "Source link";
    default:
      return representation.replaceAll("_", " ");
  }
}

function toolFromRequest(input: RequestInfo | URL): PageTool | null {
  const value = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
  const pathname = new URL(value, window.location.origin).pathname;
  const match = /\/tools\/(knowledge_[a-z_]+)$/u.exec(pathname);
  return match && PAGE_TOOLS.includes(match[1] as PageTool)
    ? match[1] as PageTool
    : null;
}

function responseGrants(
  response: KnowledgeResponse | undefined,
  resourceId: string = RESOURCE_ID,
) {
  return response?.grants?.filter(
    (grant) => findJournalGuideline(grant.resourceId)?.id === resourceId
      && typeof grant.content === "string",
  ) ?? [];
}

function primaryResponseGrant(
  response: KnowledgeResponse | undefined,
  resourceId: string = RESOURCE_ID,
) {
  const grants = responseGrants(response, resourceId);
  return grants.find(({ representation }) => representation === "full_text")
    ?? grants.find(({ representation }) => representation === "quotation")
    ?? grants.find(({ representation }) => representation === "recommendation")
    ?? grants.find(({ representation }) => representation === "summary")
    ?? grants[0];
}

function usesRecognizedCredential(response: KnowledgeResponse | undefined) {
  return response?.rights?.policyId.endsWith(ASSURANCE_POLICY_SUFFIX) ?? false;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12h15M14 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="12" rx="1" width="12" x="8" y="8" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </svg>
  );
}

function ReaderSection({
  relevantToQuestion,
  recommendationSectionId,
  recommendationTitles,
  section,
}: {
  relevantToQuestion: boolean;
  recommendationSectionId: string;
  recommendationTitles: readonly string[];
  section: PublicGuidelinesReaderView["sections"][number];
}) {
  if (!section.text) return null;
  const sectionText = section.text;
  const isRecommendationSection = section.id === recommendationSectionId;
  const paragraphs = sectionText.split(/\n\n+/u);
  const recommendationStatements = isRecommendationSection
    ? sectionText.split(/(?<=\.)\s+(?=[A-Z])/u)
    : [];
  const sectionClassName = [
    isRecommendationSection ? styles.recommendation : styles.readerSection,
    relevantToQuestion ? styles.relevantSection : "",
  ].filter(Boolean).join(" ");

  return (
    <section
      className={sectionClassName}
      id={section.id}
      tabIndex={-1}
    >
      {relevantToQuestion ? (
        <p className={styles.relevantSectionLabel}>Relevant to your question</p>
      ) : null}
      <h3>{section.heading}</h3>
      {isRecommendationSection ? (
        <ol className={styles.recommendationList}>
          {recommendationStatements.map((statement, index) => (
            <li key={recommendationTitles[index] ?? String(index)}>
              <span>Recommendation {index + 1}</span>
              <strong>{recommendationTitles[index] ?? "Additional guidance"}</strong>
              <p className={styles.sectionText}>{statement}</p>
            </li>
          ))}
        </ol>
      ) : paragraphs.map((paragraph, index) => (
        <p className={styles.sectionText} key={`${section.id}-${index}`}>{paragraph}</p>
      ))}
    </section>
  );
}

export function PublisherDecidesLive({
  initialResourceId,
  initialToolEvidenceView = false,
}: {
  initialResourceId?: JournalGuidelineId;
  initialToolEvidenceView?: boolean;
}) {
  const initialSelectedResourceId = initialResourceId ?? DEFAULT_JOURNAL_GUIDELINE_ID;
  const [selectedResourceId, setSelectedResourceId] = useState<JournalGuidelineId>(
    initialSelectedResourceId,
  );
  const selectedGuideline = findJournalGuideline(selectedResourceId);
  if (!selectedGuideline) throw new Error("The journal guideline catalog is unavailable.");
  const followUpPrompt = publisherDecidesFollowUpPrompt(selectedGuideline.id);
  const followUpQuestion = publisherDecidesFollowUpQuestion(selectedGuideline.id);
  const [store] = useState(() => createKnowledgeClientStore());
  const [entitlement, setEntitlement] = useState<PublisherDecidesEntitlement>("entitled");
  const [credentialRecognition, setCredentialRecognition] =
    useState<ProposedAgentCredentialRecognition>("not_recognized");
  const [reader, setReader] = useState<PublicGuidelinesReaderView | null>(null);
  const [responses, setResponses] = useState<Partial<Record<PageTool, KnowledgeResponse>>>({});
  const [articleOpen, setArticleOpen] = useState(Boolean(initialResourceId));
  const [toolEvidenceOpen, setToolEvidenceOpen] = useState(initialToolEvidenceView);
  const [sessionPending, setSessionPending] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyTarget, setCopyTarget] = useState<CopyTarget>("discovery");
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [focusRequested, setFocusRequested] = useState(false);
  const [focusSectionId, setFocusSectionId] = useState<string | null>(null);
  const scenarioController = useRef<AbortController | null>(null);
  const demoDialog = useRef<HTMLDialogElement | null>(null);
  const evidenceDialog = useRef<HTMLDialogElement | null>(null);
  const activeScenarioId = publisherDecidesScenarioFor({
    entitlement,
    credentialRecognition,
  });

  const retrieveResponse = responses.knowledge_retrieve;
  const returnedGrants = responseGrants(retrieveResponse, selectedGuideline.id);
  const returnedGrant = primaryResponseGrant(retrieveResponse, selectedGuideline.id);
  const passageGrants = returnedGrants.filter(
    ({ representation }) =>
      representation === "quotation" || representation === "recommendation",
  );
  const hasFullTextGrant = returnedGrants.some(
    ({ representation }) => representation === "full_text",
  );
  const hasSummaryGrant = returnedGrants.some(
    ({ representation }) => representation === "summary",
  );
  const assurancePolicyRecognized = usesRecognizedCredential(retrieveResponse);
  const readerEntitled = reader?.readerView === "full_guideline";
  const guidelineParts = selectedGuideline.parts.map((part) => ({
    ...part,
    sections: part.sectionIds.flatMap((sectionId) => {
      const section = reader?.sections.find((candidate) => candidate.id === sectionId);
      return section ? [section] : [];
    }),
  }));
  const foundGuidelineIds = useMemo(() => new Set(
    responses.knowledge_search?.resources
      ?.map((resource) => findJournalGuideline(resource.id)?.id)
      .filter((id): id is JournalGuidelineId => Boolean(id)) ?? [],
  ), [responses.knowledge_search?.resources]);

  const prepareScenario = useCallback(async (
    nextEntitlement: PublisherDecidesEntitlement,
    nextCredentialRecognition: ProposedAgentCredentialRecognition,
    resourceId: JournalGuidelineId,
    signal: AbortSignal,
  ) => {
    const session = await selectPublicDemoScenario(
      publisherDecidesScenarioFor({
        entitlement: nextEntitlement,
        credentialRecognition: nextCredentialRecognition,
      }),
      undefined,
      signal,
    );
    if (!session.active) throw new Error("The fictional publisher session did not start.");
    announceDemoSessionChange();
    return getPublicGuidelinesReaderView(signal, resourceId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    scenarioController.current = controller;
    void (async () => {
      const currentSession = await getPublicDemoSession(undefined, controller.signal);
      let displayState = publisherDecidesStateForSession(currentSession);
      if (!displayState) {
        displayState = readPublisherDecidesState() ?? {
          entitlement: "entitled",
          credentialRecognition: "not_recognized",
        };
        await selectPublicDemoScenario(
          publisherDecidesScenarioFor(displayState),
          undefined,
          controller.signal,
        );
        announceDemoSessionChange();
      }
      const scenarioId = publisherDecidesScenarioFor(displayState);
      const storedEvidence = readStoredEvidence(initialSelectedResourceId, scenarioId);
      const nextReader = await getPublicGuidelinesReaderView(
        controller.signal,
        initialSelectedResourceId,
      );
      if (controller.signal.aborted) return;
      setEntitlement(displayState.entitlement);
      setCredentialRecognition(displayState.credentialRecognition);
      setReader(nextReader);
      setResponses(storedEvidence
        ? { knowledge_retrieve: storedEvidence }
        : {});
    })()
      .then(() => {
        setSessionPending(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSessionPending(false);
        setSessionError(error instanceof Error ? error.message : "The journal could not be prepared.");
      });
    return () => controller.abort();
  }, [initialSelectedResourceId]);

  useEffect(() => () => scenarioController.current?.abort(), []);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(DEMO_EVIDENCE_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parseEvidenceChannelMessage(event.data);
      if (!message) return;
      if (message.type === "session_reset") {
        clearPublisherDecidesEvidence();
        setResponses({});
        return;
      }
      if (message.type === "request") {
        const evidence = readStoredEvidence(message.resourceId, message.scenarioId);
        if (evidence) {
          channel.postMessage({ ...message, type: "response", response: evidence });
        }
        return;
      }
      if (message.resourceId !== selectedResourceId
        || message.scenarioId !== activeScenarioId) return;
      writeStoredEvidence(message.resourceId, message.scenarioId, message.response);
      setResponses((current) => ({
        ...current,
        knowledge_retrieve: message.response,
      }));
    };
    channel.postMessage({
      type: "request",
      resourceId: selectedResourceId,
      scenarioId: activeScenarioId,
    } satisfies EvidenceChannelMessage);
    return () => channel.close();
  }, [activeScenarioId, selectedResourceId]);

  useEffect(() => {
    const dialog = evidenceDialog.current;
    if (!dialog) return;
    if (toolEvidenceOpen && !dialog.open) {
      dialog.showModal();
    } else if (!toolEvidenceOpen && dialog.open) {
      dialog.close();
    }
  }, [toolEvidenceOpen]);

  useEffect(() => {
    if (!articleOpen || !focusRequested) return;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(
          focusSectionId ?? selectedGuideline.recommendationSectionId,
        );
        if (!target) return;
        target.scrollIntoView({ behavior: "auto", block: "start" });
        target.focus({ preventScroll: true });
        setFocusRequested(false);
      });
    });
    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) window.cancelAnimationFrame(innerFrame);
    };
  }, [
    articleOpen,
    focusRequested,
    focusSectionId,
    reader,
    selectedGuideline.recommendationSectionId,
    toolEvidenceOpen,
  ]);

  const trackedFetch = useCallback<KnowledgeFetch>(async (input, init) => {
    const tool = toolFromRequest(input);
    const response = await window.fetch(input, init);
    if (tool) {
      let value: unknown;
      try {
        value = await response.clone().json();
      } catch {
        value = undefined;
      }
      if (validateKnowledgeResponse(value).length === 0) {
        const knowledgeResponse = value as KnowledgeResponse;
        const hasMaterialEvidence = knowledgeResponse.grants?.some(
          ({ content }) => typeof content === "string" && content.length > 0,
        ) ?? false;
        setResponses((current) => tool === "knowledge_retrieve" && !hasMaterialEvidence
          ? current
          : { ...current, [tool]: knowledgeResponse });
        if (tool === "knowledge_retrieve") {
          if (hasMaterialEvidence) {
            writeStoredEvidence(
              selectedResourceId,
              publisherDecidesScenarioFor({ entitlement, credentialRecognition }),
              knowledgeResponse,
            );
          }
          setSettingsChanged(false);
        }
      }
    }
    return response;
  }, [credentialRecognition, entitlement, selectedResourceId]);

  const navigation = useMemo<KnowledgeNavigationBoundary>(() => ({
    apply: (intent) => {
      const requestedGuideline = findJournalGuideline(intent.resourceId);
      if (!requestedGuideline) return;
      if (intent.resourceId !== selectedResourceId) {
        setSelectedResourceId(requestedGuideline.id);
        setReader(null);
        setSessionPending(true);
        setSessionError(null);
        void getPublicGuidelinesReaderView(undefined, requestedGuideline.id)
          .then(setReader)
          .catch((error: unknown) => {
            setSessionError(
              error instanceof Error
                ? error.message
                : "The guideline evidence view could not be opened.",
            );
          })
          .finally(() => setSessionPending(false));
      }
      demoDialog.current?.close();
      setArticleOpen(true);
      setToolEvidenceOpen(false);
      setFocusSectionId(
        intent.focus?.kind === "section"
          ? intent.focus.sectionId
          : null,
      );
      setFocusRequested(true);
      setCopyTarget("follow-up");
      setCopyState("idle");
      const sectionId = intent.focus?.kind === "section"
        ? intent.focus.sectionId
        : null;
      const canonicalPath = journalGuidelinePath(requestedGuideline.id);
      window.history.replaceState(
        window.history.state,
        "",
        sectionId
          ? `${canonicalPath}#${encodeURIComponent(sectionId)}`
          : canonicalPath,
      );
    },
  }), [selectedResourceId]);

  async function changeScenario(
    nextEntitlement: PublisherDecidesEntitlement,
    nextCredentialRecognition: ProposedAgentCredentialRecognition,
  ) {
    scenarioController.current?.abort();
    const controller = new AbortController();
    scenarioController.current = controller;
    setEntitlement(nextEntitlement);
    setCredentialRecognition(nextCredentialRecognition);
    setResponses({});
    setSessionPending(true);
    setSessionError(null);
    setSettingsChanged(articleOpen);
    setCopyState("idle");
    writePublisherDecidesState({
      entitlement: nextEntitlement,
      credentialRecognition: nextCredentialRecognition,
    });
    clearPublisherDecidesEvidence();
    announceDemoEvidenceReset();

    try {
      setReader(await prepareScenario(
        nextEntitlement,
        nextCredentialRecognition,
        selectedResourceId,
        controller.signal,
      ));
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setSessionError(error instanceof Error ? error.message : "The journal settings could not be changed.");
    } finally {
      if (!controller.signal.aborted) setSessionPending(false);
    }
  }

  async function copyPrompt(target: CopyTarget) {
    const prompt = target === "discovery"
      ? PUBLISHER_DECIDES_DISCOVERY_PROMPT
      : followUpPrompt;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyTarget(target);
      setCopyState("copied");
    } catch {
      setCopyTarget(target);
      setCopyState("error");
    }
  }

  const hasReturnedEvidence = Boolean(retrieveResponse && returnedGrants.length > 0);
  const isFollowUpStep = articleOpen;
  const modalQuestion = isFollowUpStep
    ? followUpQuestion
    : PUBLISHER_DECIDES_DISCOVERY_QUESTION;
  const supportingSectionId = focusSectionId
    ?? returnedGrant?.locator?.sectionId
    ?? null;
  const pageToolPathname = articleOpen
    ? journalGuidelinePath(selectedGuideline.id)
    : "/demo";
  const agentPackageLabel = returnedGrants.length === 0
    ? "No article text"
    : hasFullTextGrant
      ? "Complete article text"
    : readerEntitled && passageGrants.length > 0
      ? assurancePolicyRecognized
        ? "Expanded supporting evidence"
        : "Complete relevant section"
      : hasSummaryGrant
        ? "Expanded public preview"
        : "Public abstract";
  const readerEntitlementLabel = readerEntitled ? "Full article access" : "Guest preview";
  const agentDataPolicyLabel = assurancePolicyRecognized
    ? "Zero-retention claim recognized"
    : "No qualifying credential recognized";
  const publisherBehaviorSummary = returnedGrants.length === 0
    ? "The publisher supplied no additional article text under these conditions."
    : hasFullTextGrant
      ? "The reader keeps full article access. After recognizing the simulated credential, the publisher supplied the agent with the complete article for transient, attributed use."
    : readerEntitled && passageGrants.length > 0
      ? "The reader keeps full article access. Without a recognized agent credential, the publisher supplied the complete question-matched section rather than the complete article."
      : hasSummaryGrant
        ? "The reader sees the guest preview. The publisher supplied the agent with the public abstract and publisher summary."
        : "The reader sees the guest preview. The publisher supplied the agent with the public abstract only.";
  const permissionResultCopy = buildPermissionResultCopy({
    assurancePolicyRecognized,
    hasFullTextGrant,
    hasQuotationGrant: passageGrants.length === 1,
    hasSummaryGrant,
    readerEntitled,
    sectionTitle: returnedGrant?.locator?.sectionTitle,
  });

  function jumpToSupportingSection() {
    if (!supportingSectionId) return;
    setToolEvidenceOpen(false);
    setFocusSectionId(supportingSectionId);
    setFocusRequested(true);
  }

  return (
    <main className={styles.page} data-article-open={articleOpen}>
      {!sessionPending ? (
        <KnowledgeProviderBridge
          capabilities={PAGE_TOOLS}
          fetch={trackedFetch}
          navigation={navigation}
          pathname={pageToolPathname}
          providerId="journal"
          store={store}
        />
      ) : null}

      <header className={styles.journalHeader}>
        <div className={styles.topBar}>
          <Link className={styles.homeLink} href="/">
            <span aria-hidden="true">←</span> OpenInquiry home
          </Link>
          <p className={styles.productLabel}>OpenInquiry</p>
        </div>
        <div className={styles.journalBrandLine}>
          <Link className={styles.masthead} href="/demo">
            The Journal <em>of</em> Guidelines
          </Link>
          <button
            className={styles.demoLauncher}
            onClick={() => demoDialog.current?.showModal()}
            type="button"
          >
            <strong>Demo controls</strong>
            <ArrowIcon />
          </button>
        </div>
      </header>

      <dialog
        aria-labelledby="demo-controls-title"
        className={styles.demoDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) demoDialog.current?.close();
        }}
        ref={demoDialog}
      >
        <div className={styles.dialogHeader}>
          <p>OpenInquiry demonstration</p>
          <button onClick={() => demoDialog.current?.close()} type="button">Close</button>
        </div>
        <h2 id="demo-controls-title">
          {isFollowUpStep
            ? settingsChanged
              ? "Ask the same question again."
              : "Ask your agent to use the article."
            : "Compare what the publisher supplies."}
        </h2>
        <p className={styles.dialogIntro}>
          {isFollowUpStep
            ? settingsChanged
              ? "The publisher’s conditions changed. Copy the same follow-up and run it again to compare the response."
              : "Copy this follow-up and run it in ChatGPT. Then change the simulated publisher-recognition state and ask the same question again."
            : "Judge-controlled simulation: choose the reader’s access and whether this fictional publisher recognizes a proposed external agent credential. In a real system, the publisher site would read access from the signed-in session, and an independent system would issue and govern the credential. WebMCP does not verify retention or training behavior."}
        </p>
        <div className={styles.dialogControls}>
          <fieldset disabled={sessionPending}>
            <legend><b>01</b> Reader entitlement</legend>
            <div className={styles.radioChoices}>
              <label data-selected={entitlement === "guest"}>
                <input
                  checked={entitlement === "guest"}
                  name="reader-entitlement"
                  onChange={() => void changeScenario("guest", credentialRecognition)}
                  type="radio"
                  value="guest"
                />
                <span>Guest preview</span>
              </label>
              <label data-selected={entitlement === "entitled"}>
                <input
                  checked={entitlement === "entitled"}
                  name="reader-entitlement"
                  onChange={() => void changeScenario("entitled", credentialRecognition)}
                  type="radio"
                  value="entitled"
                />
                <span>Full article access</span>
              </label>
            </div>
          </fieldset>
          <fieldset disabled={sessionPending}>
            <legend>
              <b>02</b> Publisher recognition
              <small>Judge simulation of an external credential; not verified by WebMCP</small>
            </legend>
            <div className={styles.radioChoices}>
              <label data-selected={credentialRecognition === "not_recognized"}>
                <input
                  checked={credentialRecognition === "not_recognized"}
                  name="agent-credential-recognition"
                  onChange={() => void changeScenario(entitlement, "not_recognized")}
                  type="radio"
                  value="not_recognized"
                />
                <span>No qualifying credential recognized</span>
              </label>
              <label data-selected={credentialRecognition === "recognized"}>
                <input
                  checked={credentialRecognition === "recognized"}
                  name="agent-credential-recognition"
                  onChange={() => void changeScenario(entitlement, "recognized")}
                  type="radio"
                  value="recognized"
                />
                <span>Zero-retention claim recognized</span>
              </label>
            </div>
          </fieldset>
        </div>
        <div className={styles.dialogPrompt}>
          <div className={styles.dialogPromptHeader}>
            <span><b>03</b> {isFollowUpStep ? "Follow-up prompt" : "Agent prompt"}</span>
            <button
              aria-live="polite"
              className={styles.promptCopy}
              onClick={() => void copyPrompt(isFollowUpStep ? "follow-up" : "discovery")}
              type="button"
            >
              <CopyIcon />
              {copyState === "copied" && copyTarget === (isFollowUpStep ? "follow-up" : "discovery")
                ? "Copied!"
                : copyState === "error" && copyTarget === (isFollowUpStep ? "follow-up" : "discovery")
                  ? "Copy unavailable"
                  : "Copy prompt"}
            </button>
          </div>
          <blockquote aria-label={isFollowUpStep ? "Follow-up prompt" : "Agent prompt"}>
            <p>
              <span className={styles.dialogPromptLabel}>Question</span>
              <span className={styles.dialogPromptText}>{modalQuestion}</span>
            </p>
            <p className={styles.dialogAgentInstruction}>
              <span className={styles.dialogPromptLabel}>Agent instruction</span>
              <span className={styles.dialogPromptText}>{PUBLISHER_DECIDES_AGENT_INSTRUCTION}</span>
            </p>
          </blockquote>
        </div>
        <div className={styles.dialogDisclosure}>
          <p>This is a fictional publisher using synthetic content. Not for clinical use.</p>
        </div>
      </dialog>

      {sessionError ? <p className={styles.error} role="alert">{sessionError}</p> : null}

      {!articleOpen ? (
        <section className={styles.journalHome} aria-label="August 2026 guidelines">
          <h1 className={styles.visuallyHidden}>The Journal of Guidelines</h1>
          <p className={styles.issueDate}>August 2026</p>
          <div className={styles.guidelineList}>
            {JOURNAL_GUIDELINE_CATALOG.map((guideline, index) => (
              <article data-agent-match={foundGuidelineIds.has(guideline.id)} key={guideline.id}>
                <Link
                  aria-label={`Read ${guideline.title}`}
                  className={styles.guidelineRowLink}
                  href={journalGuidelinePath(guideline.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <small>{guideline.specialty}</small>
                    <h2>{guideline.title}</h2>
                  </div>
                  <p>{guideline.updatedLabel}</p>
                  <i aria-hidden="true">↗</i>
                </Link>
                {foundGuidelineIds.has(guideline.id)
                  ? <strong>Your agent found this guideline</strong>
                  : null}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <article className={styles.article} aria-labelledby="article-title">
          <Link className={styles.backLink} href="/demo">
            ← Return to latest guidelines
          </Link>

          <header className={styles.articleLead}>
            <h1 id="article-title" tabIndex={-1}>{reader?.title ?? selectedGuideline.title}</h1>
            <p>
              {reader?.authors.join(" · ") ?? "The Journal of Guidelines editorial group"}
              {" · "}
              {selectedGuideline.updatedLabel}
            </p>
          </header>

          {retrieveResponse || settingsChanged ? (
            <section
              aria-label="Current publisher permission result"
              aria-live="polite"
              className={styles.accessLens}
            >
              {settingsChanged ? (
                <div className={styles.accessLensCopy}>
                  <span>Settings changed</span>
                  <strong>Ask the same follow-up again.</strong>
                  <p>The previous evidence package has been removed so the next result reflects the current conditions.</p>
                </div>
              ) : hasReturnedEvidence ? (
                <PublisherPermissionResult
                  copy={permissionResultCopy}
                  actions={retrieveResponse ? (
                    <>
                      <button
                        className={styles.evidenceLauncher}
                        onClick={() => setToolEvidenceOpen(true)}
                        type="button"
                      >
                        See what the agent received
                      </button>
                      {readerEntitled && supportingSectionId ? (
                        <button className={styles.supportingJump} onClick={jumpToSupportingSection} type="button">
                          Jump to supporting section ↓
                        </button>
                      ) : null}
                    </>
                  ) : null}
                />
              ) : (
                <div className={styles.accessLensCopy}>
                  <span>What the publisher returned to your agent</span>
                  <strong>The publisher returned no additional article text.</strong>
                  <p>
                    {retrieveResponse?.error?.code === "RATE_LIMITED"
                      ? "The bounded retrieval allowance for this session was reached. "
                      : "The publisher did not grant additional content for this request. "}
                    The reader’s complete article remains available below.
                  </p>
                </div>
              )}
              {!settingsChanged && retrieveResponse && !hasReturnedEvidence ? (
                <div className={styles.viewControls}>
                  <button
                    className={styles.evidenceLauncher}
                    onClick={() => setToolEvidenceOpen(true)}
                    type="button"
                  >
                    See what the agent received
                  </button>
                  {readerEntitled && supportingSectionId ? (
                    <button className={styles.supportingJump} onClick={jumpToSupportingSection} type="button">
                      Jump to supporting section ↓
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <dialog
            aria-labelledby="evidence-view-title"
            className={styles.evidenceDialog}
            onCancel={(event) => {
              event.preventDefault();
              setToolEvidenceOpen(false);
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setToolEvidenceOpen(false);
            }}
            onClose={() => setToolEvidenceOpen(false)}
            ref={evidenceDialog}
          >
            <div className={styles.evidenceDialogBar}>
              <span>Demonstration inspection</span>
              <button onClick={() => setToolEvidenceOpen(false)} type="button">
                Close
              </button>
            </div>
            <section className={styles.evidenceView} aria-labelledby="evidence-view-title">
              <header className={styles.evidenceHeader}>
                <div>
                  <p>Agent evidence</p>
                  <h2 id="evidence-view-title">What the publisher gave the agent</h2>
                  <span>
                    Everything the publisher supplied through Site Tools is shown below. {hasFullTextGrant
                      ? "The response includes the complete article."
                      : "The response does not include the complete article."}
                  </span>
                </div>
              </header>
              {retrieveResponse ? (
                <section
                  aria-label="Selected access conditions and resulting publisher behavior"
                  className={styles.policyMapping}
                >
                  <div className={styles.selectedConditions}>
                    <span>Selected conditions</span>
                    <dl>
                      <div>
                        <dt>Reader entitlement</dt>
                        <dd>{readerEntitlementLabel}</dd>
                      </div>
                      <div>
                        <dt>Publisher recognition <small>Proposed external credential</small></dt>
                        <dd>{agentDataPolicyLabel}</dd>
                      </div>
                    </dl>
                  </div>
                  <div aria-hidden="true" className={styles.policyMapArrow}>
                    <span>Publisher policy applies both</span>
                    <b>→</b>
                  </div>
                  <div className={styles.policyOutcome}>
                    <span>Resulting publisher behavior</span>
                    <strong>{agentPackageLabel}</strong>
                    <p>{publisherBehaviorSummary}</p>
                  </div>
                </section>
              ) : null}
              {settingsChanged ? (
                <div className={styles.evidenceEmpty}>
                  <strong>The demonstration settings changed.</strong>
                  <p>Ask the same question again to create a new response under the current conditions.</p>
                </div>
              ) : retrieveResponse && returnedGrants.length > 0 ? (
                <ol className={styles.evidenceGrants}>
                  {returnedGrants.map((grant, index) => {
                    const sectionId = grant.locator?.sectionId;
                    return (
                      <li
                        key={`${grant.representation}-${sectionId ?? "resource"}-${index}`}
                      >
                        <div>
                          <strong>{evidenceLabel(grant.representation)}</strong>
                          <small>
                            {grant.representation === "abstract" || grant.representation === "summary"
                              ? "Publisher-authored public material"
                              : grant.representation === "full_text"
                                ? "Complete provider-supplied work"
                                : "Protected section selected for this question"}
                          </small>
                        </div>
                        {grant.locator?.sectionTitle ? <h3>{grant.locator.sectionTitle}</h3> : null}
                        <p>{grant.content}</p>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className={styles.evidenceEmpty}>
                  <strong>No source text has been retrieved in this view.</strong>
                  <p>Run the prompt so the publisher can apply the current reader session and tool policy.</p>
                </div>
              )}
              <p className={styles.evidenceBoundary}>
                This record makes the policy visible: reader entitlement and agent assurance are evaluated separately.
              </p>
              {retrieveResponse ? (
                <details className={styles.technicalDetails}>
                  <summary>Protocol details</summary>
                  <dl>
                    <div><dt>Access</dt><dd>{retrieveResponse.access?.basisLabel ?? "Not supplied"}</dd></div>
                    <div>
                      <dt>Source package</dt>
                      <dd>{returnedGrants.map(({ representation }) => evidenceLabel(representation)).join(" + ") || "Not supplied"}</dd>
                    </div>
                    <div><dt>Rights decision</dt><dd>{retrieveResponse.rights?.decision.replaceAll("_", " ") ?? "Not supplied"}</dd></div>
                    <div><dt>Source receipt</dt><dd>{retrieveResponse.receipt.receiptId}</dd></div>
                  </dl>
                  <details>
                    <summary>Raw validated KnowledgeResponse</summary>
                    <pre>{JSON.stringify(retrieveResponse, null, 2)}</pre>
                  </details>
                </details>
              ) : null}
            </section>
          </dialog>

          {readerEntitled ? (
            <div className={styles.fullArticle}>
              <section className={styles.abstract} aria-labelledby="abstract-title">
                <h2 id="abstract-title">Abstract</h2>
                <dl>
                  {selectedGuideline.abstractSections.map((section) => (
                    <div key={section.label}>
                      <dt>{section.label}</dt>
                      <dd>{section.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <details className={styles.contents}>
                <summary>Contents</summary>
                <nav aria-label="Guideline contents">
                  <ol className={styles.contentsParts}>
                  {guidelineParts.map((part) => (
                      <li key={part.id}>
                        <a className={styles.contentsPartLink} href={`#${part.id}`}>
                          <span>{part.label}</span>
                          <strong>{part.title}</strong>
                        </a>
                        <ol>
                          {part.sections.map((section) => (
                            <li key={section.id}>
                              <a href={`#${section.id}`}>
                                <span aria-hidden="true">↳</span>
                                <strong>{section.heading}</strong>
                              </a>
                            </li>
                          ))}
                        </ol>
                      </li>
                    ))}
                  </ol>
                </nav>
              </details>
              {guidelineParts.map((part) => (
                <section className={styles.guidelinePart} id={part.id} key={part.id}>
                  <header className={styles.partHeader}>
                    <p>{part.label}</p>
                    <h2>{part.title}</h2>
                    <span>{part.description}</span>
                  </header>
                  {part.sections.map((section) => (
                    <ReaderSection
                      key={section.id}
                      relevantToQuestion={supportingSectionId === section.id}
                      recommendationSectionId={selectedGuideline.recommendationSectionId}
                      recommendationTitles={selectedGuideline.recommendationTitles}
                      section={section}
                    />
                  ))}
                </section>
              ))}
            </div>
          ) : (
            <section
              className={styles.publicPreview}
              id={selectedGuideline.recommendationSectionId}
              tabIndex={-1}
            >
              <p>Public preview</p>
              <h2>Abstract and citation</h2>
              <div>{reader?.abstract}</div>
              <strong>Sign in through an eligible subscription to read the complete guideline.</strong>
            </section>
          )}

        </article>
      )}

    </main>
  );
}

// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { ProposedAgentCredentialRecognition } from "@/src/lib/demo/scenario";
import {
  announceDemoSessionChange,
  getPublicDemoSession,
  selectPublicDemoScenario,
} from "@/src/lib/integration/demo-session-client";
import {
  announceDemoEvidenceReset,
  clearPublisherDecidesEvidence,
} from "@/src/lib/integration/demo-evidence-client";

import {
  PUBLISHER_DECIDES_AGENT_INSTRUCTION,
  PUBLISHER_DECIDES_DISCOVERY_PROMPT,
  PUBLISHER_DECIDES_DISCOVERY_QUESTION,
} from "./publisher-decides-prompts";
import {
  publisherDecidesScenarioFor,
  publisherDecidesStateForSession,
  readPublisherDecidesState,
  writePublisherDecidesState,
  type PublisherDecidesEntitlement,
  type PublisherDecidesState,
} from "./publisher-decides-scenario";
import styles from "./publisher-decides-demo.module.css";

const STEP_COUNT = 3;

function subscribeToHydration() {
  return () => {};
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12h15M14 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export function PublisherDecidesDemo() {
  const [step, setStep] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [entitlement, setEntitlement] = useState<PublisherDecidesEntitlement>("entitled");
  const [credentialRecognition, setCredentialRecognition] =
    useState<ProposedAgentCredentialRecognition>("not_recognized");
  const [sessionPending, setSessionPending] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionController = useRef<AbortController | null>(null);
  const interactive = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    const controller = new AbortController();
    sessionController.current = controller;
    void getPublicDemoSession(undefined, controller.signal)
      .then((session) => {
        if (controller.signal.aborted) return;
        const state = publisherDecidesStateForSession(session)
          ?? readPublisherDecidesState();
        if (state) {
          setEntitlement(state.entitlement);
          setCredentialRecognition(state.credentialRecognition);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSessionError("The demo settings could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionPending(false);
      });

    return () => sessionController.current?.abort();
  }, []);

  async function changeScenario(nextState: PublisherDecidesState) {
    const previousState = { entitlement, credentialRecognition } satisfies PublisherDecidesState;
    sessionController.current?.abort();
    const controller = new AbortController();
    sessionController.current = controller;
    setEntitlement(nextState.entitlement);
    setCredentialRecognition(nextState.credentialRecognition);
    setSessionPending(true);
    setSessionError(null);

    try {
      const session = await selectPublicDemoScenario(
        publisherDecidesScenarioFor(nextState),
        undefined,
        controller.signal,
      );
      if (!session.active) throw new Error("The fictional publisher session did not start.");
      writePublisherDecidesState(nextState);
      clearPublisherDecidesEvidence();
      announceDemoEvidenceReset();
      announceDemoSessionChange();
    } catch {
      if (controller.signal.aborted) return;
      setEntitlement(previousState.entitlement);
      setCredentialRecognition(previousState.credentialRecognition);
      setSessionError("The demo setting could not be changed.");
    } finally {
      if (!controller.signal.aborted) setSessionPending(false);
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PUBLISHER_DECIDES_DISCOVERY_PROMPT);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.homeLink} href="/">
          <span aria-hidden="true">←</span> OpenInquiry home
        </Link>
        <p>A proposal built on experimental WebMCP</p>
      </header>

      <section className={styles.stage} aria-live="polite">
        <div className={styles.progress} aria-label={`Step ${step + 1} of ${STEP_COUNT}`}>
          <span>{String(step + 1).padStart(2, "0")}</span>
          <i aria-hidden="true"><b style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }} /></i>
          <span>{String(STEP_COUNT).padStart(2, "0")}</span>
        </div>

        {step === 0 ? (
          <div className={styles.step} key="intro">
            <p className={styles.eyebrow}>How the live demonstration works</p>
            <h1>You are a reader bringing ChatGPT to a medical journal.</h1>
            <ol className={styles.walkthroughList}>
              <li>
                <span>
                  <strong>Open the medical journal.</strong>
                  <small>Open the fictional journal in a simulated signed-in session.</small>
                </span>
              </li>
              <li>
                <span>
                  <strong>Ask one question.</strong>
                  <small>Paste an ordinary research question into this browser’s agent.</small>
                </span>
              </li>
              <li>
                <span>
                  <strong>Watch the publisher answer.</strong>
                  <small>The journal searches its own content and returns only what its policy allows.</small>
                </span>
              </li>
            </ol>
            <div className={styles.stepActions}>
              <button
                className={styles.next}
                disabled={!interactive}
                onClick={() => setStep(1)}
                type="button"
              >
                Continue <ArrowIcon />
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className={styles.step} key="scenario">
            <p className={styles.eyebrow}>How the live demonstration works</p>
            <h1>The publisher checks two conditions before deciding what to return.</h1>
            <div className={styles.policyOverview}>
              <ol className={`${styles.walkthroughList} ${styles.conditionList}`}>
              <li>
                <fieldset
                  aria-label="Reader entitlement options"
                  className={styles.condition}
                  disabled={!interactive || sessionPending}
                >
                  <legend>
                    <strong>Reader access</strong>
                    <small>What the reader can open</small>
                  </legend>
                  <div className={styles.conditionOptions}>
                    <label className={styles.conditionOption} data-selected={entitlement === "guest"}>
                      <input
                        aria-label="Guest preview"
                        checked={entitlement === "guest"}
                        name="intro-reader-entitlement"
                        onChange={() => void changeScenario({ entitlement: "guest", credentialRecognition })}
                        type="radio"
                      />
                      <span>
                        <b>Guest preview</b>
                      </span>
                    </label>
                    <label className={styles.conditionOption} data-selected={entitlement === "entitled"}>
                      <input
                        aria-label="Full article access"
                        checked={entitlement === "entitled"}
                        name="intro-reader-entitlement"
                        onChange={() => void changeScenario({ entitlement: "entitled", credentialRecognition })}
                        type="radio"
                      />
                      <span>
                        <b>Full article access</b>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </li>
              <li>
                <fieldset
                  aria-label="Proposed agent policy signal options"
                  className={styles.condition}
                  disabled={!interactive || sessionPending}
                >
                  <legend>
                    <strong>Proposed agent credential</strong>
                    <small>Judge-controlled simulation; not verified by WebMCP.</small>
                  </legend>
                  <div className={styles.conditionOptions}>
                    <label className={styles.conditionOption} data-selected={credentialRecognition === "not_recognized"}>
                      <input
                        aria-label="No qualifying credential recognized"
                        checked={credentialRecognition === "not_recognized"}
                        name="intro-agent-credential-recognition"
                        onChange={() => void changeScenario({ entitlement, credentialRecognition: "not_recognized" })}
                        type="radio"
                      />
                      <span>
                        <b>Not recognized by publisher</b>
                      </span>
                    </label>
                    <label className={styles.conditionOption} data-selected={credentialRecognition === "recognized"}>
                      <input
                        aria-label="Zero-retention claim recognized"
                        checked={credentialRecognition === "recognized"}
                        name="intro-agent-credential-recognition"
                        onChange={() => void changeScenario({ entitlement, credentialRecognition: "recognized" })}
                        type="radio"
                      />
                      <span>
                        <b>Zero-retention claim recognized</b>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </li>
              </ol>
              <div className={styles.policyOutcome}>
                {sessionError ? (
                  <p className={styles.sessionError} role="status">{sessionError}</p>
                ) : null}
                <section className={styles.policyMatrix}>
                  <table>
                <caption>Expected Site Tool response</caption>
                <colgroup>
                  <col className={styles.policyMatrixRowColumn} />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr className={styles.policyMatrixAxisRow}>
                    <td aria-hidden="true" />
                    <th colSpan={2} scope="colgroup">Publisher recognition</th>
                  </tr>
                  <tr>
                    <th scope="col">Reader access</th>
                    <th scope="col">Not recognized</th>
                    <th scope="col">Recognized</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Guest preview</th>
                    <td
                      aria-current={entitlement === "guest" && credentialRecognition === "not_recognized"}
                      data-current={entitlement === "guest" && credentialRecognition === "not_recognized"}
                    >
                      Public abstract
                    </td>
                    <td
                      aria-current={entitlement === "guest" && credentialRecognition === "recognized"}
                      data-current={entitlement === "guest" && credentialRecognition === "recognized"}
                    >
                      Abstract + publisher summary
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Full article access</th>
                    <td
                      aria-current={entitlement === "entitled" && credentialRecognition === "not_recognized"}
                      data-current={entitlement === "entitled" && credentialRecognition === "not_recognized"}
                    >
                      Complete relevant section
                    </td>
                    <td
                      aria-current={entitlement === "entitled" && credentialRecognition === "recognized"}
                      data-current={entitlement === "entitled" && credentialRecognition === "recognized"}
                    >
                      Complete article text
                    </td>
                  </tr>
                </tbody>
                  </table>
                </section>
              </div>
            </div>
            <div className={styles.stepActions}>
              <button
                className={styles.next}
                disabled={!interactive}
                onClick={() => setStep(2)}
                type="button"
              >
                Continue <ArrowIcon />
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.step} key="prompt">
            <h1>How to run the demo</h1>
            <ol className={`${styles.walkthroughList} ${styles.actionList}`}>
              <li>
                <div className={styles.promptStep}>
                  <strong>Copy the prompt below.</strong>
                  <div className={styles.promptRow}>
                    <blockquote>
                      <p className={styles.promptParagraph}>
                        <span className={styles.promptLabel}>Question</span>
                        <span className={styles.promptText}>{PUBLISHER_DECIDES_DISCOVERY_QUESTION}</span>
                      </p>
                      <p className={`${styles.promptParagraph} ${styles.promptInstruction}`}>
                        <span className={styles.promptLabel}>Agent instruction</span>
                        <span className={styles.promptText}>{PUBLISHER_DECIDES_AGENT_INSTRUCTION}</span>
                      </p>
                    </blockquote>
                    <button
                      aria-label={copyState === "copied" ? "Prompt copied" : "Copy prompt"}
                      className={styles.promptCopy}
                      onClick={() => void copyPrompt()}
                      type="button"
                    >
                      {copyState === "copied" ? "Copied!" : "Copy"}
                    </button>
                    <span aria-live="polite" className={styles.copyStatus}>
                      {copyState === "copied"
                        ? "Prompt copied."
                        : copyState === "error"
                          ? "Copy unavailable. Select the prompt manually."
                          : ""}
                    </span>
                  </div>
                </div>
              </li>
              <li><span><strong>Open the journal.</strong></span></li>
              <li>
                <span>
                  <strong>Paste the prompt into this browser’s agent.</strong>
                </span>
              </li>
              <li>
                <span>
                  <strong>Open Demo controls and change reader access or publisher recognition.</strong>
                </span>
              </li>
              <li>
                <span>
                  <strong>Ask the same question again and compare what the publisher returns.</strong>
                </span>
              </li>
            </ol>
            <div className={styles.finalActions}>
              <Link href="/demo">
                Open the Journal of Guidelines <ArrowIcon />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <footer className={styles.controls}>
        <button
          disabled={!interactive || step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          type="button"
        >
          Back
        </button>
        <span>Fictional publisher and synthetic content · Not for clinical use</span>
      </footer>
    </main>
  );
}

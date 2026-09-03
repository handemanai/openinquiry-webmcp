// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from "react";

import styles from "./publisher-permission-result.module.css";

type PermissionResultCopyInput = Readonly<{
  assurancePolicyRecognized: boolean;
  hasFullTextGrant: boolean;
  hasSummaryGrant: boolean;
  hasQuotationGrant: boolean;
  readerEntitled: boolean;
  sectionTitle?: string;
}>;

export type PermissionResultCopy = Readonly<{
  conditions: readonly [string, string];
  explanation: string;
  headline: readonly [readerOutcome: string, agentOutcome: string];
}>;

export function buildPermissionResultCopy({
  assurancePolicyRecognized,
  hasFullTextGrant,
  hasSummaryGrant,
  hasQuotationGrant,
  readerEntitled,
  sectionTitle = "the relevant section",
}: PermissionResultCopyInput): PermissionResultCopy {
  const readerCondition = readerEntitled ? "Full article access" : "Guest preview";
  const policyCondition = assurancePolicyRecognized
    ? "Zero-retention claim recognized"
    : "No qualifying credential recognized";

  if (readerEntitled && assurancePolicyRecognized && hasFullTextGrant) {
    return {
      conditions: [readerCondition, policyCondition],
      headline: ["Full article for you.", "Complete article for your agent."],
      explanation:
        "The publisher recognized the simulated credential and supplied the complete article for transient, attributed use under its stated rights policy.",
    };
  }

  if (!readerEntitled && hasSummaryGrant) {
    return {
      conditions: [readerCondition, policyCondition],
      headline: ["Preview access for you.", "A broader summary for your agent."],
      explanation:
        "The publisher did not provide the weekly minutes or strength-training frequency.",
    };
  }

  if (!readerEntitled) {
    return {
      conditions: [readerCondition, policyCondition],
      headline: ["Preview access for you.", "Public abstract for your agent."],
      explanation:
        "The publisher did not provide the weekly minutes or strength-training frequency.",
    };
  }

  if (hasQuotationGrant) {
    return {
      conditions: [readerCondition, policyCondition],
      headline: ["Full article for you.", "The relevant section for your agent."],
      explanation:
        `The publisher supplied the complete “${sectionTitle}” section while preserving your full article access.`,
    };
  }

  return {
    conditions: [readerCondition, policyCondition],
    headline: ["Full article for you.", "Public material for your agent."],
    explanation: "The publisher did not provide protected guideline text to the agent.",
  };
}

export function PublisherPermissionResult({
  actions,
  copy,
}: Readonly<{
  actions?: ReactNode;
  copy: PermissionResultCopy;
}>) {
  return (
    <div className={styles.result}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Publisher decision</p>
        <h2 className={styles.headline}>
          <span>{copy.headline[0]}</span>
          <span>{copy.headline[1]}</span>
        </h2>
        <p className={styles.explanation}>{copy.explanation}</p>
        <p className={styles.conditions}>
          <span>{copy.conditions[0]}</span>
          <i aria-hidden="true">•</i>
          <span>{copy.conditions[1]}</span>
        </p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

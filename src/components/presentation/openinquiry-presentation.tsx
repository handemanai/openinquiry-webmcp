// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import styles from "./openinquiry-presentation.module.css";

export const PRESENTATION_BEATS = [
  {
    id: "opening-provocation",
    eyebrow: "A WebMCP proposal",
    title: "OpenInquiry",
    body: "OpenInquiry builds on experimental WebMCP so people can bring their own agents to expert content on the publisher's terms.",
    visualBeat: 15,
  },
  {
    id: "three-parties",
    eyebrow: "The relationship",
    title: "Any solution has to work for all three.",
    body: "The publisher sets the terms. The person brings their own agent. The agent receives only what the publisher permits.",
    visualBeat: 16,
  },
  {
    id: "physician-lens",
    eyebrow: "A concrete demonstration",
    title: "Let’s use healthcare as an example.",
    body: "OpenInquiry can apply wherever people want their agents to access expert content.",
    visualBeat: 2,
  },
  {
    id: "before-agents",
    eyebrow: "Before agents",
    title: "Finding evidence meant visiting each source.",
    body: "Physicians search society guidance, journals, hospital libraries, and clinical books one source at a time.",
    visualBeat: 3,
  },
  {
    id: "agent-era",
    eyebrow: "Your agent today",
    title: "Your access does not automatically extend to your agent.",
    body: "A subscription, society membership, or hospital-library login lets you read the content. It does not create an authorized path for your agent.",
    visualBeat: 4,
  },
  {
    id: "licensed-content",
    eyebrow: "Content partnerships",
    title: "Some agents access publisher content through direct partnerships.",
    body: "They make participating sources easier to search, cite, and revisit, but you have to use their agent and their content network.",
    visualBeat: 5,
  },
  {
    id: "vision",
    eyebrow: "The OpenInquiry vision",
    title: "Your agent works through the publisher’s signed-in site.",
    body: "The reader keeps full access in the publisher’s own experience.\nThe publisher decides what its Site Tools return to the agent.",
    visualBeat: 6,
  },
  {
    id: "webmcp-and-openinquiry",
    eyebrow: "The connection",
    title: "WebMCP creates the connection.\nOpenInquiry defines the publisher’s response.",
    body: "The reader uses the agent they choose.\nThe publisher remains the source and keeps its relationship with the reader.",
    visualBeat: 17,
  },
  {
    id: "policy-inputs",
    eyebrow: "Example publisher policy",
    title: "The publisher can consider two signals.",
    body: "In this demonstration, the publisher considers the reader’s access and whether it recognizes a proposed credential about the agent’s data handling. The judge controls that simulated credential; WebMCP does not verify it.",
    visualBeat: 7,
  },
  {
    id: "permission-set",
    eyebrow: "Example publisher policy",
    title: "This demo maps those conditions to four exact results.",
    body: "The publisher chooses among four response types. These are demonstration policy choices, not WebMCP defaults. Every response identifies the source and links back to it.",
    visualBeat: 8,
  },
  {
    id: "public-baseline",
    eyebrow: "Example publisher policy",
    title: "With neither condition, the agent receives the public abstract.",
    body: "Guest preview plus no qualifying credential recognized returns the public source record and abstract.",
    visualBeat: 9,
  },
  {
    id: "middle-ground",
    eyebrow: "Example publisher policy",
    title: "Each single-condition state returns a different package.",
    body: "Guest preview plus recognized assurance returns the abstract and publisher summary. Full article access without recognized assurance returns the complete relevant section.",
    visualBeat: 10,
  },
  {
    id: "signed-in-zdr",
    eyebrow: "Example publisher policy",
    title: "Both conditions are required for complete article text.",
    body: "When the reader has full article access and the publisher recognizes the simulated zero-retention claim, the agent receives the complete article. The publisher’s terms still prohibit storage, redistribution, training, and bulk export.",
    visualBeat: 11,
  },
  {
    id: "standards-provocation",
    eyebrow: "The proposal",
    title: "Why build OpenInquiry on WebMCP?",
    body: "WebMCP lets the publisher expose controlled tools on its live, signed-in site. OpenInquiry proposes a shared response format for the content, source, status, rights, and links those tools return.",
    visualBeat: 18,
  },
  {
    id: "authorized-return",
    eyebrow: "The result",
    title: "Bring your own agent. The publisher still sets the terms.",
    body: "Your agent works through the live publisher site and receives only what the publisher permits. Every response identifies the source and links back to it.",
    visualBeat: 14,
  },
] as const;

const STORY_ACTIVATION_OFFSET = 0.72;

export function getActiveBeatIndex(scrollTop: number, viewportHeight: number, beatCount: number) {
  if (beatCount <= 1 || viewportHeight <= 0) {
    return 0;
  }

  const indexedPosition = Math.floor(scrollTop / viewportHeight + STORY_ACTIVATION_OFFSET);
  return Math.min(beatCount - 1, Math.max(0, indexedPosition));
}

const RESOURCE_CARDS = [
  { title: "Society Website", x: 300 },
  { title: "Journal Website", x: 550 },
  { title: "Hospital Library", x: 800 },
  { title: "Clinical eBook", x: 1050 },
] as const;

type ArrowLabelProps = {
  align?: "start" | "middle" | "end";
  code?: string;
  plain: string;
  tone?: "request" | "response";
  width: number;
  x: number;
  y: number;
};

const VISION_LABELS: ReadonlyArray<ArrowLabelProps> = [
  { align: "start", plain: "Physician opens source", width: 210, x: 487, y: 444 },
  {
    align: "end",
    plain: "Relevant sources assembled for review",
    tone: "response",
    width: 280,
    x: 347,
    y: 486,
  },
  {
    align: "end",
    code: "knowledge_retrieve",
    plain: "Agent requests via WebMCP",
    width: 240,
    x: 1113,
    y: 444,
  },
  {
    align: "start",
    code: "KnowledgeResponse",
    plain: "Publisher returns permitted content",
    tone: "response",
    width: 280,
    x: 1253,
    y: 486,
  },
  { plain: "Physician asks", width: 170, x: 800, y: 610 },
  {
    plain: "Agent answers with permitted source material",
    tone: "response",
    width: 330,
    x: 800,
    y: 724,
  },
];

const AGENT_ERA_LABELS: ReadonlyArray<ArrowLabelProps> = [
  {
    align: "end",
    code: "knowledge_access",
    plain: "Agent requests source access",
    width: 250,
    x: 1114,
    y: 462,
  },
  { plain: "Physician asks", width: 170, x: 800, y: 610 },
  {
    plain: "Agent answers",
    tone: "response",
    width: 170,
    x: 800,
    y: 724,
  },
];

const LICENSED_LABELS: ReadonlyArray<ArrowLabelProps> = [
  {
    align: "start",
    plain: "Physician follows source link",
    width: 246,
    x: 487,
    y: 444,
  },
  {
    align: "end",
    plain: "Canonical source opens",
    tone: "response",
    width: 228,
    x: 347,
    y: 486,
  },
  {
    align: "end",
    code: "knowledge_retrieve",
    plain: "Agent requests permitted content",
    width: 282,
    x: 1113,
    y: 444,
  },
  {
    align: "start",
    code: "KnowledgeResponse",
    plain: "Publisher returns permitted content",
    tone: "response",
    width: 280,
    x: 1253,
    y: 486,
  },
  { plain: "Physician asks", width: 170, x: 800, y: 610 },
  {
    plain: "Agent answers with permitted source material",
    tone: "response",
    width: 330,
    x: 800,
    y: 724,
  },
];

const SOURCE_CONTROL_LABELS: ReadonlyArray<ArrowLabelProps> = [
  { plain: "Physician asks", width: 170, x: 800, y: 610 },
  {
    plain: "Agent answers with permitted source material",
    tone: "response",
    width: 330,
    x: 800,
    y: 724,
  },
];

const SOURCE_AUTHORITY_LABELS: ReadonlyArray<ArrowLabelProps> = [
  {
    align: "end",
    code: "knowledge_retrieve",
    plain: "Agent requests authorized use",
    width: 282,
    x: 1113,
    y: 444,
  },
  {
    align: "start",
    code: "KnowledgeResponse",
    plain: "Relevant section + citation + source page link",
    tone: "response",
    width: 306,
    x: 1253,
    y: 486,
  },
];

const TRUSTED_HANDLING_LABELS: ReadonlyArray<ArrowLabelProps> = [
  {
    align: "end",
    code: "external credential: recognized",
    plain: "Proposed policy signal",
    width: 282,
    x: 1113,
    y: 444,
  },
  {
    align: "start",
    code: "KnowledgeResponse",
    plain: "Complete article + citation + source link",
    tone: "response",
    width: 306,
    x: 1253,
    y: 486,
  },
];

function getLabelGeometry({ align = "middle", width, x }: ArrowLabelProps) {
  return {
    align,
    plateX: align === "end" ? x - width : align === "start" ? x : x - width / 2,
    textX: align === "end" ? x - 12 : align === "start" ? x + 12 : x,
  };
}

function getFlowTiming(delay: number, duration: number) {
  return {
    "--flow-delay": `${delay}ms`,
    "--flow-duration": `${duration}ms`,
  } as CSSProperties;
}

function ArrowLabelPlate(props: ArrowLabelProps) {
  const { plateX } = getLabelGeometry(props);
  const hasCode = Boolean(props.code);

  return (
    <rect
      className={styles.labelPlate}
      height={hasCode ? 54 : 34}
      rx="3"
      width={props.width}
      x={plateX}
      y={props.y - (hasCode ? 30 : 17)}
    />
  );
}

function ArrowLabelText(props: ArrowLabelProps) {
  const { align, textX } = getLabelGeometry(props);

  return (
    <g className={styles.arrowLabel} data-tone={props.tone ?? "request"}>
      {props.code ? (
        <text className={styles.codeLabel} textAnchor={align} x={textX} y={props.y - 9}>
          {props.code}
        </text>
      ) : null}
      <text className={styles.plainLabel} textAnchor={align} x={textX} y={props.code ? props.y + 13 : props.y + 5}>
        {props.plain}
      </text>
    </g>
  );
}

function BoxNode({
  height,
  kicker,
  subtitle,
  title,
  tone = "light",
  width,
  x,
  y,
}: {
  height: number;
  kicker?: string;
  subtitle?: string;
  title: string;
  tone?: "light" | "dark" | "person";
  width: number;
  x: number;
  y: number;
}) {
  return (
    <g className={styles.node} data-tone={tone}>
      <rect className={styles.nodeOuter} height={height} rx="6" width={width} x={x} y={y} />
      <rect
        className={styles.nodeInner}
        height={height - 16}
        rx="2"
        width={width - 16}
        x={x + 8}
        y={y + 8}
      />
      {kicker ? (
        <text
          className={styles.nodeKicker}
          textAnchor="middle"
          x={x + width / 2}
          y={y + height / 2 - (subtitle ? 40 : 34)}
        >
          {kicker}
        </text>
      ) : null}
      <text
        className={styles.nodeTitle}
        textAnchor="middle"
        x={x + width / 2}
        y={y + height / 2 + (subtitle ? 6 : 14)}
      >
        {title}
      </text>
      {subtitle ? (
        <text className={styles.nodeSubtitle} textAnchor="middle" x={x + width / 2} y={y + height / 2 + 38}>
          {subtitle}
        </text>
      ) : null}
    </g>
  );
}

function ResourceCard({
  index,
  title,
  x,
}: (typeof RESOURCE_CARDS)[number] & { index: number }) {
  return (
    <g className={styles.resourceCard} style={{ "--card-index": index } as CSSProperties}>
      <rect className={styles.resourceCardOuter} height="118" rx="4" width="200" x={x} y="136" />
      <rect className={styles.resourceCardInner} height="102" rx="1" width="184" x={x + 8} y="144" />
      <text className={styles.resourceTitle} textAnchor="middle" x={x + 100} y="205">
        {title}
      </text>
    </g>
  );
}

function SourceAccessPorts() {
  return (
    <>
      <rect
        className={styles.directAccessPortMask}
        height="94"
        rx="6"
        width="310"
        x="290"
        y="292"
      />
      <g
        className={`${styles.accessPortLayer} ${styles.directAccessPortLayer}`}
        data-shared-node="direct-source-access"
      >
        <rect className={styles.accessPortOuter} height="94" rx="6" width="310" x="290" y="292" />
        <rect className={styles.accessPortInner} height="78" rx="2" width="294" x="298" y="300" />
        <text className={styles.accessPortEyebrow} textAnchor="middle" x="445" y="321">
          SOURCE ACCESS
        </text>
        <g className={`${styles.accessPortState} ${styles.directAccessStateOpening}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="445" y="355">
            USER SIGNED IN
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.directAccessStateOwnSignIn}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="445" y="355">
            PHYSICIAN’S OWN SIGN-IN
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.directAccessStatePhysician}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="445" y="355">
            PHYSICIAN’S SIGNED-IN ACCESS
          </text>
        </g>
      </g>

      <g
        className={`${styles.accessPortLayer} ${styles.agentAccessPortLayer}`}
        data-shared-node="agent-source-access"
      >
        <rect className={styles.accessPortOuter} height="94" rx="6" width="310" x="1000" y="292" />
        <rect className={styles.accessPortInner} height="78" rx="2" width="294" x="1008" y="300" />
        <text
          className={`${styles.accessPortEyebrow} ${styles.agentAccessDefaultEyebrow}`}
          textAnchor="middle"
          x="1155"
          y="321"
        >
          SOURCE ACCESS
        </text>
        <text
          className={`${styles.accessPortEyebrow} ${styles.agentAccessPolicyEyebrow}`}
          textAnchor="middle"
          x="1155"
          y="321"
        >
          PUBLISHER POLICY
        </text>
        <g className={`${styles.accessPortState} ${styles.agentAccessStateOpening}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            SITE APPLIES READER’S SIGN-IN
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStateDenied}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            NO AUTHORIZED AGENT PATH
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStatePartnership}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            CONTENT PARTNERSHIPS
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStatePhysician}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            SITE APPLIES PHYSICIAN’S SIGN-IN
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStateReaderSession}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            SITE APPLIES READER SESSION
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStateSourceBounded}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            RELEVANT SECTION AUTHORIZED
          </text>
        </g>
        <g className={`${styles.accessPortState} ${styles.agentAccessStateSourceFull}`}>
          <text className={styles.accessPortStateText} textAnchor="middle" x="1155" y="355">
            COMPLETE ARTICLE AUTHORIZED
          </text>
        </g>
      </g>
    </>
  );
}

function PolicyFocus() {
  return (
    <>
      <g className={styles.policyFocusLayer} data-transition-layer="policy-focus">
        <rect className={styles.policyFocusOuter} height="660" rx="8" width="1170" x="215" y="40" />
        <rect className={styles.policyFocusInner} height="628" rx="3" width="1138" x="231" y="56" />

        <g className={styles.policyFocusContent}>
          <text className={styles.policyFocusEyebrow} x="270" y="101">
            EXAMPLE PUBLISHER POLICY
          </text>
          <g className={`${styles.policyFocusBeatTitle} ${styles.policyFocusBeat7Title}`}>
            <text className={styles.policyFocusTitle} x="270" y="154">
              The publisher can consider two signals.
            </text>
            <text className={styles.policyFocusBody} x="270" y="190">
              <tspan x="270">The publisher considers the reader’s access and whether it recognizes a</tspan>
              <tspan x="270" dy="30">proposed agent credential. The judge controls that simulated credential.</tspan>
            </text>
          </g>
          <g className={`${styles.policyFocusBeatTitle} ${styles.policyFocusBeat8Title}`}>
            <text className={styles.policyFocusTitle} x="270" y="154">
              This demo maps those conditions to four exact results.
            </text>
            <text className={styles.policyFocusBody} x="270" y="190">
              <tspan x="270">The publisher chooses among four response types. These are demonstration policy choices,</tspan>
              <tspan x="270" dy="30">not WebMCP defaults. Every response identifies the source and links back to it.</tspan>
            </text>
          </g>
          <g className={`${styles.policyFocusBeatTitle} ${styles.policyFocusBeat9Title}`}>
            <text className={styles.policyFocusTitle} x="270" y="154">
              With neither condition, the agent receives the public abstract.
            </text>
            <text className={styles.policyFocusBody} x="270" y="190">
              <tspan x="270">Guest preview plus no qualifying credential recognized returns</tspan>
              <tspan x="270" dy="30">the public source record and abstract.</tspan>
            </text>
          </g>
          <g className={`${styles.policyFocusBeatTitle} ${styles.policyFocusBeat10Title}`}>
            <text className={styles.policyFocusTitle} x="270" y="154">
              Each single-condition state returns a different package.
            </text>
            <text className={styles.policyFocusBody} x="270" y="190">
              <tspan x="270">Guest + recognized: abstract and publisher summary.</tspan>
              <tspan x="270" dy="30">Full access + not recognized: complete relevant section.</tspan>
            </text>
          </g>
          <g className={`${styles.policyFocusBeatTitle} ${styles.policyFocusBeat11Title}`}>
            <text className={styles.policyFocusTitle} x="270" y="154">
              Both conditions are required for complete article text.
            </text>
            <text className={styles.policyFocusBody} x="270" y="190">
              <tspan x="270">Full article access plus a recognized zero-retention claim returns the complete article.</tspan>
              <tspan x="270" dy="30">The publisher still prohibits storage, redistribution, training, and bulk export.</tspan>
            </text>
          </g>
          <path className={styles.policyFocusDivider} d="M270 250 H1330" />

          <g className={styles.policyFocusIntro}>
            <g className={styles.policyGateUserInput}>
              <rect className={styles.policyGateUserFill} height="160" rx="5" width="390" x="300" y="274" />
              <text className={styles.policyGateEyebrow} x="328" y="309">READER ENTITLEMENT</text>
              <rect className={`${styles.policyGateUserStateFill} ${styles.policyGateUserNotSignedState}`} height="42" rx="2" width="334" x="328" y="327" />
              <text className={`${styles.policyGateStateText} ${styles.policyGateUserStateText}`} x="346" y="354">GUEST PREVIEW</text>
              <rect className={`${styles.policyGateUserStateFill} ${styles.policyGateUserSignedState}`} height="42" rx="2" width="334" x="328" y="377" />
              <text className={`${styles.policyGateStateText} ${styles.policyGateUserStateText}`} x="346" y="404">FULL ARTICLE ACCESS</text>
            </g>

            <g className={styles.policyGateAgentInput}>
              <rect className={styles.policyGateAgentFill} height="160" rx="5" width="390" x="910" y="274" />
              <text className={styles.policyGateAgentEyebrow} x="938" y="309">DATA-USE ASSURANCE</text>
              <g className={styles.policyGateProposedTag}>
                <rect className={styles.policyGateProposedTagFill} height="28" rx="14" width="104" x="1168" y="283" />
                <text className={styles.policyGateProposedTagText} textAnchor="middle" x="1220" y="302">PROPOSED</text>
              </g>
              <rect className={`${styles.policyGateAgentStateFill} ${styles.policyGateAgentUnverifiedState}`} height="42" rx="2" width="334" x="938" y="327" />
              <text className={`${styles.policyGateStateText} ${styles.policyGateAgentStateText}`} x="956" y="354">NOT RECOGNIZED BY PUBLISHER</text>
              <rect className={`${styles.policyGateAgentStateFill} ${styles.policyGateAgentZdrState}`} height="42" rx="2" width="334" x="938" y="377" />
              <text className={`${styles.policyGateStateText} ${styles.policyGateAgentStateText}`} x="956" y="404">ZERO-RETENTION CLAIM RECOGNIZED</text>
            </g>

            <g className={styles.policyGateSynthesis}>
              <path className={`${styles.policyGatePath} ${styles.policyGateUserPath}`} d="M495 434 C495 474 650 494 700 520" pathLength="1" />
              <path className={`${styles.policyGatePath} ${styles.policyGateAgentPath}`} d="M1105 434 C1105 474 950 494 900 520" pathLength="1" />

              <g className={styles.policyGateCore}>
                <rect className={styles.policyGateCoreOuter} height="118" rx="6" width="400" x="600" y="510" />
                <rect className={styles.policyGateCoreInner} height="102" rx="2" width="384" x="608" y="518" />
                <text className={styles.policyGateCoreCode} textAnchor="middle" x="800" y="560">evaluateRetrieval(input)</text>
                <text className={styles.policyGateCoreTitle} textAnchor="middle" x="800" y="594">→ KnowledgeResponse</text>
              </g>
            </g>
          </g>

          <g className={styles.policyPermissionSet} data-policy-grants="four-state-demo">
            <rect className={styles.policyPermissionOuter} height="260" rx="8" width="940" x="330" y="725" />
            <rect className={styles.policyPermissionInner} height="236" rx="3" width="916" x="342" y="737" />
            <text className={styles.policyPermissionEyebrow} x="380" y="765">THIS DEMO’S FOUR POLICY RESULTS</text>
            <text className={styles.policyPermissionFunction} textAnchor="end" x="1230" y="765">RESPONSE: GRANT + CANONICAL LINK</text>

            <g className={styles.policyPermissionRow}>
              <rect className={styles.policyPermissionRowFill} height="40" rx="2" width="850" x="380" y="783" />
              <text className={styles.policyPermissionCode} x="400" y="809">PUBLIC ABSTRACT</text>
              <text className={styles.policyPermissionDescription} x="820" y="809">Guest · not recognized</text>
            </g>
            <g className={styles.policyPermissionRow}>
              <rect className={styles.policyPermissionRowFill} height="40" rx="2" width="850" x="380" y="831" />
              <text className={styles.policyPermissionCode} x="400" y="857">ABSTRACT + PUBLISHER SUMMARY</text>
              <text className={styles.policyPermissionDescription} x="820" y="857">Guest · recognized</text>
            </g>
            <g className={styles.policyPermissionRow}>
              <rect className={styles.policyPermissionRowFill} height="40" rx="2" width="850" x="380" y="879" />
              <text className={styles.policyPermissionCode} x="400" y="905">COMPLETE RELEVANT SECTION</text>
              <text className={styles.policyPermissionDescription} x="820" y="905">Full access · not recognized</text>
            </g>
            <g className={styles.policyPermissionRow}>
              <rect className={styles.policyPermissionRowFill} height="40" rx="2" width="850" x="380" y="927" />
              <text className={styles.policyPermissionCode} x="400" y="953">COMPLETE ARTICLE TEXT</text>
              <text className={styles.policyPermissionDescription} x="820" y="953">Full access · recognized</text>
            </g>
          </g>

          <g className={styles.policyEvaluation} data-policy-evaluation="publisher-policy">
            <path className={`${styles.policyEvaluationPath} ${styles.policyEvaluationUserPath}`} d="M495 434 C495 474 620 494 660 520" pathLength="1" />
            <path className={`${styles.policyEvaluationPath} ${styles.policyEvaluationAgentPath}`} d="M1105 434 C1105 474 980 494 940 520" pathLength="1" />

            <g className={styles.policyEvaluationCore} data-policy-core-alignment="beat-8">
              <rect className={styles.policyEvaluationCoreOuter} height="118" rx="6" width="600" x="500" y="510" />
              <rect className={styles.policyEvaluationCoreInner} height="102" rx="2" width="584" x="508" y="518" />
              <text className={styles.policyEvaluationCoreCode} x="530" y="548">evaluateRetrieval(input)</text>
              <text className={styles.policyEvaluationCoreLabel} textAnchor="end" x="1070" y="548">→ KnowledgeResponse</text>
              <g className={`${styles.policyEvaluationResult} ${styles.policyEvaluationResult00}`}>
                <text className={styles.policyEvaluationResultCode} x="530" y="580">PUBLIC ABSTRACT</text>
                <text className={styles.policyEvaluationResultDescription} x="530" y="604">Guest · not recognized</text>
              </g>
              <g className={`${styles.policyEvaluationResult} ${styles.policyEvaluationResult01}`}>
                <text className={styles.policyEvaluationResultCode} x="530" y="580">ABSTRACT + PUBLISHER SUMMARY</text>
                <text className={styles.policyEvaluationResultDescription} x="530" y="604">Guest · recognized</text>
              </g>
              <g className={`${styles.policyEvaluationResult} ${styles.policyEvaluationResult10}`}>
                <text className={styles.policyEvaluationResultCode} x="530" y="580">COMPLETE RELEVANT SECTION</text>
                <text className={styles.policyEvaluationResultDescription} x="530" y="604">Full access · not recognized</text>
              </g>
              <g className={`${styles.policyEvaluationResult} ${styles.policyEvaluationResultMiddle}`}>
                <text className={styles.policyEvaluationResultCode} x="530" y="580">TWO DISTINCT SINGLE-CONDITION RESULTS</text>
                <text className={styles.policyEvaluationResultDescription} x="530" y="604">See the two highlighted policy cells below</text>
              </g>
              <g className={`${styles.policyEvaluationResult} ${styles.policyEvaluationResult11}`}>
                <text className={styles.policyEvaluationResultCode} x="530" y="580">COMPLETE ARTICLE TEXT</text>
                <text className={styles.policyEvaluationResultDescription} x="530" y="604">Full access · recognized</text>
              </g>
            </g>
          </g>

          <g className={styles.policyProgressMap} data-policy-map="two-by-two" data-policy-map-placement="below-policy-panel">
            <rect className={styles.policyProgressMapOuter} height="200" rx="8" width="940" x="330" y="725" />
            <rect className={styles.policyProgressMapInner} height="176" rx="3" width="916" x="342" y="737" />
            <text className={styles.policyProgressMapEyebrow} x="380" y="765">POLICY MAP</text>
            <text className={styles.policyProgressColumnLabel} textAnchor="middle" x="743" y="765">NOT RECOGNIZED BY PUBLISHER</text>
            <text className={styles.policyProgressColumnLabel} textAnchor="middle" x="1073" y="765">ZERO-RETENTION CLAIM RECOGNIZED</text>

            <rect className={styles.policyProgressRowFill} height="48" width="190" x="380" y="785" />
            <text className={styles.policyProgressRowLabel} textAnchor="middle" x="475" y="815">GUEST PREVIEW</text>
            <rect className={styles.policyProgressRowFill} height="48" width="190" x="380" y="849" />
            <text className={styles.policyProgressRowLabel} textAnchor="middle" x="475" y="879">FULL ARTICLE ACCESS</text>

            <g className={`${styles.policyProgressCell} ${styles.policyProgressCell00}`}>
              <rect className={styles.policyProgressCellFill} height="48" width="314" x="586" y="785" />
              <text className={styles.policyProgressCellText} textAnchor="middle" x="743" y="815">PUBLIC ABSTRACT</text>
            </g>
            <g className={`${styles.policyProgressCell} ${styles.policyProgressCell01}`}>
              <rect className={styles.policyProgressCellFill} height="48" width="314" x="916" y="785" />
              <text className={styles.policyProgressCellText} textAnchor="middle" x="1073" y="815">ABSTRACT + SUMMARY</text>
            </g>
            <g className={`${styles.policyProgressCell} ${styles.policyProgressCell10}`}>
              <rect className={styles.policyProgressCellFill} height="48" width="314" x="586" y="849" />
              <text className={styles.policyProgressCellText} textAnchor="middle" x="743" y="879">COMPLETE SECTION</text>
            </g>
            <g className={`${styles.policyProgressCell} ${styles.policyProgressCell11}`}>
              <rect className={styles.policyProgressCellFill} height="48" width="314" x="916" y="849" />
              <text className={styles.policyProgressCellText} textAnchor="middle" x="1073" y="879">COMPLETE ARTICLE TEXT</text>
            </g>
          </g>
        </g>
      </g>

    </>
  );
}

function OpeningProvocation() {
  return (
    <g className={styles.openingProvocationLayer} data-transition-layer="opening-provocation">
      <g className={styles.openingProvocationLine}>
        <text className={styles.openingProvocationText} x="210" y="96">
          <tspan x="210">People want to bring their own agents</tspan>
          <tspan x="210" dy="56">to publisher content.</tspan>
        </text>
      </g>

      <g className={`${styles.openingProvocationLine} ${styles.openingPublisherLine}`}>
        <text className={styles.openingProvocationText} textAnchor="end" x="1390" y="284">
          <tspan x="1390">Publishers want to protect their work</tspan>
          <tspan x="1390" dy="56">and keep their relationship with readers.</tspan>
        </text>
      </g>

      <path className={styles.openingProvocationRule} d="M210 402 H1390" />

      <g className={`${styles.openingProvocationLine} ${styles.openingWebMcpQuestion}`}>
        <text className={`${styles.openingProvocationText} ${styles.openingProvocationQuestionText}`} textAnchor="middle" x="800" y="528">
          <tspan x="800">Could WebMCP let publishers control</tspan>
          <tspan x="800" dy="62">how users’ agents access their content?</tspan>
        </text>
      </g>
    </g>
  );
}

function WebMcpAndOpenInquiry() {
  const webMcpDetails = [
    "Named tools run on the page",
    "and return structured results.",
  ] as const;
  const openInquiryDetails = [
    "The publisher determines",
    "what the agent gets.",
    "Every result links to the source.",
  ] as const;
  const outcomeDetails = [
    "The reader chooses the agent.",
    "The publisher keeps the relationship.",
  ] as const;

  return (
    <g className={styles.profileLayers} data-transition-layer="webmcp-and-openinquiry">
      <path className={styles.profileDefinitionRule} d="M210 796 H1390" />
      <path className={styles.profileDefinitionDivider} d="M600 824 V1000" />
      <path className={styles.profileDefinitionDivider} d="M1000 824 V1000" />

      <g className={styles.profileDefinition}>
        <text className={styles.profileDefinitionEyebrow} x="240" y="840">WEBMCP OFFERS</text>
        <text className={styles.profileDefinitionTitle} x="240" y="892">Tools on the live page</text>
        {webMcpDetails.map((detail, index) => (
          <text className={styles.profileDefinitionDetail} key={detail} x="240" y={930 + index * 30}>
            {detail}
          </text>
        ))}
      </g>

      <g className={`${styles.profileDefinition} ${styles.profileDefinitionOpenInquiry}`}>
        <text className={styles.profileDefinitionEyebrow} x="640" y="840">OPENINQUIRY PROPOSES</text>
        <text className={styles.profileDefinitionTitle} x="640" y="892">Publisher decides</text>
        {openInquiryDetails.map((detail, index) => (
          <text className={styles.profileDefinitionDetail} key={detail} x="640" y={930 + index * 30}>
            {detail}
          </text>
        ))}
      </g>

      <g className={`${styles.profileDefinition} ${styles.profileDefinitionOutcome}`}>
        <text className={styles.profileDefinitionEyebrow} x="1040" y="840">WHAT THIS ENABLES</text>
        <text className={styles.profileDefinitionTitle} x="1040" y="892">Bring your own agent</text>
        {outcomeDetails.map((detail, index) => (
          <text className={styles.profileDefinitionDetail} key={detail} x="1040" y={930 + index * 30}>
            {detail}
          </text>
        ))}
      </g>
    </g>
  );
}

const WEBMCP_CAPABILITIES = [
  "The user can view content in the publisher’s own experience.",
  "The publisher controls what its Site Tools return to the agent.",
] as const;

const COMPLEMENTARY_ROUTES = [
  "MCP and APIs connect agents to backend services.",
  "Computer use can operate pages that do not expose Site Tools.",
] as const;

const OPENINQUIRY_ADDITIONS = [
  "Shared tools, profile discovery, and response formats.",
  "Access rules and permitted content.",
  "How a separately governed agent-handling credential could be checked.",
] as const;

function StandardsProvocation() {
  return (
    <g className={styles.standardsProvocationLayer} data-transition-layer="standards-provocation">
      <g className={styles.standardsProvocationSection} style={{ "--section-index": 0 } as CSSProperties}>
        <text className={styles.standardsStepNumber} x="220" y="68">01</text>
        <text className={styles.standardsSectionHeading} x="300" y="68">The publisher defines what its Site Tools do</text>
        {WEBMCP_CAPABILITIES.map((item, index) => (
          <text className={styles.standardsLine} key={item} x="300" y={124 + index * 44}>{item}</text>
        ))}
        <path className={styles.standardsSectionRule} d="M300 204 H1380" />
      </g>

      <g className={styles.standardsProvocationSection} style={{ "--section-index": 1 } as CSSProperties}>
        <text className={styles.standardsStepNumber} x="220" y="268">02</text>
        <text className={styles.standardsSectionHeading} x="300" y="268">Other interfaces still have a role</text>
        {COMPLEMENTARY_ROUTES.map((item, index) => (
          <text className={styles.standardsLine} key={item} x="300" y={324 + index * 44}>{item}</text>
        ))}
        <path className={styles.standardsSectionRule} d="M300 412 H1380" />
      </g>

      <g className={styles.standardsProvocationSection} style={{ "--section-index": 2 } as CSSProperties}>
        <text className={styles.standardsStepNumber} x="220" y="476">03</text>
        <text className={styles.standardsSectionHeading} x="300" y="476">OpenInquiry would define the publisher’s response</text>
        {OPENINQUIRY_ADDITIONS.map((item, index) => (
          <text className={styles.standardsLine} key={item} x="300" y={532 + index * 44}>{item}</text>
        ))}
      </g>
    </g>
  );
}

function AnchoredRelationshipDiagram({ visualBeat }: { visualBeat: number }) {
  const descriptions: Record<number, string> = {
    15: "People want to bring their own agents to publisher content. Publishers want to protect their work and keep their relationship with readers. The slide asks whether WebMCP can let publishers control how users’ agents access their content.",
    16: "Three participants share the relationship: the publisher, the human, and the human's agent. No connections are shown yet.",
    17: "The relationship remains visible but recedes around the emphasized agent-to-publisher connection. WebMCP creates the connection, and OpenInquiry defines the publisher’s response, so the reader can use the agent they choose while the publisher remains the source and keeps its relationship with the reader.",
    18: "The closing proposal explains why OpenInquiry would build on WebMCP. The publisher’s live, signed-in site remains in the interaction, and the publisher defines what its Site Tools do. OpenInquiry proposes a shared response format for the content, source, status, rights, and links those tools return.",
  };
  const existingDescriptions = [
    "A Human signs in to a Publisher, their Agent uses that access through WebMCP, and the Human and Agent exchange labeled requests and responses.",
    "A Physician and an Agent remain anchored below a shared Publisher frame as healthcare becomes the demonstration.",
    "A Physician uses their own signed-in access to search four expert resources separately, then inspects what each source returns.",
    "A Physician can work with their own Agent, but the source access check finds no authorized path for the Agent to use the physician’s permissioned publisher content.",
    "An Agent with direct content partnerships queries participating publishers and returns a grounded answer with permitted source material. The physician can follow a canonical link to the publisher under their own signed-in access.",
    "The physician’s own Agent uses the physician’s signed-in access through WebMCP. The Publisher returns permitted content and keeps a visible set of relevant sources assembled for the physician to review.",
    "The publisher can consider two signals: the reader’s access and whether it recognizes a proposed credential about the agent’s data handling. The judge controls that simulated credential; WebMCP does not verify it.",
    "This demo maps the two conditions to four exact results. The publisher chooses among four response types, which are demonstration policy choices rather than WebMCP defaults. Every response identifies the source and links back to it.",
    "Guest preview plus no qualifying credential recognized returns the public source record and abstract.",
    "The two single-condition outcomes are distinct. Guest preview plus recognized assurance returns the abstract and publisher summary. Full article access without recognized assurance returns the complete relevant section.",
    "When the reader has full article access and the publisher recognizes the simulated zero-retention claim, the agent receives the complete article. The publisher’s terms still prohibit storage, redistribution, training, and bulk export.",
    "The two single-condition outcomes are distinct. Guest preview plus recognized assurance returns the abstract and publisher summary. Full article access without recognized assurance returns the complete relevant section.",
    "When the reader has full article access and the publisher recognizes the simulated zero-retention claim, the agent receives the complete article. The publisher’s terms still prohibit storage, redistribution, training, and bulk export.",
    "The publisher policy panel contracts back into the relationship diagram. The physician's own agent works through the signed-in publisher site, which decides what the source returns.",
  ] as const;

  const description = descriptions[visualBeat] ?? existingDescriptions[visualBeat - 1] ?? existingDescriptions[0];

  return (
    <svg
      aria-label={description}
      className={styles.relationshipDiagram}
      role="img"
      viewBox="0 0 1600 780"
    >
      <defs>
        <marker
          id="presentation-arrow-ink"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          markerWidth="12"
          orient="auto"
          refX="10"
          refY="6"
        >
          <path className={styles.markerInk} d="M1 1 L10 6 L1 11" />
        </marker>
        <marker
          id="presentation-arrow-oxide"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          markerWidth="12"
          orient="auto"
          refX="10"
          refY="6"
        >
          <path className={styles.markerOxide} d="M1 1 L10 6 L1 11" />
        </marker>
      </defs>

      <OpeningProvocation />
      <WebMcpAndOpenInquiry />
      <StandardsProvocation />

      <g className={styles.resourceFrameLayer} data-shared-node="resources">
        <rect className={styles.resourceFrame} height="300" rx="6" width="1100" x="250" y="34" />
        <rect className={styles.resourceFrameInner} height="268" rx="2" width="1068" x="266" y="50" />
      </g>

      <g data-transition-layer="resource-title">
        <text className={styles.resourcesTitle} textAnchor="middle" x="800" y="205">
          Publisher
        </text>
      </g>

      <g data-transition-layer="resource-detail">
        {RESOURCE_CARDS.map((card, index) => (
          <ResourceCard index={index} key={card.title} {...card} />
        ))}
      </g>

      <g className={styles.beforeOnly} data-transition-layer="before-agents">
        <path
          className={`${styles.resourceRequestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
          d="M392 574 L462 398"
          markerEnd="url(#presentation-arrow-ink)"
          pathLength="1"
          style={getFlowTiming(60, 520)}
        />
        <path
          className={`${styles.resourceRequestPath} ${styles.flowPath}`}
          d="M400 310 H1150"
          pathLength="1"
          style={getFlowTiming(430, 520)}
        />
        {RESOURCE_CARDS.map((card, index) => (
          <path
            className={`${styles.resourceRequestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d={`M${card.x + 100} 310 V254`}
            key={`request-${card.title}`}
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(700 + index * 80, 260)}
          />
        ))}
        <rect className={styles.railLabelPlate} height="29" rx="3" width="174" x="690" y="277" />
        <text className={styles.railLabel} x="702" y="298">
          search each source
        </text>

        {RESOURCE_CARDS.map((card, index) => (
          <path
            className={`${styles.resourceResponsePath} ${styles.flowPath}`}
            d={`M${card.x + 100} 136 V116`}
            key={`response-${card.title}`}
            pathLength="1"
            style={getFlowTiming(980 + index * 45, 280)}
          />
        ))}
        <path
          className={`${styles.resourceResponsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
          d="M1150 116 H225 V500 H300 V574"
          markerEnd="url(#presentation-arrow-oxide)"
          pathLength="1"
          style={getFlowTiming(1120, 680)}
        />
        <g className={styles.resourceResponseLabel} data-flow-label="response-inspection">
          <rect className={styles.railLabelPlate} height="29" rx="3" width="186" x="258" y="79" />
          <text className={`${styles.railLabel} ${styles.railLabelResponse}`} x="270" y="100">
            inspect each result
          </text>
        </g>
      </g>

      <g className={styles.visionOnly} data-transition-layer="vision">
        <g data-label-layer="plates">
          <g className={styles.visionHumanPublisher} data-relationship-channel="human-publisher">
            {VISION_LABELS.slice(0, 2).map((label) => (
              <ArrowLabelPlate key={`plate-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.visionAgentPublisher} data-relationship-channel="agent-publisher">
            {VISION_LABELS.slice(2, 4).map((label) => (
              <ArrowLabelPlate key={`plate-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.visionHumanAgent} data-relationship-channel="human-agent">
            {VISION_LABELS.slice(4).map((label) => (
              <ArrowLabelPlate key={`plate-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
        </g>

        <g data-arrow-layer="vision">
          <g className={styles.visionHumanPublisher} data-relationship-channel="human-publisher">
            <path
              className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
              d="M392 574 L462 398"
              markerEnd="url(#presentation-arrow-ink)"
              pathLength="1"
              style={getFlowTiming(80, 620)}
            />
            <path
              className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
              d="M428 398 L358 574"
              markerEnd="url(#presentation-arrow-oxide)"
              pathLength="1"
              style={getFlowTiming(300, 620)}
            />
          </g>
          <g className={styles.visionAgentPublisher} data-relationship-channel="agent-publisher">
            <path
              className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
              d="M1208 574 L1138 398"
              markerEnd="url(#presentation-arrow-ink)"
              pathLength="1"
              style={getFlowTiming(150, 620)}
            />
            <path
              className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
              d="M1172 398 L1242 574"
              markerEnd="url(#presentation-arrow-oxide)"
              pathLength="1"
              style={getFlowTiming(370, 620)}
            />
          </g>
          <g className={styles.visionHumanAgent} data-relationship-channel="human-agent">
            <path
              className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
              d="M596 648 H1004"
              markerEnd="url(#presentation-arrow-ink)"
              pathLength="1"
              style={getFlowTiming(220, 620)}
            />
            <path
              className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
              d="M1004 680 H596"
              markerEnd="url(#presentation-arrow-oxide)"
              pathLength="1"
              style={getFlowTiming(440, 620)}
            />
          </g>
        </g>

        <g data-label-layer="text">
          <g className={styles.visionHumanPublisher} data-relationship-channel="human-publisher">
            {VISION_LABELS.slice(0, 2).map((label) => (
              <ArrowLabelText key={`text-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.visionAgentPublisher} data-relationship-channel="agent-publisher">
            {VISION_LABELS.slice(2, 4).map((label) => (
              <ArrowLabelText key={`text-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.visionHumanAgent} data-relationship-channel="human-agent">
            {VISION_LABELS.slice(4).map((label) => (
              <ArrowLabelText key={`text-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
        </g>
      </g>

      <g className={styles.sourceControlOnly} data-transition-layer="source-control">
        <g data-label-layer="source-control-plates">
          {SOURCE_CONTROL_LABELS.map((label) => (
            <ArrowLabelPlate key={`source-control-plate-${label.code ?? label.plain}`} {...label} />
          ))}
          <g className={styles.sourceAuthorityState} data-policy-state="source-authority">
            {SOURCE_AUTHORITY_LABELS.map((label) => (
              <ArrowLabelPlate key={`source-authority-plate-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.trustedHandlingState} data-policy-state="trusted-handling">
            {TRUSTED_HANDLING_LABELS.map((label) => (
              <ArrowLabelPlate key={`trusted-handling-plate-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
        </g>

        <g data-arrow-layer="source-control">
          <path
            className={`${styles.requestPath} ${styles.sourceContextPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M392 574 L462 398"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(80, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.sourceContextPath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M428 398 L358 574"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(300, 620)}
          />
          <path
            className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M1208 574 L1138 398"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(150, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M1172 398 L1242 574"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(370, 620)}
          />
          <path
            className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M596 648 H1004"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(220, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M1004 680 H596"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(440, 620)}
          />
        </g>

        <g data-label-layer="source-control-text">
          {SOURCE_CONTROL_LABELS.map((label) => (
            <ArrowLabelText key={`source-control-text-${label.code ?? label.plain}`} {...label} />
          ))}
          <g className={styles.sourceAuthorityState} data-policy-state="source-authority">
            {SOURCE_AUTHORITY_LABELS.map((label) => (
              <ArrowLabelText key={`source-authority-text-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
          <g className={styles.trustedHandlingState} data-policy-state="trusted-handling">
            {TRUSTED_HANDLING_LABELS.map((label) => (
              <ArrowLabelText key={`trusted-handling-text-${label.code ?? label.plain}`} {...label} />
            ))}
          </g>
        </g>
      </g>

      <g className={styles.agentEraOnly} data-transition-layer="agent-era">
        <g data-label-layer="agent-era-plates">
          {AGENT_ERA_LABELS.map((label) => (
            <ArrowLabelPlate key={`agent-era-plate-${label.code ?? label.plain}`} {...label} />
          ))}
        </g>

        <g data-arrow-layer="agent-era">
          <path
            className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M1208 574 L1138 398"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(180, 620)}
          />
          <path
            className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M596 648 H1004"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(220, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M1004 680 H596"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(440, 620)}
          />
        </g>

        <g data-label-layer="agent-era-text">
          {AGENT_ERA_LABELS.map((label) => (
            <ArrowLabelText key={`agent-era-text-${label.code ?? label.plain}`} {...label} />
          ))}
        </g>
      </g>

      <g className={styles.licensedOnly} data-transition-layer="licensed-content">
        <g data-label-layer="licensed-plates">
          {LICENSED_LABELS.map((label) => (
            <ArrowLabelPlate key={`licensed-plate-${label.code ?? label.plain}`} {...label} />
          ))}
        </g>

        <g data-arrow-layer="licensed-content">
          <g className={styles.licensedCanonicalPath} data-flow-path="canonical-source-followup">
            <path
              className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
              d="M392 574 L462 398"
              markerEnd="url(#presentation-arrow-ink)"
              pathLength="1"
              style={getFlowTiming(180, 620)}
            />
            <path
              className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
              d="M428 398 L358 574"
              markerEnd="url(#presentation-arrow-oxide)"
              pathLength="1"
              style={getFlowTiming(430, 620)}
            />
          </g>

          <path
            className={`${styles.requestPath} ${styles.licensedChannelPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M1208 574 L1138 398"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(220, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.licensedChannelPath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M1172 398 L1242 574"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(430, 620)}
          />
          <path
            className={`${styles.requestPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M596 648 H1004"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(100, 620)}
          />
          <path
            className={`${styles.responsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M1004 680 H596"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(560, 620)}
          />
          <path
            className={`${styles.parkedConnectionPath} ${styles.flowPath} ${styles.flowArrowInk}`}
            d="M350 742 V820"
            markerEnd="url(#presentation-arrow-ink)"
            pathLength="1"
            style={getFlowTiming(760, 360)}
          />
          <path
            className={`${styles.parkedConnectionResponsePath} ${styles.flowPath} ${styles.flowArrowOxide}`}
            d="M400 820 V742"
            markerEnd="url(#presentation-arrow-oxide)"
            pathLength="1"
            style={getFlowTiming(900, 360)}
          />
        </g>

        <g data-label-layer="licensed-text">
          {LICENSED_LABELS.map((label) => (
            <ArrowLabelText key={`licensed-text-${label.code ?? label.plain}`} {...label} />
          ))}
        </g>
      </g>

      <SourceAccessPorts />

      <g className={styles.humanLayer} data-shared-node="human">
        <BoxNode
          height={140}
          title={visualBeat === 1 || visualBeat === 16 ? "Human" : "Physician"}
          tone="person"
          width={410}
          x={170}
          y={590}
        />
      </g>

      <g className={styles.agentLayer} data-shared-node="agent">
        <BoxNode height={140} title="Agent" tone="dark" width={410} x={1020} y={590} />
      </g>

      <g className={styles.personalAgentLayer} data-shared-node="personal-agent">
        <BoxNode height={140} kicker="YOUR" title="Agent" tone="dark" width={410} x={1020} y={590} />
      </g>

      <g className={styles.licensedAgentLayer} data-shared-node="licensed-service-agent">
        <BoxNode
          height={140}
          kicker="THIRD-PARTY"
          subtitle="WITH CONTENT PARTNERSHIPS"
          title="Agent"
          tone="dark"
          width={410}
          x={1020}
          y={590}
        />
      </g>

      <PolicyFocus />
    </svg>
  );
}

export function OpenInquiryPresentation() {
  const [activeBeat, setActiveBeat] = useState(0);
  const [narrativeBeat, setNarrativeBeat] = useState(0);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const activePresentationBeat = PRESENTATION_BEATS[activeBeat] ?? PRESENTATION_BEATS[0];
  const narrativePresentationBeat = PRESENTATION_BEATS[narrativeBeat] ?? PRESENTATION_BEATS[0];

  const scrollToBeat = (index: number) => {
    const story = storyRef.current;

    if (!story || index < 0 || index >= PRESENTATION_BEATS.length) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const storyTop = story.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: storyTop + index * window.innerHeight,
    });
  };

  useEffect(() => {
    const story = storyRef.current;

    if (!story) {
      return;
    }

    const documentElement = document.documentElement;
    const previousScrollBehavior = documentElement.style.scrollBehavior;
    documentElement.style.scrollBehavior = "auto";

    const requestedBeat = new URLSearchParams(window.location.search).get("beat");
    const requestedIndex = requestedBeat ? Number.parseInt(requestedBeat, 10) - 1 : -1;
    const hashIndex = PRESENTATION_BEATS.findIndex((beat) => `#beat-${beat.id}` === window.location.hash);
    const initialIndex = hashIndex >= 0 ? hashIndex : requestedIndex;
    let initialFrame = 0;
    let scrollFrame = 0;
    let storyTop = story.getBoundingClientRect().top + window.scrollY;
    const readActiveBeat = () => {
      scrollFrame = 0;
      const nextBeat = getActiveBeatIndex(
        window.scrollY - storyTop,
        window.innerHeight,
        PRESENTATION_BEATS.length,
      );
      setActiveBeat(nextBeat);
    };
    const queueActiveBeat = () => {
      if (scrollFrame) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(readActiveBeat);
    };
    const handleResize = () => {
      storyTop = story.getBoundingClientRect().top + window.scrollY;
      queueActiveBeat();
    };

    initialFrame = window.requestAnimationFrame(() => {
      if (initialIndex >= 0 && initialIndex < PRESENTATION_BEATS.length) {
        window.scrollTo({ top: storyTop + initialIndex * window.innerHeight });
        setActiveBeat(initialIndex);
        setNarrativeBeat(initialIndex);
        return;
      }

      readActiveBeat();
    });

    window.addEventListener("scroll", queueActiveBeat, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", queueActiveBeat);
      window.removeEventListener("resize", handleResize);
      documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  useEffect(() => {
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 90;
    const timer = window.setTimeout(() => setNarrativeBeat(activeBeat), delay);

    return () => window.clearTimeout(timer);
  }, [activeBeat]);

  return (
    <main
      className={styles.presentation}
      data-active-beat={activePresentationBeat.visualBeat}
      data-narrative-beat={narrativeBeat + 1}
      data-story-index={activeBeat + 1}
    >
      <header className={styles.presentationHeader}>
        <Link className={styles.homeLink} href="/">
          <span aria-hidden="true">←</span> OpenInquiry home
        </Link>
        <p aria-label={`Beat ${activeBeat + 1} of ${PRESENTATION_BEATS.length}`}>
          <span>{String(activeBeat + 1).padStart(2, "0")}</span> / {String(PRESENTATION_BEATS.length).padStart(2, "0")}
        </p>
      </header>

      <div className={styles.story} ref={storyRef}>
        <div className={styles.stage}>
          <div
            className={styles.narrativeViewport}
            data-narrative-id={narrativePresentationBeat.id}
            data-narrative-beat={narrativeBeat + 1}
            data-narrative-viewport="top-band"
          >
            {PRESENTATION_BEATS.map((beat, index) => {
              const narrativeState =
                index < narrativeBeat ? "past" : index === narrativeBeat ? "active" : "future";

              return (
                <div
                  aria-hidden={narrativeBeat !== index}
                  className={styles.narrativeBand}
                  data-opening={index === 0 ? "true" : "false"}
                  data-narrative-state={narrativeState}
                  key={beat.id}
                >
                  <div className={styles.narrativeCopy}>
                    <p>{beat.eyebrow}</p>
                    {index === 0 ? (
                      <h1>{beat.title}</h1>
                    ) : (
                      <h2 data-title-lines={beat.title.includes("\n") ? "2" : "1"}>
                        {beat.title.split("\n").map((line, lineIndex) => (
                          <Fragment key={`${beat.id}-title-${lineIndex}`}>
                            {lineIndex === 0 ? null : <br />}
                            {line}
                          </Fragment>
                        ))}
                      </h2>
                    )}
                    <span>
                      {beat.body.split("\n").map((line, lineIndex) => (
                        <Fragment key={`${beat.id}-body-${lineIndex}`}>
                          {lineIndex === 0 ? null : <br />}
                          {line}
                        </Fragment>
                      ))}
                    </span>
                    {index === PRESENTATION_BEATS.length - 1 ? (
                      <a className={styles.demoAction} href="/demo/publisher-decides">
                        Try the live demo →
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.canvasShell}>
            <AnchoredRelationshipDiagram visualBeat={activePresentationBeat.visualBeat} />
          </div>

          <p className={styles.scrollCue}>
            Scroll <span aria-hidden="true">↓</span>
          </p>

          <nav className={styles.beatNavigation} aria-label="Jump to a presentation beat">
            {PRESENTATION_BEATS.map((beat, index) => (
              <button
                aria-current={activeBeat === index ? "step" : undefined}
                aria-label={`Beat ${index + 1}: ${beat.title}`}
                key={beat.id}
                onClick={() => scrollToBeat(index)}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </nav>
        </div>

        <div aria-label="Presentation beats" className={styles.beatTrack}>
          {PRESENTATION_BEATS.map((beat, index) => (
            <section
              aria-current={activeBeat === index ? "step" : undefined}
              aria-label={beat.title}
              className={styles.beat}
              data-story-beat={index + 1}
              id={`beat-${beat.id}`}
              key={beat.id}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

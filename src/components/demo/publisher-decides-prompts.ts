// SPDX-License-Identifier: Apache-2.0

import type { JournalGuidelineId } from "@/src/lib/demo/journal-guidelines-catalog";

export const PUBLISHER_DECIDES_DISCOVERY_QUESTION_LINES = [
  "According to the current Physical Activity for Adults guideline",
  "available from the journal on this page, how much physical activity",
  "should an adult aim for each week? Include aerobic activity and muscle-strengthening activity.",
] as const;

export const PUBLISHER_DECIDES_DISCOVERY_QUESTION =
  PUBLISHER_DECIDES_DISCOVERY_QUESTION_LINES.join(" ");

export const PUBLISHER_DECIDES_AGENT_INSTRUCTION =
  "Use only the Site Tools exposed by this page. Check the publication’s current status. Request full_text with this question as focusedQuery and accept any representation the publisher substitutes. Answer only from returned evidence, preserve attribution, and leave the exact supporting section open. Do not fill gaps from model knowledge or ordinary page reading.";

function withAgentInstruction(question: string) {
  return `Question:\n${question}\n\nAgent instruction:\n${PUBLISHER_DECIDES_AGENT_INSTRUCTION}`;
}

export const PUBLISHER_DECIDES_DISCOVERY_PROMPT = withAgentInstruction(
  PUBLISHER_DECIDES_DISCOVERY_QUESTION,
);

export const PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS = {
  "journal-guideline-2026-041":
    "How much physical activity should an adult aim for each week? Include aerobic activity and strength training, and leave the relevant section open.",
  "journal-guideline-2026-039":
    "What does the High Blood Pressure in Adults guideline recommend after an elevated reading? Explain how to confirm it, what context to assess, and how the plan should be reviewed. Leave the section that best supports your answer open.",
  "journal-guideline-2026-036":
    "What does the Type 2 Diabetes Screening guideline recommend after an adult is screened? Explain how to handle an abnormal result and what follow-up should be arranged. Leave the section that best supports your answer open.",
  "journal-guideline-2026-033":
    "What does the Antibiotic Treatment for Pneumonia guideline say should guide the initial plan? Include the care setting, treatment choice, and when to reassess. Leave the section that best supports your answer open.",
  "journal-guideline-2026-029":
    "How does the Adult Vaccination Schedules guideline recommend reviewing an adult’s vaccination needs and turning missing doses into a plan? Include what history to check, how to use the current schedule, and what to document. Leave the section that best supports your answer open.",
} as const satisfies Record<JournalGuidelineId, string>;

export const PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS = {
  "journal-guideline-2026-041": withAgentInstruction(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-041"],
  ),
  "journal-guideline-2026-039": withAgentInstruction(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-039"],
  ),
  "journal-guideline-2026-036": withAgentInstruction(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-036"],
  ),
  "journal-guideline-2026-033": withAgentInstruction(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-033"],
  ),
  "journal-guideline-2026-029": withAgentInstruction(
    PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS["journal-guideline-2026-029"],
  ),
} as const satisfies Record<JournalGuidelineId, string>;

export const PUBLISHER_DECIDES_FOLLOW_UP_PROMPT =
  PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS["journal-guideline-2026-041"];

export function publisherDecidesFollowUpPrompt(resourceId: JournalGuidelineId) {
  return PUBLISHER_DECIDES_FOLLOW_UP_PROMPTS[resourceId];
}

export function publisherDecidesFollowUpQuestion(resourceId: JournalGuidelineId) {
  return PUBLISHER_DECIDES_FOLLOW_UP_QUESTIONS[resourceId];
}

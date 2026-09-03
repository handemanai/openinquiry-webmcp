// SPDX-License-Identifier: Apache-2.0

export const JOURNAL_GUIDELINE_CATALOG = [
  {
    id: "journal-guideline-2026-041",
    title: "Physical Activity for Adults",
    specialty: "Preventive medicine",
    updatedLabel: "Updated 21 August 2026",
    version: "Guideline version 4.1",
    abstractSections: [
      {
        label: "Objective",
        text: "To define a practical weekly framework for aerobic and muscle-strengthening activity, including a workable approach for adults who are starting below the population target or need to adapt activity to their health and abilities.",
      },
      {
        label: "Recommendations",
        text: "Adults should aim for 150 to 300 minutes of moderate-intensity aerobic activity each week, 75 to 150 minutes of vigorous-intensity activity, or an equivalent combination. Muscle-strengthening activity should be included on 2 or more days each week. Adults below these targets should remain as active as their abilities and health allow and increase activity gradually.",
      },
      {
        label: "Conclusions",
        text: "The weekly target is a population-level anchor, not an inflexible prescription. Implementation should emphasize feasible, sustainable movement, gradual progression, and adjustment to the person’s health, abilities, and circumstances. This guideline is fictional demonstration content and is not for clinical use.",
      },
    ],
    recommendationSectionId: "weekly-activity-recommendation",
    recommendationTitles: [
      "Weekly aerobic activity",
      "Muscle strengthening",
      "Starting below the target",
    ],
    parts: [
      {
        id: "overview-and-recommendations",
        label: "Part 1",
        title: "Overview and recommendations",
        description: "The bottom line first: what the panel recommends for adults and how to read it.",
        sectionIds: ["executive-summary", "weekly-activity-recommendation"],
      },
      {
        id: "using-the-recommendations",
        label: "Part 2",
        title: "Using the recommendations",
        description: "Who the guidance is for, how to adapt it, and how to follow progress over time.",
        sectionIds: [
          "scope-and-purpose",
          "implementation-and-safety",
          "chronic-conditions-and-disability",
          "monitoring-and-follow-up",
        ],
      },
      {
        id: "rationale-and-certainty",
        label: "Part 3",
        title: "Rationale and certainty",
        description: "Why the panel made these recommendations and how confident it is in them.",
        sectionIds: ["evidence-to-decision", "strength-and-certainty"],
      },
      {
        id: "development-and-review",
        label: "Part 4",
        title: "Development and review",
        description: "Methods, unanswered questions, disclosures, and the plan for keeping the guidance current.",
        sectionIds: ["methods-and-evidence-review", "research-priorities", "disclosures-and-review-cycle"],
      },
    ],
  },
  {
    id: "journal-guideline-2026-039",
    title: "High Blood Pressure in Adults",
    specialty: "Cardiology",
    updatedLabel: "Updated 18 August 2026",
    version: "Guideline version 3.2",
    abstractSections: [
      {
        label: "Objective",
        text: "To describe a repeatable approach to elevated blood pressure that begins with reliable measurement and connects the result to cardiovascular risk, the person’s clinical context, an explicit plan, and a defined review.",
      },
      {
        label: "Recommendations",
        text: "Confirm that an elevated result is repeatable and was obtained with an appropriate technique. Assess relevant conditions, medicines, symptoms, cardiovascular risk, and patient priorities before agreeing on the next step. Document when and how the response will be reviewed.",
      },
      {
        label: "Conclusions",
        text: "A blood pressure value should begin an assessment rather than stand in for one. The guideline makes confirmation, context, shared planning, and follow-up visible parts of the decision. This guideline is fictional demonstration content and is not for clinical use.",
      },
    ],
    recommendationSectionId: "blood-pressure-recommendations",
    recommendationTitles: [
      "Confirm the measurement",
      "Assess the whole patient",
      "Revisit the plan",
    ],
    parts: guidelineParts("blood-pressure-recommendations"),
  },
  {
    id: "journal-guideline-2026-036",
    title: "Type 2 Diabetes Screening",
    specialty: "Endocrinology",
    updatedLabel: "Updated 12 August 2026",
    version: "Guideline version 2.4",
    abstractSections: [
      {
        label: "Objective",
        text: "To describe an adult screening pathway that moves from risk assessment to testing, confirmation, communication, and follow-up without treating a single screening result as a complete diagnosis.",
      },
      {
        label: "Recommendations",
        text: "Offer screening after a shared assessment of risk, prior results, health context, and the person’s ability to complete follow-up. Confirm an abnormal screening result before representing it as an established diagnosis. Explain the result and connect every screening episode to a documented next step.",
      },
      {
        label: "Conclusions",
        text: "Screening is a care pathway, not a laboratory event. Its value depends on whether the result can be interpreted, confirmed, communicated, and connected to care. This guideline is fictional demonstration content and is not for clinical use.",
      },
    ],
    recommendationSectionId: "diabetes-screening-recommendations",
    recommendationTitles: [
      "Offer screening through shared assessment",
      "Confirm an abnormal result",
      "Connect results to follow-up",
    ],
    parts: guidelineParts("diabetes-screening-recommendations"),
  },
  {
    id: "journal-guideline-2026-033",
    title: "Antibiotic Treatment for Pneumonia",
    specialty: "Infectious disease",
    updatedLabel: "Updated 7 August 2026",
    version: "Guideline version 5.0",
    abstractSections: [
      {
        label: "Objective",
        text: "To organize the initial treatment of adults with suspected community-acquired pneumonia around three decisions: where care should occur, how treatment should be selected, and how the response should be reviewed.",
      },
      {
        label: "Recommendations",
        text: "Establish the care setting before selecting treatment. Choose an initial regimen using illness severity, recent exposure, allergy history, organ function, local patterns, and the likelihood of follow-up. Define the expected response and reassess when the course does not follow it.",
      },
      {
        label: "Conclusions",
        text: "A treatment choice is only one part of a safe plan. The setting, the reasoning behind the choice, and the review pathway should be explicit from the start. This guideline is fictional demonstration content and is not for clinical use.",
      },
    ],
    recommendationSectionId: "pneumonia-treatment-recommendations",
    recommendationTitles: [
      "Establish the care setting",
      "Choose treatment deliberately",
      "Review the response",
    ],
    parts: guidelineParts("pneumonia-treatment-recommendations"),
  },
  {
    id: "journal-guideline-2026-029",
    title: "Adult Vaccination Schedules",
    specialty: "Primary care",
    updatedLabel: "Updated 30 July 2026",
    version: "Guideline version 6.3",
    abstractSections: [
      {
        label: "Objective",
        text: "To provide a practical approach to adult vaccination that starts with a reliable history, applies the current schedule to the individual, and turns missed doses into a plan that can be completed.",
      },
      {
        label: "Recommendations",
        text: "Review documented vaccination history, prior reactions, health conditions, medicines, pregnancy status when relevant, and current exposure risks. Use the current authoritative schedule to identify what is due. Record what was given, what remains, and when the next step should occur.",
      },
      {
        label: "Conclusions",
        text: "Vaccination review is more useful when it produces a visible plan than when it produces a list of deficiencies. The record should support continuity across settings and over time. This guideline is fictional demonstration content and is not for clinical use.",
      },
    ],
    recommendationSectionId: "vaccination-schedule-recommendations",
    recommendationTitles: [
      "Review vaccination history",
      "Use the current schedule",
      "Plan for completion",
    ],
    parts: guidelineParts("vaccination-schedule-recommendations"),
  },
] as const;

function guidelineParts(recommendationSectionId: string) {
  return [
    {
      id: "overview-and-recommendations",
      label: "Part 1",
      title: "Overview and recommendations",
      description: "The central recommendations and the decisions they are intended to support.",
      sectionIds: ["executive-summary", recommendationSectionId],
    },
    {
      id: "using-the-recommendations",
      label: "Part 2",
      title: "Using the recommendations",
      description: "Scope, practical application, exceptions, and follow-up.",
      sectionIds: ["scope-and-purpose", "implementation", "monitoring-and-follow-up"],
    },
    {
      id: "rationale-and-certainty",
      label: "Part 3",
      title: "Rationale and certainty",
      description: "Why the panel made these recommendations and where judgment remains necessary.",
      sectionIds: ["rationale", "strength-and-certainty"],
    },
    {
      id: "development-and-review",
      label: "Part 4",
      title: "Development and review",
      description: "Methods, research recommendations, disclosures, and the next review.",
      sectionIds: ["methods", "research-recommendations", "review-and-disclosures"],
    },
  ] as const;
}

export type JournalGuideline = (typeof JOURNAL_GUIDELINE_CATALOG)[number];
export type JournalGuidelineId = JournalGuideline["id"];

export const DEFAULT_JOURNAL_GUIDELINE_ID: JournalGuidelineId = "journal-guideline-2026-041";

export function findJournalGuideline(id: string | undefined): JournalGuideline | undefined {
  return JOURNAL_GUIDELINE_CATALOG.find((guideline) => guideline.id === id);
}

export function journalGuidelinePath(
  id: JournalGuidelineId,
): `/demo/article/${JournalGuidelineId}` {
  return `/demo/article/${id}`;
}

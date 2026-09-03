// SPDX-License-Identifier: Apache-2.0

import {
  CONTENT_LICENSE,
  policyFor,
  SYNTHETIC_CONTENT_NOTICE,
} from "./journal-policy";
import type { ContentSection, SyntheticResource } from "./types";

type GuidelineInput = Readonly<{
  id: string;
  title: string;
  specialty: string;
  version: string;
  published: string;
  updated: string;
  authors: readonly string[];
  abstract: string;
  discoveryKeywords: readonly string[];
  recommendationSectionId: string;
  sections: readonly Readonly<{
    id: string;
    heading: string;
    text: string;
  }>[];
}>;

function guidelineSections(input: GuidelineInput): ContentSection[] {
  return input.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    locator: {
      sectionId: section.id,
      sectionTitle: section.heading,
    },
    deepLinkPath: `/demo/article/${input.id}#${section.id}`,
    text: section.text,
    keywords: [
      input.specialty.toLowerCase(),
      ...section.heading.toLowerCase().split(/\s+/u),
      ...(section.id === input.recommendationSectionId ? input.discoveryKeywords : []),
    ],
  }));
}

function makeGuideline(input: GuidelineInput): SyntheticResource {
  const canonicalPath = `/demo/article/${input.id}`;
  const publisherSummary = input.sections.find(
    (section) => section.id === "executive-summary",
  )?.text;
  return {
    id: input.id,
    providerId: "journal",
    rightsHolderName: "The Journal of Guidelines",
    contentType: "guideline",
    title: input.title,
    authors: [
      { name: input.authors[0], role: "organization" },
      ...input.authors.slice(1).map((name) => ({ name, role: "author" as const })),
    ],
    responsibleOrganization: input.authors[0],
    containerTitle: "The Journal of Guidelines",
    identifiers: [
      {
        scheme: "doi",
        value: `10.0000/openinquiry.jog.${input.id.replace("journal-guideline-", "").replaceAll("-", ".")}`,
      },
      { scheme: "internal", value: input.id.toUpperCase().replaceAll("JOURNAL-", "") },
    ],
    dates: {
      published: input.published,
      updated: input.updated,
      checked: "2026-08-31T12:00:00Z",
    },
    version: input.version,
    status: "current",
    canonicalPath,
    deepLinkPath: `${canonicalPath}#${input.recommendationSectionId}`,
    abstract: input.abstract,
    ...(publisherSummary ? { publisherSummary } : {}),
    sections: guidelineSections(input),
    keywords: [
      input.title.toLowerCase(),
      input.specialty.toLowerCase(),
      "guideline",
      ...input.discoveryKeywords,
    ],
    access: policyFor("journal-guidelines-bounded-v1"),
    ctaPathways: [
      {
        type: "open",
        label: "Open the article",
        path: canonicalPath,
        providerId: "journal",
      },
      {
        type: "deep_link",
        label: "Open the supporting section",
        path: `${canonicalPath}#${input.recommendationSectionId}`,
        providerId: "journal",
      },
    ],
    license: CONTENT_LICENSE,
    syntheticNotice: SYNTHETIC_CONTENT_NOTICE,
  };
}

export const additionalJournalGuidelines: SyntheticResource[] = [
  makeGuideline({
    id: "journal-guideline-2026-039",
    title: "High Blood Pressure in Adults",
    specialty: "Cardiology",
    version: "Guideline version 3.2",
    published: "2026-08-14",
    updated: "2026-08-18",
    authors: [
      "Adult Blood Pressure Guideline Panel",
      "Nia Patel, MD",
      "Owen Reed, PharmD",
    ],
    abstract:
      "This fictional guideline describes a structured approach to identifying persistently elevated blood pressure, confirming the measurement context, considering overall cardiovascular risk, agreeing on an initial plan, and reviewing whether that plan is working. It is designed to demonstrate publication structure and is not clinical advice.",
    discoveryKeywords: [
      "blood pressure",
      "hypertension",
      "cardiovascular risk",
      "measurement confirmation",
      "monitoring",
      "follow-up",
    ],
    recommendationSectionId: "blood-pressure-recommendations",
    sections: [
      {
        id: "scope-and-purpose",
        heading: "Who this guideline is for",
        text:
          "This fictional guideline is intended for clinicians and care teams evaluating adults with elevated blood pressure in ambulatory settings. It addresses confirmation, risk context, shared planning, and follow-up rather than emergency assessment, pregnancy, childhood hypertension, or management of an acutely unwell person.\n\nThe recommendations are organized around decisions that can be revisited. The panel treats a recorded value as the start of an assessment, not a complete diagnosis or a substitute for understanding how, when, and under what conditions it was obtained.",
      },
      {
        id: "executive-summary",
        heading: "Executive summary",
        text:
          "The fictional panel places measurement quality before escalation. A useful assessment connects repeated measurements with symptoms, medicines, comorbid conditions, cardiovascular risk, and the person’s preferences and practical circumstances.\n\nThe initial plan may include changes in daily routines, medicine, further assessment, or a combination of approaches. The publication emphasizes that the plan and the interval for review should be explicit enough that both the patient and the clinical team know what happens next.",
      },
      {
        id: "blood-pressure-recommendations",
        heading: "Recommendations for adults",
        text:
          "Confirm that an elevated blood pressure result represents a repeatable finding obtained with an appropriate technique and interpreted in its clinical context. Assess cardiovascular risk, relevant conditions, medicines, symptoms, and patient priorities before agreeing on the next step. Document the plan, the reason for it, and when the response will be reviewed so that treatment can be continued, adjusted, or reconsidered deliberately.",
      },
      {
        id: "implementation",
        heading: "Putting the recommendations into practice",
        text:
          "Implementation begins with a measurement process that can be explained and repeated. The care team should record the setting, position, equipment, and any factor likely to make a result difficult to interpret. When measurements from different settings disagree, the discrepancy is information to investigate rather than a reason to select whichever number best fits an assumption.\n\nShared planning should translate a broad treatment goal into actions that are feasible for the person. Cost, access to follow-up, medicine burden, work, caregiving, transportation, and the ability to monitor outside the clinic can materially change which plan is workable.",
      },
      {
        id: "monitoring-and-follow-up",
        heading: "Monitoring and follow-up",
        text:
          "Follow-up should determine whether the agreed plan was started, whether it was tolerable, and whether the available measurements are sufficient to judge the response. A number without information about adherence, adverse effects, or measurement conditions can give false precision.\n\nThe fictional panel favors a visible review loop: confirm the current state, identify what changed, decide whether the explanation is adequate, and record the next review. The interval should reflect the clinical situation rather than a single fixed schedule applied to every adult.",
      },
      {
        id: "rationale",
        heading: "Rationale for the recommendations",
        text:
          "The panel judged that avoidable error occurs when one measurement is treated as a complete assessment or when treatment is intensified without understanding the current regimen and the person’s ability to follow it. It therefore made confirmation and context part of the recommendation itself.\n\nThe recommendations separate the direction of a plan from its exact details. This preserves room for individual judgment while making the minimum decision process visible: confirm, assess, agree, and review.",
      },
      {
        id: "strength-and-certainty",
        heading: "Strength and certainty",
        text:
          "For this fictional publication, the panel expresses strong confidence in using reliable measurement and planned follow-up as foundations of care. It expresses more limited confidence in applying one sequence or review interval across all settings because the synthetic evidence includes varied populations, resources, and treatment contexts.\n\nThe guideline therefore does not define a universal treatment target or medicine sequence. Those choices require the complete clinical context and current authoritative guidance.",
      },
      {
        id: "methods",
        heading: "How this guideline was developed",
        text:
          "The fictional methods group organized an original synthetic evidence file around measurement, risk assessment, treatment initiation, follow-up, and implementation. Reviewers considered consistency, applicability, feasibility, and the risk that concise language could be misread as an individualized prescription.\n\nDraft recommendations were reviewed by fictional clinical, pharmacy, primary-care, implementation, and patient-perspective participants. This methods account demonstrates the structure of a guideline publication; it does not report a real systematic review.",
      },
      {
        id: "research-recommendations",
        heading: "Research recommendations",
        text:
          "The panel identified uncertainty about how different monitoring approaches affect sustained participation, how to reduce inequities in access to repeat measurement and follow-up, and how medicine burden changes the acceptability of treatment plans. Future work should report implementation barriers and adverse effects alongside numerical outcomes.",
      },
      {
        id: "review-and-disclosures",
        heading: "Review schedule and disclosures",
        text:
          "All organizations, contributors, evidence judgments, and recommendations in this guideline are fictional and were created for the OpenInquiry demonstration. No real publisher, institution, or professional body endorsed this content. It is not for clinical use.\n\nThe fictional editorial plan calls for surveillance of material new evidence and formal reassessment in 2029, with earlier review if a major safety concern or practice-changing evidence emerges.",
      },
    ],
  }),
  makeGuideline({
    id: "journal-guideline-2026-036",
    title: "Type 2 Diabetes Screening",
    specialty: "Endocrinology",
    version: "Guideline version 2.4",
    published: "2026-08-08",
    updated: "2026-08-12",
    authors: [
      "Adult Metabolic Screening Working Group",
      "Helena Wu, MD",
      "Marisol Grant, MPH",
    ],
    abstract:
      "This fictional guideline describes how an adult screening program can move from risk assessment to testing, confirmation, communication, and follow-up without treating a single screening result as a complete diagnosis. It is synthetic demonstration content and not clinical advice.",
    discoveryKeywords: [
      "type 2 diabetes",
      "diabetes screening",
      "risk assessment",
      "abnormal result",
      "diagnostic confirmation",
      "screening follow-up",
    ],
    recommendationSectionId: "diabetes-screening-recommendations",
    sections: [
      {
        id: "scope-and-purpose",
        heading: "Who this guideline is for",
        text:
          "This fictional guideline addresses screening for type 2 diabetes in adults who do not have symptoms requiring diagnostic evaluation. It is intended for primary-care teams, prevention programs, and organizations designing reliable follow-up after screening.\n\nIt does not cover pregnancy, childhood diabetes, acute metabolic illness, or individualized treatment after a diagnosis. The central question is not only who receives a test, but whether the program can interpret, confirm, communicate, and act on the result responsibly.",
      },
      {
        id: "executive-summary",
        heading: "Executive summary",
        text:
          "The fictional panel views screening as a process rather than a laboratory event. An invitation should explain why screening is being offered, what the result can and cannot establish, and what follow-up will be available.\n\nPrograms should avoid collecting tests they cannot confirm or connect to care. A screening pathway is incomplete if an abnormal result is delivered without a clear plan or if a normal result is allowed to imply that future reassessment will never be needed.",
      },
      {
        id: "diabetes-screening-recommendations",
        heading: "Recommendations for adults",
        text:
          "Offer screening after a shared assessment of relevant risk, prior results, health context, and the person’s ability to complete follow-up. Confirm an abnormal screening result through an appropriate diagnostic pathway before representing it as an established diagnosis. Communicate the result, its meaning, and the next step in a form the person can understand and connect every screening episode to a documented follow-up plan.",
      },
      {
        id: "implementation",
        heading: "Putting the recommendations into practice",
        text:
          "A screening program should define responsibility for invitation, specimen collection, result review, confirmation, communication, and referral. These responsibilities may sit with different people, but they should not be invisible. The handoff between steps is a common point of failure.\n\nImplementation should account for language, transportation, cost, time away from work, disability access, and digital access. Offering a test without making the result and next step reachable can widen rather than reduce inequity.",
      },
      {
        id: "monitoring-and-follow-up",
        heading: "Monitoring the screening pathway",
        text:
          "Programs should monitor whether invited adults complete screening, whether abnormal results are confirmed, whether people receive understandable communication, and whether follow-up occurs. The goal is to find where the pathway breaks, not simply to maximize the number of tests ordered.\n\nPeople with results that do not require immediate action should still receive a clear explanation of when risk may be reassessed. The interval should be based on the full context rather than an automatic recurring order.",
      },
      {
        id: "rationale",
        heading: "Rationale for the recommendations",
        text:
          "The panel judged that the potential value of screening depends on the pathway surrounding the test. A technically valid result can still cause harm or confusion when it is treated as diagnostic without confirmation or communicated without access to follow-up.\n\nThe recommendations therefore make confirmation, communication, and continuity visible. They are not administrative additions to screening; they are part of what makes screening meaningful.",
      },
      {
        id: "strength-and-certainty",
        heading: "Strength and certainty",
        text:
          "The fictional panel expresses strong confidence that abnormal screening results should not be represented as confirmed diagnoses without an appropriate next step. Confidence is more limited about applying one risk threshold, test, or interval across every population and care setting.\n\nThe publication deliberately leaves those choices to current authoritative guidance and individualized assessment rather than inventing a universal schedule for this demonstration.",
      },
      {
        id: "methods",
        heading: "How this guideline was developed",
        text:
          "The fictional methods team organized an original synthetic evidence file around screening eligibility, test performance, confirmation, communication, referral, and program equity. It reviewed whether each proposed recommendation described a decision that a real care pathway could own and measure.\n\nFictional clinical, laboratory, public-health, implementation, and patient-perspective contributors reviewed the draft. This description demonstrates guideline structure and is not a report of a real evidence review.",
      },
      {
        id: "research-recommendations",
        heading: "Research recommendations",
        text:
          "The panel identified uncertainty about how screening pathways perform when follow-up requires multiple visits, which communication approaches best support understanding without alarm, and how programs should adapt for adults facing unstable access to care. Future studies should report pathway completion and equity outcomes, not only test uptake.",
      },
      {
        id: "review-and-disclosures",
        heading: "Review schedule and disclosures",
        text:
          "All organizations, contributors, evidence judgments, and recommendations in this guideline are fictional and were created for the OpenInquiry demonstration. No real professional body or institution endorsed this content. It is not for clinical use.\n\nThe fictional publication will review the record in 2029 or sooner if material evidence changes the interpretation of screening pathways, confirmation, or follow-up.",
      },
    ],
  }),
  makeGuideline({
    id: "journal-guideline-2026-033",
    title: "Antibiotic Treatment for Pneumonia",
    specialty: "Infectious disease",
    version: "Guideline version 5.0",
    published: "2026-08-03",
    updated: "2026-08-07",
    authors: [
      "Community Respiratory Infection Panel",
      "Lena Shah, MD",
      "Victor Bako, PharmD",
    ],
    abstract:
      "This fictional guideline describes a decision pathway for adults with suspected pneumonia: establish the care setting, consider likely cause and patient-specific constraints, choose treatment deliberately, and review the response. It contains no drug regimen and is not clinical advice.",
    discoveryKeywords: [
      "pneumonia",
      "community acquired pneumonia",
      "antibiotic treatment",
      "respiratory infection",
      "care setting",
      "treatment response",
    ],
    recommendationSectionId: "pneumonia-treatment-recommendations",
    sections: [
      {
        id: "scope-and-purpose",
        heading: "Who this guideline is for",
        text:
          "This fictional guideline addresses the decision process surrounding antibiotic treatment for adults with suspected community-onset pneumonia. It is intended to demonstrate how a journal guideline can separate recommendations, rationale, application, and evidence limits.\n\nIt does not provide a drug, dose, duration, diagnostic rule, or substitute for acute clinical assessment. Severe illness, immune compromise, pregnancy, unusual exposures, recent hospitalization, and local resistance patterns require specific authoritative guidance beyond this demonstration.",
      },
      {
        id: "executive-summary",
        heading: "Executive summary",
        text:
          "The fictional panel places the care setting and severity context before antibiotic selection. Treatment should reflect the working diagnosis, recent care and medicine exposure, allergies and interactions, relevant organ function, microbiology when available, and the ability to return if the course changes.\n\nThe initial decision should include a review plan. Lack of improvement is not automatically proof that a broader antibiotic is needed; it is a reason to reconsider the diagnosis, complications, adherence, absorption, resistance, and whether the care setting remains appropriate.",
      },
      {
        id: "pneumonia-treatment-recommendations",
        heading: "Recommendations for adults",
        text:
          "Establish the appropriate care setting and urgency before selecting outpatient or inpatient treatment for suspected pneumonia. Choose antibiotic treatment using the working diagnosis, patient-specific risks, recent exposures, allergies, interactions, organ function, and current local guidance. Define when and how the response will be reviewed and reassess the diagnosis, complications, and care setting when the expected course does not occur.",
      },
      {
        id: "implementation",
        heading: "Putting the recommendations into practice",
        text:
          "Implementation requires access to current local guidance rather than a static list carried forward indefinitely. The rationale for treatment should be visible enough that another clinician can understand the decision without reconstructing it from the prescription alone.\n\nCommunication should cover the intended course, important adverse effects, what improvement would look like, and which changes require urgent reassessment. Practical barriers such as cost, pharmacy access, swallowing difficulty, transportation, and the reliability of follow-up can change whether an otherwise reasonable plan is safe.",
      },
      {
        id: "monitoring-and-follow-up",
        heading: "Reviewing the response",
        text:
          "The review should compare the observed course with the working diagnosis and the expectations established at treatment. Persistent or worsening illness should trigger renewed assessment rather than automatic repetition of the original plan.\n\nDocumentation should distinguish intolerance, nonadherence, lack of response, a new complication, and diagnostic uncertainty. These are different problems and should not be compressed into a single label of treatment failure.",
      },
      {
        id: "rationale",
        heading: "Rationale for the recommendations",
        text:
          "The panel judged that antibiotic choice cannot be separated from severity, setting, and follow-up. A regimen that appears reasonable in isolation may be inappropriate when the diagnosis is uncertain, the patient cannot complete it, or deterioration cannot be recognized promptly.\n\nThe recommendations therefore describe a sequence of decisions rather than a list of medicines. This keeps the demonstration focused on guideline structure without fabricating a clinical protocol.",
      },
      {
        id: "strength-and-certainty",
        heading: "Strength and certainty",
        text:
          "The fictional panel expresses strong confidence in establishing care setting, considering patient-specific constraints, and planning reassessment. It does not state confidence in a specific antibiotic strategy because the synthetic record does not include the real evidence, resistance data, or patient information required to support one.\n\nReaders should use current authoritative clinical guidance for any treatment decision.",
      },
      {
        id: "methods",
        heading: "How this guideline was developed",
        text:
          "The fictional methods group organized an original synthetic evidence framework around care setting, diagnostic uncertainty, antibiotic choice, communication, response assessment, stewardship, and access to follow-up. Reviewers removed language that could be mistaken for a real dosing protocol.\n\nFictional infectious-disease, primary-care, pharmacy, emergency-care, implementation, and patient-perspective contributors reviewed the structure. No real systematic review was performed.",
      },
      {
        id: "research-recommendations",
        heading: "Research recommendations",
        text:
          "The panel identified uncertainty about how remote follow-up, rapid diagnostics, and patient-reported change should be combined without delaying reassessment. Future studies should report diagnostic revision, adverse effects, access barriers, and unplanned escalation alongside antibiotic outcomes.",
      },
      {
        id: "review-and-disclosures",
        heading: "Review schedule and disclosures",
        text:
          "All organizations, contributors, evidence judgments, and recommendations in this guideline are fictional and were created for the OpenInquiry demonstration. It is not for clinical use and does not endorse any treatment.\n\nThe fictional editorial plan calls for annual surveillance and formal reassessment in 2028, with earlier review if a material safety or stewardship concern emerges.",
      },
    ],
  }),
  makeGuideline({
    id: "journal-guideline-2026-029",
    title: "Adult Vaccination Schedules",
    specialty: "Primary care",
    version: "Guideline version 6.3",
    published: "2026-07-27",
    updated: "2026-07-30",
    authors: [
      "Adult Immunization Working Group",
      "Evelyn Park, MD",
      "Jonah Ellis, MPH",
    ],
    abstract:
      "This fictional guideline describes how adult vaccination history can be reviewed, reconciled with a current authoritative schedule, and converted into a practical completion plan. It intentionally contains no vaccine-specific schedule and is not clinical advice.",
    discoveryKeywords: [
      "adult vaccination",
      "immunization",
      "vaccine schedule",
      "vaccination history",
      "record reconciliation",
      "completion plan",
    ],
    recommendationSectionId: "vaccination-schedule-recommendations",
    sections: [
      {
        id: "scope-and-purpose",
        heading: "Who this guideline is for",
        text:
          "This fictional guideline addresses the organization of routine adult vaccination review in primary care and community settings. It covers history collection, schedule reconciliation, communication, documentation, and completion planning.\n\nIt does not reproduce a real vaccination schedule or make vaccine-specific recommendations. Current authoritative schedules, product information, contraindications, precautions, prior reactions, pregnancy, immune status, travel, occupation, and outbreak conditions must be considered in real care.",
      },
      {
        id: "executive-summary",
        heading: "Executive summary",
        text:
          "The fictional panel recommends treating vaccination status as a reconciled record rather than a yes-or-no question. A useful review distinguishes documented doses, credible history, uncertain history, known reactions, and information that still needs to be obtained.\n\nThe current schedule should then be applied to the person’s age, health, risk, prior vaccination, and circumstances. When more than one visit is needed, the plan should say what is due now, what comes later, and who is responsible for closing the loop.",
      },
      {
        id: "vaccination-schedule-recommendations",
        heading: "Recommendations for adults",
        text:
          "Review and reconcile vaccination history using available records, patient history, prior reactions, and clinically relevant risk information. Use the current authoritative schedule and applicable product guidance to determine which vaccinations require discussion, administration, deferral, or further clarification. Record what was decided and create a practical completion plan when the recommended series or review cannot be completed at the current encounter.",
      },
      {
        id: "implementation",
        heading: "Putting the recommendations into practice",
        text:
          "Implementation begins with a record that can be understood across settings. Duplicate records, inconsistent names, missing dates, and documentation held by different organizations can make a simple status label unreliable. The team should preserve uncertainty rather than converting it into false precision.\n\nDiscussion should be specific to the decision in front of the person. Language access, cost, supply, appointment timing, transportation, work, caregiving, and previous experiences can affect whether a plan can be completed.",
      },
      {
        id: "monitoring-and-follow-up",
        heading: "Completion and follow-up",
        text:
          "A vaccination plan should remain visible after the encounter. When completion requires another visit, the record should identify the next action, expected timing, and how the person will be reminded or reached.\n\nPrograms should monitor missed opportunities, incomplete series, duplicate administration, documentation transfer, and inequities in access. The objective is not only to count administered doses, but to understand whether people can complete the plan safely and conveniently.",
      },
      {
        id: "rationale",
        heading: "Rationale for the recommendations",
        text:
          "The panel judged that schedule accuracy depends on the quality of the underlying history and the use of current authoritative information. A static copied schedule can become misleading when guidance changes or when individual context is omitted.\n\nThe recommendations therefore focus on the durable workflow: reconcile, interpret, decide, document, and follow through. This allows the publication to demonstrate a guideline structure without pretending to be a current vaccine schedule.",
      },
      {
        id: "strength-and-certainty",
        heading: "Strength and certainty",
        text:
          "The fictional panel expresses strong confidence in reconciling records, using current authoritative schedules, and documenting a completion plan. It deliberately makes no vaccine-specific claim because the synthetic evidence file is not a substitute for real recommendations, contraindication guidance, or public-health updates.\n\nThe exact decision must be made from current clinical sources and the person’s complete context.",
      },
      {
        id: "methods",
        heading: "How this guideline was developed",
        text:
          "The fictional methods team organized an original synthetic evidence framework around record quality, schedule use, communication, administration, documentation, follow-up, and equity. Reviewers removed all content that could be mistaken for a current vaccine schedule.\n\nFictional primary-care, pharmacy, public-health, nursing, implementation, and patient-perspective contributors reviewed the publication structure. This is not a real evidence review.",
      },
      {
        id: "research-recommendations",
        heading: "Research recommendations",
        text:
          "The panel identified uncertainty about how best to reconcile records across organizations, how reminders affect completion without becoming intrusive, and how programs can reduce missed opportunities without pressuring patients. Future studies should report record quality, completion, adverse events, and access outcomes together.",
      },
      {
        id: "review-and-disclosures",
        heading: "Review schedule and disclosures",
        text:
          "All organizations, contributors, evidence judgments, and recommendations in this guideline are fictional and were created for the OpenInquiry demonstration. No real public-health body or professional organization endorsed this content. It is not for clinical use.\n\nThe fictional record is reviewed whenever the demonstration corpus changes and is scheduled for formal reassessment in 2027.",
      },
    ],
  }),
];

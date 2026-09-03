import {
  CONTENT_LICENSE,
  policyFor,
  SYNTHETIC_CONTENT_NOTICE,
} from "./journal-policy";
import { additionalJournalGuidelines } from "./journal-guidelines-content";
import type { ProviderActionFixture, SyntheticResource } from "./types";

function journalCtas(
  canonicalPath: string,
  deepLinkPath: string,
): ProviderActionFixture[] {
  return [
    {
      type: "open",
      label: "Open the article",
      path: canonicalPath,
      providerId: "journal",
    },
    {
      type: "deep_link",
      label: "Open the supporting section",
      path: deepLinkPath,
      providerId: "journal",
    },
  ];
}

export const journalGuidelines: SyntheticResource[] = [
  {
    id: "journal-guideline-2026-041",
    providerId: "journal",
    rightsHolderName: "The Journal of Guidelines",
    contentType: "guideline",
    title: "Physical Activity for Adults",
    authors: [
      { name: "Guideline Working Group on Adult Movement and Health", role: "organization" },
      { name: "Amara Ortiz, MD", role: "author" },
      { name: "Daniel Kim, MPH", role: "author" },
    ],
    responsibleOrganization: "Guideline Working Group on Adult Movement and Health",
    containerTitle: "The Journal of Guidelines",
    identifiers: [
      { scheme: "doi", value: "10.0000/openinquiry.jog.2026.041" },
      { scheme: "internal", value: "JOG-2026-041" },
    ],
    dates: {
      published: "2026-08-18",
      updated: "2026-08-21",
      checked: "2026-08-29T12:00:00Z",
    },
    version: "Guideline version 4.1",
    status: "current",
    canonicalPath: "/demo/article/journal-guideline-2026-041",
    deepLinkPath:
      "/demo/article/journal-guideline-2026-041#weekly-activity-recommendation",
    abstract:
      "This fictional guideline reviews the amount and types of weekly physical activity associated with adult health. It addresses moderate- and vigorous-intensity aerobic activity, muscle-strengthening activity, gradual progression, and adaptations for adults whose health or functional status limits standard targets.",
    publisherSummary:
      "The fictional panel frames physical activity as an ongoing health behavior. Adults should combine aerobic and muscle-strengthening activity across the week, progress gradually from their current level, and adapt the plan when health or function limits standard targets. Some activity is preferable to none. Sustainable choices, practical barriers, and follow-up matter alongside the numerical target; the guideline is a population-level starting point, not an inflexible individual prescription.",
    sections: [
      {
        id: "scope-and-purpose",
        heading: "Who this guideline is for",
        locator: {
          sectionId: "scope-and-purpose",
          sectionTitle: "Who this guideline is for",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#scope-and-purpose",
        text:
          "This fictional guideline addresses routine physical activity counseling for adults and is intended for clinicians, public-health teams, health educators, and organizations designing programs for adult movement and participation. It describes a population-level starting point rather than an individualized exercise prescription.\n\nThe guideline covers aerobic and muscle-strengthening activity, progression from inactivity, adaptation for functional limitations, and practical follow-up. It does not provide condition-specific rehabilitation protocols, competitive training plans, acute symptom evaluation, or clearance for high-risk exertion. Clinical decisions should account for the individual’s health, goals, symptoms, medications, environment, and access to safe places for activity.\n\nThe intended use is a conversation that connects a broad weekly recommendation to a plan the person can understand and revisit. The panel treats transportation, cost, caregiving responsibilities, neighborhood conditions, climate, work schedules, and accessible facilities as practical parts of implementation rather than reasons to label a person unwilling or nonadherent. Programs should make room for walking, wheeling, cycling, recreation, household activity, and other forms of movement that can be sustained in ordinary life.",
        keywords: ["scope", "adult physical activity", "intended audience", "counseling"],
      },
      {
        id: "executive-summary",
        heading: "Executive summary",
        locator: {
          sectionId: "executive-summary",
          sectionTitle: "Executive summary",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#executive-summary",
        text:
          "Regular physical activity is framed as a longitudinal health behavior rather than a single target achieved once. The fictional panel emphasizes a weekly combination of aerobic and muscle-strengthening activity, gradual progression for people who are inactive, and adaptation when health or function limits standard targets.\n\nThe panel also emphasizes that some activity is preferable to none. Clinicians and programs should reduce avoidable barriers, ask about activity in ordinary language, and help people choose forms of movement that are feasible, acceptable, and sustainable. The numerical weekly target is the anchor recommendation, while the remaining sections explain how to interpret and implement it without turning a population guideline into an inflexible individual prescription.",
        keywords: ["executive summary", "aerobic", "muscle strengthening", "progression"],
      },
      {
        id: "evidence-to-decision",
        heading: "Rationale for the recommendations",
        locator: {
          sectionId: "evidence-to-decision",
          sectionTitle: "Rationale for the recommendations",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#evidence-to-decision",
        text:
          "The fictional working group considered the consistency of associations across major adult-health outcomes, the feasibility of accumulating activity across a week, the harms of abrupt or poorly matched progression, and the practical burden of recommendations that require specialized facilities or equipment. It also considered whether the recommendation could be adapted across age, disability, chronic disease, and community settings.\n\nBecause the synthetic evidence set includes both direct comparisons and observational associations, the group separated confidence in the overall direction of benefit from precision about a single ideal dose. The resulting range is intended to support useful action while acknowledging that capacity, baseline activity, and individual priorities vary.\n\nThe group reviewed the recommendation against five practical questions: whether most adults could recognize the target, whether activity could be accumulated in different patterns, whether people starting below the target could still make meaningful progress, whether implementation could widen inequities, and whether the wording might encourage unsafe escalation. These questions shaped the decision to use a range, pair aerobic and strengthening activity, and state explicitly that adults with limited capacity should remain active within their abilities.\n\nNo single activity format was judged necessary to satisfy the recommendation. The panel favored language that preserves choice because the best available form of movement depends on preference, environment, function, and opportunity. This flexibility is part of the recommendation rather than an exception to it.",
        keywords: ["evidence to decision", "feasibility", "benefits", "harms", "equity"],
      },
      {
        id: "weekly-activity-recommendation",
        heading: "Recommendations for adults",
        locator: {
          sectionId: "weekly-activity-recommendation",
          sectionTitle: "Recommendations for adults",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#weekly-activity-recommendation",
        text:
          "Adults should aim for 150 to 300 minutes of moderate-intensity aerobic activity each week, or 75 to 150 minutes of vigorous-intensity activity, or an equivalent combination. Muscle-strengthening activity involving the major muscle groups should be included on two or more days each week. Adults who cannot meet these targets should remain as active as their abilities and health allow and increase activity gradually.",
        keywords: [
          "physical activity adults weekly",
          "150 minutes",
          "75 minutes",
          "aerobic activity",
          "muscle strengthening",
          "recommendation",
        ],
      },
      {
        id: "strength-and-certainty",
        heading: "Strength and certainty",
        locator: {
          sectionId: "strength-and-certainty",
          sectionTitle: "Strength and certainty",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#strength-and-certainty",
        text:
          "For this fictional publication, the adult recommendations are designated strong recommendations supported by moderate-certainty synthetic evidence. The panel judged that the expected benefits of regular activity generally outweigh the foreseeable burdens for most adults when activity is matched to current capacity and increased progressively.\n\nCertainty is lower for the exact shape of the dose-response relationship in particular subgroups and for the comparative value of specific activity formats. The recommendations therefore define a practical range and preserve room for individual choice. The strength designation should not be interpreted as a requirement to reach the upper end of the range immediately or as a substitute for evaluation when exertional symptoms or other clinical concerns are present.\n\nThe panel distinguished certainty in the recommendations from certainty in every implementation choice. It had greater confidence that regular activity should be supported than that one schedule, setting, or counseling technique is superior. For that reason, the guideline does not rank several shorter sessions against fewer longer sessions, prescribe a universal rate of progression, or treat one method of recording activity as required. Those decisions should follow the person’s starting point and the purpose of follow-up.",
        keywords: ["recommendation strength", "certainty", "dose response", "individual choice"],
      },
      {
        id: "implementation-and-safety",
        heading: "Putting the recommendations into practice",
        locator: {
          sectionId: "implementation-and-safety",
          sectionTitle: "Putting the recommendations into practice",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#implementation-and-safety",
        text:
          "The fictional panel recommends gradual progression for adults who are inactive and individual adaptation when chronic conditions, disability, symptoms, or functional limitations affect activity. A useful starting plan identifies the person’s current pattern, the setting in which activity will occur, and one realistic change that can be repeated. Duration, frequency, or intensity can then increase in small steps rather than all at once.\n\nPrograms should include clear instructions for responding to new or concerning symptoms and should not imply that a population recommendation replaces individualized assessment. The complete source context should be reviewed before applying the recommendation to any individual. Safety planning should be proportionate to the activity, current health, prior experience, environmental conditions, and the availability of support when it is needed.\n\nImplementation can begin by translating intensity into language the person can use. A moderate effort may feel purposeful while still allowing conversation; a vigorous effort is more demanding and makes sustained conversation difficult. These descriptions are aids to shared understanding, not diagnostic tests. When intensity is difficult to judge or less relevant to the person’s goals, duration, frequency, participation, or a functional milestone may be more useful anchors.\n\nThe panel recommends changing one dimension at a time when possible. Increasing duration before intensity, adding a repeatable day before lengthening every session, or testing an accessible setting can make the response easier to interpret. A plan should also anticipate interruptions. Travel, illness, caregiving, pain, weather, and work demands are ordinary events; a practical plan includes a modest route back rather than treating interruption as failure.",
        keywords: ["gradual progression", "safety", "adaptation", "disability"],
      },
      {
        id: "chronic-conditions-and-disability",
        heading: "Adults with chronic conditions or disability",
        locator: {
          sectionId: "chronic-conditions-and-disability",
          sectionTitle: "Adults with chronic conditions or disability",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#chronic-conditions-and-disability",
        text:
          "Adults whose health or functional status limits standard targets should be supported in identifying activity that is safe, meaningful, and achievable within their abilities. Adaptation may involve shorter bouts, lower initial intensity, different movement patterns, assistive equipment, supervision, or a shift toward goals such as maintaining function and participation.\n\nThe fictional panel cautions against treating inability to reach the standard range as a reason to omit counseling or support. The relevant comparison is often with the person’s own baseline. Shared planning should identify symptoms or barriers that require further assessment, distinguish temporary limits from durable adaptations, and avoid framing disability or chronic illness as a categorical exclusion from the potential benefits of movement.\n\nAdaptation should be specific rather than symbolic. A recommendation to “do what you can” is incomplete unless the person and clinician have identified what forms of activity are available, what assistance or equipment is needed, and what would count as a useful next step. When capacity fluctuates, plans may define more than one acceptable version: a usual plan, a reduced plan for difficult days, and a way to resume after a period of lower activity.\n\nPrograms should examine whether their own design creates the barrier. Scheduling, inaccessible facilities, transportation, communication format, cost, and assumptions about how activity must look can exclude people even when the underlying recommendation is adaptable. The panel considers removal of those barriers part of faithful implementation.",
        keywords: ["chronic conditions", "disability", "adaptation", "participation"],
      },
      {
        id: "monitoring-and-follow-up",
        heading: "Monitoring progress and follow-up",
        locator: {
          sectionId: "monitoring-and-follow-up",
          sectionTitle: "Monitoring progress and follow-up",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#monitoring-and-follow-up",
        text:
          "Follow-up should focus on whether the plan was attempted, what made it easier or harder, and whether the chosen activity remains acceptable and sustainable. Minutes per week can be useful, but they are not the only meaningful measure. Frequency, confidence, fatigue, symptoms, participation, and the ability to resume after an interruption may better explain whether a plan is working.\n\nThe fictional panel favors brief repeated review over a single pass-or-fail assessment. When progress stalls, the next step is to reconsider the plan, environment, competing demands, and support—not simply repeat the target. Documentation should be concise enough to support continuity while avoiding unnecessary collection of sensitive behavioral detail.\n\nA follow-up conversation can be organized around three questions: what happened, what was learned, and what should change next. This structure allows a plan to improve even when the numerical target was not reached. It also helps distinguish a plan that was impractical from one that was interrupted by a temporary event or limited by symptoms that need separate attention.\n\nSelf-monitoring is optional. Some adults find calendars, devices, or written logs motivating; others experience them as burdensome or intrusive. The panel does not require a particular device or data stream. Any monitoring method should collect only what is useful for the person’s stated goal and should not become a condition for receiving support.",
        keywords: ["monitoring", "follow-up", "adherence", "participation", "documentation"],
      },
      {
        id: "methods-and-evidence-review",
        heading: "How this guideline was developed",
        locator: {
          sectionId: "methods-and-evidence-review",
          sectionTitle: "How this guideline was developed",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#methods-and-evidence-review",
        text:
          "This demonstration guideline uses an original synthetic evidence file created for the OpenInquiry reference application. The fictional methods team defined the population, outcomes, intervention categories, and subgroup questions before assembling the evidence summary. Evidence was organized by recommendation domain and reviewed for consistency, directness, precision, and applicability.\n\nDraft judgments were discussed by the multidisciplinary working group, which included clinical, public-health, implementation, and patient-perspective roles. Conflicts were resolved through documented discussion and, when uncertainty remained, by narrowing the claim. External review focused on interpretability, feasibility, equity, and whether recommendation language stayed within the stated evidence boundaries. This methods description demonstrates publication structure and is not a report of a real systematic review.\n\nThe synthetic review process recorded the reason for each evidence-to-decision judgment and linked it to the affected recommendation language. Reviewers were asked to identify statements that sounded more precise than the underlying evidence, implementation advice that assumed resources not available in many settings, and wording that could be misread as an individualized prescription. Revisions favored plain language, explicit boundaries, and a visible separation between the core recommendation and practical interpretation.\n\nThe working group also conducted a consistency review across the abstract, executive summary, recommendation, implementation sections, and publication metadata. This was intended to ensure that the same target, strength, status, and update date would be visible to a human reader and returned by the fictional publisher’s structured knowledge tools.",
        keywords: ["methods", "evidence review", "certainty", "external review", "synthetic"],
      },
      {
        id: "research-priorities",
        heading: "Research recommendations",
        locator: {
          sectionId: "research-priorities",
          sectionTitle: "Research recommendations",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#research-priorities",
        text:
          "The fictional panel identified persistent uncertainty about how best to support activity after long periods of inactivity, how to adapt targets across fluctuating health and disability, and which implementation strategies produce durable participation rather than short-term enrollment. Better representation of people facing environmental, financial, caregiving, and accessibility barriers is a priority.\n\nFuture studies should report adverse events, baseline capacity, adaptation strategies, and participation outcomes in addition to aggregate activity volume. Research should also distinguish the effect of the activity itself from the effect of coaching, social support, transportation, safe spaces, and other enabling conditions.",
        keywords: ["research priorities", "implementation", "accessibility", "participation"],
      },
      {
        id: "disclosures-and-review-cycle",
        heading: "Review schedule and disclosures",
        locator: {
          sectionId: "disclosures-and-review-cycle",
          sectionTitle: "Review schedule and disclosures",
        },
        deepLinkPath:
          "/demo/article/journal-guideline-2026-041#disclosures-and-review-cycle",
        text:
          "All organizations, contributors, evidence judgments, and disclosures in this guideline are fictional and were created for the OpenInquiry demonstration. No real professional society, publisher, institution, or clinical panel endorsed this content. The record is labeled not for clinical use.\n\nThe fictional editorial plan calls for surveillance of major new evidence and formal reassessment in 2029, with earlier review if a material safety concern or practice-changing body of evidence emerges. Corrections, updates, or withdrawal would be displayed on the canonical source record and returned through the same publication-status field used by the site’s knowledge tools.",
        keywords: ["disclosures", "review cycle", "corrections", "not for clinical use"],
      },
    ],
    keywords: [
      "physical activity",
      "exercise",
      "adults",
      "weekly recommendation",
      "preventive medicine",
      "guideline",
    ],
    access: policyFor("journal-guidelines-bounded-v1"),
    ctaPathways: journalCtas(
      "/demo/article/journal-guideline-2026-041",
      "/demo/article/journal-guideline-2026-041#weekly-activity-recommendation",
    ),
    license: CONTENT_LICENSE,
    syntheticNotice: SYNTHETIC_CONTENT_NOTICE,
  },
  ...additionalJournalGuidelines,
];

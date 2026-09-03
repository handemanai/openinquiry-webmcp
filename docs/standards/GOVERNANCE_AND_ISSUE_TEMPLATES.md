# OpenInquiry governance and issue templates

**Status:** Suggested neutral discussion process; no governance body currently exists
**Applies to:** OpenInquiry profile text, schemas, vocabularies, fixtures, and implementation reports

## 1. Governance objective

The process should make it harder for any one publisher, agent platform, library vendor, identity provider, or project maintainer to change a term in a way that quietly shifts cost, liability, privacy risk, or negotiating power to another constituency.

The current repository can host incubation. It cannot credibly certify itself, claim consensus, or represent stakeholders who have not participated.

The immediate public invitation should therefore be:

> Test the boundary, submit counterexamples, and help define the evidence required for interoperability. Do not endorse OpenInquiry as a standard or adopter-ready profile.

## 2. Participation and standing

Participation should be open to individuals. Organizational affiliation, relevant commercial interests, and active contracts that materially affect a proposal should be disclosed in the contribution.

The process should actively seek participation from:

- commercial and nonprofit publishers;
- professional societies and clinical/editorial governance groups;
- academic libraries, consortia, knowledge-base suppliers, and link-resolver operators;
- authors, speakers, editors, and other knowledge creators;
- physicians, researchers, accessibility users, and other readers;
- agent/client and browser implementers;
- identity/federation and institutional-access specialists;
- privacy, security, abuse, and civil-society reviewers; and
- standards, licensing, and competition-policy participants.

One person may bring several perspectives, but does not count as several independent constituencies or implementations.

## 3. Interim roles

Until a neutral venue exists:

| Role | Responsibility | Constraint |
| --- | --- | --- |
| Maintainer | Repository operations, issue triage, releases of discussion artifacts | Cannot declare consensus or adopter readiness alone |
| Specification editors | Convert accepted decisions into coherent normative and informative text | Must record alternatives and cannot change semantics editorially |
| Test editors | Maintain schemas, fixtures, and requirement-to-test mapping | Must be organizationally independent from at least one implementation used as interoperability evidence |
| Constituency reviewers | Review authority, clinical, library, identity, privacy, security, accessibility, and economic effects | Review is scoped evidence, not blanket endorsement |
| Implementers | Produce provider/client prototypes and public implementation reports | Two implementations sharing the same codebase or decision service are not independent |
| Ombudsperson / appeal reviewer | Review process exclusion, undisclosed conflict, or unexplained dismissal of evidence | Should not be an editor or employer-affiliated with the disputed proposal owner |

At least two co-chairs or facilitators from different constituencies should manage discussion once external participation begins. Neither should be employed by the same organization or both represent agent platforms or rights holders.

## 4. Artifact model

Every release should distinguish:

- **Normative profile:** implementable requirements and vocabularies.
- **Schemas:** structural constraints; not the complete semantic contract.
- **Semantic requirements:** stable requirement IDs and language-neutral invariants.
- **Fixtures/tests:** positive, negative, privacy, budget, and client-preservation cases.
- **Implementation reports:** exact features, versions, environments, passes, failures, and deviations.
- **Security/privacy considerations:** request, output, logging, linkability, abuse, and incident boundaries.
- **Economic/authority considerations:** who can decide, who bears cost, and what remains unverified.
- **Mappings:** informative relationships to ODRL, KBART, Crossmark/CREC, ROR, CRediT, COUNTER, identity federation, and other infrastructure.
- **Change log and errata:** human-readable decision history.

Mappings are informative unless a release explicitly defines and tests conformance to the mapped specification.

## 5. Issue-to-RFC workflow

### Stage 0 — Problem report

Anyone may open an issue using a template below. A valid report names:

1. the user journey;
2. the institution with authority;
3. the resource and decision unit;
4. present behavior and observed failure;
5. the minimum interoperable change;
6. privacy, security, accessibility, authority, and economic effects;
7. compatibility impact; and
8. evidence that could falsify or validate the proposal.

A counterexample is sufficient to open an issue. A complete solution is not required.

### Stage 1 — Triage

Within a published target period, maintainers assign:

- a stable `OI-###` issue ID;
- affected layer: WebMCP, OpenInquiry, provider application, client commitment, or external ecosystem;
- severity and maturity threshold;
- affected constituencies;
- 0.1 clarification, 0.2 core candidate, extension candidate, mapping, or out of scope; and
- a named editor or a public “needs editor” state.

Closing an issue requires a reason and a route to appeal. “No maintainer interest” is a prioritization decision, not evidence that the problem is invalid.

### Stage 2 — Design note

Before an RFC, a short design note should compare at least:

- no change;
- the smallest compatible change;
- the proposed breaking change; and
- an external-system or extension alternative.

It must identify who gains control, who loses control, new data exposed, new persistent identifiers, payload cost, and implementation burden.

### Stage 3 — RFC pull request

An RFC has a stable ID such as `OI-RFC-0001` and contains:

- abstract and decision requested;
- motivating journeys and non-goals;
- normative requirements with stable IDs;
- complete data model or protocol changes;
- compatibility and migration plan;
- privacy, security, accessibility, clinical, authority, and economic analysis;
- extension/registry effect;
- positive and negative fixtures;
- implementation and client-preservation plan;
- alternatives and objections; and
- primary-source mappings labeled reuse, mapping candidate, or analogy.

Schema-only RFCs are incomplete when semantic behavior changes.

### Stage 4 — Focused review

Affected constituencies receive an explicit review request. Silence is not consent. At minimum:

- authority/rights changes require rights-holder and library/access review;
- contributor/clinical changes require creator, society/editorial, and clinician review;
- identity/delegation changes require federation, privacy, and security review;
- receipt/measurement changes require provider, library, privacy, and economic review; and
- client obligations require at least two client implementers and user-experience/accessibility review.

Reviewers may respond `support`, `support with conditions`, `object`, or `no position`, with reasons. These are evidence summaries, not binding constituency votes.

### Stage 5 — Prototype and test

Breaking core RFCs need executable schemas and fixtures plus at least one prototype provider and one prototype client before last call. The prototype phase records failures rather than tuning the suite only to the reference implementation.

### Stage 6 — Last call

Use a public, time-bounded last call—suggested 30 days for core changes and 14 days for clarifications. The call lists:

- exact artifact commit/digest;
- unresolved objections;
- missing constituencies;
- known implementation failures;
- privacy/security issues; and
- the maturity label being requested.

### Stage 7 — Decision

Editors publish a decision record with:

- disposition: accepted, revised, deferred, extension-only, or rejected;
- evidence considered;
- responses to material objections;
- compatibility classification;
- required follow-up; and
- named dissent that participants want preserved.

The target is reasoned rough consensus plus implementation evidence, not unanimity and not a simple majority of GitHub accounts.

### Stage 8 — Release and errata

Each release has:

- immutable profile/schema/test URIs or archived repository references;
- artifact digests;
- a release manifest;
- change log;
- implementation-report snapshot;
- open issue register; and
- precise maturity and conformance labels.

Errata can correct editorial defects without changing valid instances or semantics. A semantic change requires a new profile version, migration notes, and updated conformance evidence.

## 6. Maturity gates

### Clarified discussion draft

Requires:

- normative/informative separation;
- stable requirement IDs;
- positive/negative fixtures for every clarification;
- public known-issues register;
- security/privacy and claim-language review; and
- no unresolved Critical issue whose existence is hidden from the invitation.

### Implementation draft

Requires:

- resolvable immutable schemas;
- capability/version/extension behavior;
- complete semantic conformance suite;
- authority and status models;
- byte-budget fixtures;
- migration notes; and
- at least one provider and one client prototype.

### Interoperability candidate

Requires:

- at least two organizationally independent provider implementations;
- at least two organizationally independent client implementations;
- no shared policy engine or response serializer counting as independence;
- every required feature exercised by two implementations, though one implementation need not implement every optional feature;
- public failures/deviations and test-suite version;
- security, privacy, accessibility, and internationalization review; and
- no unresolved Critical issue without an explicit deferral rationale and safe boundary.

The two-implementation gate is inspired by implementation-evidence practices such as the [ODRL 2.2 Candidate Recommendation exit criteria](https://www.w3.org/TR/odrl-model/#candidate-recommendation-exit-criteria). This is an **analogy**, not W3C Process conformance.

### Adopter candidate

Requires the interoperability candidate plus:

- identified legal/contractual and operational owners for a bounded real pilot;
- request-data and telemetry policy;
- incident, revocation, and correction procedures;
- abuse/reconstruction controls with false-positive review;
- user comprehension/accessibility evidence;
- a privacy-preserving measurement plan; and
- explicit participating-organization authorization.

It still does not mean a standard or certification.

## 7. Neutral venue and IPR path

The repository should not choose a formal venue before real participants identify the right scope. A credible sequence is:

1. incubate openly in the repository under the current software/documentation licenses;
2. recruit a balanced seed group and publish participation/conflict rules;
3. obtain legal review of contribution and patent terms before accepting normative contributions intended for a specification;
4. evaluate a neutral venue such as a W3C Community Group, NISO working group, or another open standards forum based on scope and participants; and
5. move only with documented participant support.

A [W3C Community Group](https://www.w3.org/community/) is one possible open incubation venue with participation and contribution terms, but Community Group reports are not W3C Standards and must not be described as W3C-endorsed. NISO may be relevant to scholarly publishing/library mappings. Neither venue should be name-dropped as a commitment before those organizations and participants agree.

The existing Apache-2.0 and CC BY 4.0 project licenses do not, by themselves, settle standards-essential patent, contributor authority, trademark, certification, or governance questions.

## 8. Appeals, recusals, and registry control

- Editors disclose employer, funding, and directly relevant commercial relationships.
- An editor recuses from final disposition when the proposal uniquely benefits their employer's proprietary extension or certification business.
- A contributor may request appeal for process exclusion, unaddressed evidence, conflict, or inconsistent precedent.
- The appeal reviewer publishes a process decision, not a technical rewrite.
- Core term and extension registries publish objective entry, deprecation, collision, and appeal rules.
- No fee, membership, adopter status, or trademark license should buy a vocabulary entry or conformance result.

## 9. Shared issue fields

Every stakeholder template begins with:

```md
### Summary

### Stakeholder and organization type

### Concrete browser-agent journey

### Resource type and identifier

### Institution(s) with authority

### Present 0.1 behavior or observed implementation behavior

### Failure or ambiguity

### Minimum interoperable change

### Correct layer
- [ ] WebMCP
- [ ] OpenInquiry core
- [ ] OpenInquiry extension
- [ ] Provider application
- [ ] Client commitment
- [ ] External identity/rights/status/governance infrastructure

### Compatibility
- [ ] 0.1 clarification
- [ ] Breaking 0.2 candidate
- [ ] Optional extension
- [ ] Informative mapping only

### Privacy, security, accessibility, and abuse effects

### Economic and authority effects

### Evidence and fixtures required

### Conflicts, affiliations, or contracts relevant to this issue

### Primary sources or implementation evidence
```

## 10. Stakeholder-specific issue templates

### Publisher / rights holder

Append to the shared fields:

```md
### Rights and supply authority
- Who owns or controls the relevant rights?
- Is the responder the rights holder, authorized supplier, metadata relay, or another role?
- What evidence supports that relationship?

### Requested unit
- Which representation and amount is useful?
- Could the returned unit substitute for the canonical product?
- Which source context remains uniquely valuable?

### Permitted uses and contract boundary
- Which use is technically supplied?
- Which terms are declarations rather than enforceable by OpenInquiry?

### Abuse and economics
- How could repeated calls reconstruct value?
- What legitimate use could a proposed control block?
- What non-invasive evidence would show reader/provider value?
```

### Professional society / clinical or editorial governance

```md
### Content authority
- Is this a guideline, consensus statement, education, panel remark, transcript, or other form?
- Who authored, approved, published, and may update it?

### Context required
- What population, strength, certainty, exception, disclaimer, or surrounding section must travel with the unit?
- What must an agent never infer from membership or access?

### Status lifecycle
- Who can correct, supersede, withdraw, or retract it?
- How quickly must a saved answer refresh?

### Clinical risk evidence
- Which lost-context or wrong-version test would falsify the proposal?
- Which clinical/editorial reviewers must participate?
```

### Library / consortium / knowledge-base or link-resolver operator

```md
### Library assertion type
- Is this a holding, coverage assertion, predicted access route, authenticated route, or delegated decision?
- For which institution, population, dates, and resource coverage?

### Rights-holder handoff
- Who actually supplies protected content?
- What can fail after the library says a route exists?

### Existing infrastructure
- Is KBART, OpenURL/link resolution, proxying, federated login, ERM, or another system relevant?
- Is the proposed relationship reuse, a mapping candidate, or analogy?

### Reader privacy and economics
- Which attributes or logs are necessary?
- How does the change preserve the library's curatorial, licensing, and privacy role?
```

### Agent / browser client implementer

```md
### Tool selection and capability discovery
- Which provider/page/tool inventory was visible?
- Which profile/extension versions and byte budgets were understood?

### Preservation behavior
- Did the client keep provider, resource, contributor, status, access, rights, action, and receipt bindings through synthesis?
- Which fields were dropped or truncated?

### Error and downgrade behavior
- What happened for an unsupported version, required extension, small output budget, stale status, or invalid response?

### Reproduction environment
- Client, browser, model, version, account/workspace type, date, route, and test fixture
```

### Identity provider / federation participant

```md
### Identity and authorization facts
- Which party authenticates the person?
- Which party decides affiliation, membership, holding, license, and content supply?

### Minimum signal
- What is the smallest audience-bound attribute or assertion the provider needs?
- Why is a provider-local site session insufficient?

### Linkability and disclosure
- Could the signal correlate a person's activity across providers?
- Does it expose institution, role, email, persistent subject ID, or clinical interest?

### Delegation boundary
- What does the assertion prove, and what contractual/rightsholder authority does it not prove?
```

### Author / speaker / creator

```md
### Contribution identity
- Is the contributor a person, organization, committee, editor, speaker, moderator, or another role?
- Which identifier and role vocabulary are accurate?

### Attribution survival
- What must remain visible after search, retrieval, synthesis, export, and canonical opening?

### Credit versus measurement
- What outcome counts as useful credit?
- Which measurement would become invasive or misleading?

### Correction and dispute
- How can the contributor challenge attribution, status, or a misleading excerpt?
```

### Physician / researcher / end user

```md
### Task and consequence
- What is the user trying to decide or verify?
- What harm follows from stale status, wrong authority, missing context, or inaccessible source navigation?

### Immediate comprehension
- Which fields must be visible without expanding technical details?
- Can the user distinguish source authority from access entitlement?

### Canonical verification
- Is the action useful and exact, or is it friction/dark pattern?
- What happens if access fails after handoff?

### Evidence
- Measure source recognition, status recognition, wrong-version avoidance, and successful verification—not task completion alone.
```

### Privacy / security / abuse reviewer

```md
### Data flow
- What query, session fact, output, receipt, log, analytics event, and upstream call exists?
- Which data is linkable across time/providers?

### Threat and affected party
- Prompt/output injection, access inference, arbitrary navigation, compromised metadata, repeated extraction, multi-account reconstruction, or another threat?

### Proposed control and bypass
- Where is the control enforced?
- What happens when the client ignores metadata or an attacker changes accounts/providers?

### Retention and incident handling
- Whose copy is retained, for how long, under which policy, and how is deletion/incident response tested?
```

### Standards / governance participant

```md
### Normative defect
- Which requirement is ambiguous, contradictory, untestable, or improperly assigned to a layer?

### Interoperability effect
- Can two good-faith independent implementations diverge? Show the smallest counterexample.

### Registry and versioning effect
- Does this add/change a core term, extension, conformance class, or maturity rule?

### Process and power effect
- Who has standing, who bears implementation cost, and who gains decision control?
- Which conflicts, IPR, appeal, or competition concerns apply?
```

## 11. Implementation report template

```md
# OpenInquiry implementation report

Implementation name and version:
Organization and repository:
Commit/build identifier:
Profile version:
Schema/test-suite version and digest:
Provider/client/runtime conformance classes claimed:
Independent codebase and policy engine: yes/no, explain
Environment and date:

## Feature results
| Requirement ID | Feature | Pass / fail / not implemented | Evidence |
| --- | --- | --- | --- |

## Output budgets
| Tool | Fixture | UTF-8 bytes | Client preserved mandatory bindings? |
| --- | --- | ---: | --- |

## Deviations and known failures

## Security/privacy/accessibility review performed

## External standards mappings actually implemented

## Conflicts or commercial relationships relevant to the report
```

An implementation report is evidence about one implementation. It is not an adopter badge, certification, legal opinion, or endorsement of OpenInquiry.

<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# OpenInquiry demo script

**Target length:** 2 minutes 35 seconds
**Audience:** WebMCP Challenge judges
**Recording rule:** Use the final deployed build and a WebMCP-capable client.

## What the video must communicate

1. A physician can bring an agent to a trusted publisher's site.
2. WebMCP gives that site a first-class agent interface.
3. The publisher, not the agent, decides what material the session receives.
4. The answer keeps its author, status, use limits, and exact source link.
5. A separate agent-handling assurance could help publishers share more, but
   WebMCP does not currently issue or verify that assurance.

## Script and actions

### 0:00 to 0:15 | The problem

**Screen:** OpenInquiry home page.

**Say:**

> Physicians want agents to help them use trusted sources. Publishers want to
> help without turning a subscription into unrestricted machine access.
> OpenInquiry shows how both can happen on the publisher's own website.

Select **Run the demonstration**.

### 0:15 to 0:35 | The proposal

**Screen:** Advance through the three explanation pages.

**Say:**

> This fictional journal offers seven WebMCP tools for search, access, retrieval,
> status, resolution, and source opening. The journal applies its own rules on
> the server. The agent cannot put an entitlement or trust claim in the request.

Pause on the two-condition screen long enough to show both controls.

### 0:35 to 1:10 | Entitlement without assurance

**Screen:** Journal page with **Full article access** and **No qualifying
credential recognized**.

**Say:**

> I have fictional full-article reader access. The journal has not recognized an
> external assurance about this agent's data handling. I will ask one ordinary
> clinical-reference question.

Paste the question and its separately labeled agent instruction into the
browser's agent. Show the complete question-matched section, author, status,
publisher decision, and source receipt.

**Say:**

> The journal returned the complete question-matched section through Site Tools,
> not the complete article. The result keeps the author, current status, use
> limits, and exact source.

Open the exact supporting section.

### 1:10 to 1:45 | Change one condition

**Screen:** Reopen **Demo controls**. Keep **Full article access** and select
**Zero-retention claim recognized**.

**Say:**

> For the demonstration, I can simulate the publisher recognizing an
> independently issued zero-retention credential. This is a judge control, not
> a claim WebMCP verifies. A real version needs a trusted issuer, signed scope,
> expiration, revocation, and enforcement by the systems handling the content.

Ask the same question again and show the complete article result.

**Say:**

> The entitlement did not change. Recognizing the simulated credential changed
> what the publisher was willing to supply: the agent now received the complete
> article for transient, attributed use. Bulk export, redistribution, storage,
> and model training remain prohibited by the returned policy.

### 1:45 to 2:10 | Reader access is separate

**Screen:** Switch to **Guest preview** and compare the result.

**Say:**

> Now I changed the reader's access. The journal returns less. Reader access and
> recognized agent assurance are separate inputs to the Site Tool decision, and
> the source remains on the journal page. Preventing ordinary browser observation would require a
> future browser-enforced assurance, which this demo does not claim.

### 2:10 to 2:35 | Why it matters

**Screen:** Show the exact source, then the presentation summary.

**Say:**

> WebMCP lets publishers bring an agent-native experience onto the source site,
> preserving their relationship with the reader. OpenInquiry proposes a shared,
> rights-aware result and a future assurance layer that could make publishers
> more comfortable sharing useful material. It is a working proposal, not an
> adopted standard or a real publisher integration.

End on the OpenInquiry name and repository link.

## Capture checklist

- Show the WebMCP-capable client name and version in the recording notes.
- Use the final commit and deployed URL.
- Keep the synthetic-content warning visible whenever medical text is shown.
- Do not show credentials, cookies, debug panels, personal tabs, or private data.
- Confirm spoken audio, legible text, exact source navigation, and a duration
  under three minutes before publishing.

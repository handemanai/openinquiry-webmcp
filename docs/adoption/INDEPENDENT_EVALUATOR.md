<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# External-adapter evaluation path

The [`evaluator/`](../../evaluator/README.md) directory is a separately runnable harness for an outside publisher, professional society, library, repository, or agent team to test its adapter against OpenInquiry 0.1 without running or adopting the Next.js reference application. The adopter's adapter is independent; the profile project's pinned schema and semantic validator are the evaluator's declared trust root.

It is provider-neutral and requires no network service. The reference adapter makes no network calls, but the runner does not sandbox or block networking for an outside adapter. The evaluator sends synthetic response vectors through a newline-delimited JSON adapter, evaluates each materialized response against the pinned [`openinquiry-profile-0.1.schema.json`](../../schemas/openinquiry-profile-0.1.schema.json) and [`validateKnowledgeResponse`](../../src/lib/profile/validation.ts), and checks that the adapter:

- accepts positive publisher, society, library, and provider-error responses;
- rejects semantic breaks in provider/receipt identity, library authority, canonical actions, correction warnings, withdrawn content, resource/grant binding, and receipt minimization;
- returns accepted profile responses without rewriting authorship, identifiers, dates, locators, status, access, rights, actions, warnings, or receipts;
- rejects unknown fields inside the closed OpenInquiry 0.1 schema rather than silently deleting them; and
- preserves opaque evaluator-transport metadata that the adapter does not understand.

The last distinction matters: 0.1 has no extension container, so unknown profile fields are invalid. The evaluator's separate `adapterMetadata` is outside the profile and must round-trip exactly. This gives client implementers a concrete preservation test without pretending that 0.1 already has extension semantics.

## From a public commit to a pinned report

Choose a published commit or release rather than mutable `main`, and record the commit plus manifest digest outside the checkout:

```sh
git clone https://github.com/handemanai/openinquiry-webmcp.git
cd openinquiry-webmcp
git checkout --detach <published-commit-sha>
npm ci
node evaluator/verify-manifest.mjs
node evaluator/verify-manifest.mjs --expected-digest <externally-recorded-manifest-sha256>
npm run verify:evaluator
node --experimental-strip-types evaluator/run.mjs --expected-manifest-digest <externally-recorded-manifest-sha256> --adapter <trusted-adapter-command>
```

The first manifest command prints the digest to record through a trusted release channel. The second refuses a checkout that does not match that external value. The manifest checks the executable pack, vector files, dependency lock, canonical schema validator, canonical schema, and semantic-validator trust root against SHA-256 digests. That proves internal consistency, not authenticity. The self-test repeats the reference adapter, requires an identical report, confirms the private environment probe is absent, and proves that the runner detects targeted field rewriting, oversized protocol output, and a nonzero adapter exit.

To emit the complete JSON report:

```sh
node --experimental-strip-types evaluator/run.mjs --adapter node --experimental-strip-types evaluator/adapters/reference-adapter.mjs
```

To evaluate another implementation, follow the [`ADAPTER_CONTRACT.md`](../../evaluator/ADAPTER_CONTRACT.md) standard-input/standard-output protocol and replace the command after `--adapter`.

An outside adapter runs with the current user's filesystem and network privileges. The runner is not a sandbox. It minimizes inherited environment variables, bounds protocol output, terminates on timeout or malformed output, and requires a clean exit; use only trusted code or add a separate operating-system/container sandbox.

## What a passing report means

A passing report is evidence that the named adapter, on the named revision and runtime, made the expected accept/reject decisions and preserved the fields in these vectors in one observed run under the exact manifest digest. Compare repeated `reportDigest` values before making a determinism claim.

It is explicitly not:

- certification or permission to use an OpenInquiry compatibility mark;
- proof of profile adoption, consensus, or governance;
- proof that a provider has authority to deliver real protected content;
- proof that authentication, entitlement, request minimization, cumulative retrieval controls, telemetry, or canonical navigation are safe;
- named WebMCP client or deployed-browser interoperability evidence;
- proof that a client visibly displays provider/status/rights data; or
- proof of downstream citation, retention, deletion, redistribution, no-training, payment, or clinical safety.

Use the included [implementation-report template](../../evaluator/templates/IMPLEMENTATION_REPORT.md) to record those external boundaries rather than converting a local vector pass into a broader claim.

## Adoption workflow

1. Wrap the real provider serializer or real client parser/forwarder—not a hand-authored parallel implementation—behind the adapter protocol.
2. Pin the implementation revision, adapter artifact digest, Node/runtime version, and evaluator manifest digest.
3. Run the consistency check with an externally recorded digest, then run the evaluator with trusted adapter code.
4. Retain the complete JSON report and failed-case diagnostics.
5. Separately test trusted-session authorization, protected-content denial, receipt/telemetry minimization, cumulative extraction controls, and allowlisted navigation at the provider boundary.
6. Separately capture named-client/version/date and visible user outcomes before making a client-interoperability statement.
7. Report failures and 0.1 contract pressure honestly. A failing vector may reveal a profile limitation, an adapter defect, or both.

All included medical-adjacent labels are synthetic evaluation fixtures and not for clinical use.

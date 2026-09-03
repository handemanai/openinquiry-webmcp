<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# OpenInquiry 0.1 External-Adapter Evaluator Pack

This directory is a portable, provider-neutral evidence harness for the OpenInquiry Publisher Knowledge Access Profile 0.1 discussion draft. A publisher, society, library, repository, or agent team can place its own adapter behind a small newline-delimited JSON interface and test response validation and preservation without running or adopting the Next.js reference application. The outside adapter is independent; this project's pinned schema and semantic validator are the declared evaluation trust root.

The pack is deliberately narrow. It answers one question:

> Did this named adapter, against this exact manifest, accept the valid 0.1 response vectors, reject the invalid vectors, and preserve accepted profile data plus opaque evaluator metadata without silent rewriting?

A passing run is one local observation over deterministic vectors. The included self-test repeats the reference adapter and requires an identical report. A pass is not certification, a compatibility mark, adoption, production-readiness evidence, a security review, a legal or content-rights opinion, or proof that a live browser agent preserves provider terms after receiving a response.

## Requirements

- Node.js 22.6 or newer is required for the application and evaluator; continuous integration runs on Node.js 22.
- Run from a checkout containing the canonical [`schemas/openinquiry-profile-0.1.schema.json`](../schemas/openinquiry-profile-0.1.schema.json), [`src/lib/profile/validation.ts`](../src/lib/profile/validation.ts), and installed existing dependencies (`npm ci`).
- No network service, Next.js process, database, account, credential, or medical content is required.

## Verify pack consistency

```sh
node evaluator/verify-manifest.mjs
```

The manifest verifies every file in this directory plus the canonical schema validator and semantic-validator trust root. `manifest.json` is intentionally excluded from its file list because a file cannot contain its own ordinary SHA-256 digest; instead, `manifestDigest` covers the canonical JSON representation of the manifest with only that field omitted. Unlisted files inside `evaluator/` fail verification.

This is an internal consistency check, not an authenticity proof: a modified checkout can replace both files and hashes. For independently pinned evidence, record the digest from a specific public commit or release outside that checkout, then require it explicitly:

```sh
node evaluator/verify-manifest.mjs --expected-digest <recorded-sha256>
```

The manifest also covers `package.json` and `package-lock.json`; the verifier checks the running Node version and installed Ajv versions.

## Prove the pack locally

```sh
npm run verify:evaluator
```

The self-test repeats the reference adapter and expects every vector to pass with the same report. It then proves that the runner detects silent field deletion, an oversized protocol line, and a nonzero adapter exit.

To print the complete evidence report for the reference adapter:

```sh
node --experimental-strip-types evaluator/run.mjs --adapter node --experimental-strip-types evaluator/adapters/reference-adapter.mjs
```

Add `--expected-manifest-digest <recorded-sha256>` before `--adapter` to bind a run to a digest recorded outside the checkout. Run the same adapter twice and compare `reportDigest` values before describing the adapter behavior as deterministic.

## Test an outside adapter

Implement [the adapter contract](./ADAPTER_CONTRACT.md), then place its executable command after `--adapter`:

```sh
node --experimental-strip-types evaluator/run.mjs --adapter /absolute/path/to/adapter --flag value
```

The adapter command runs with the current user's filesystem and network privileges. The runner is not a sandbox. It passes only a small environment allowlist, limits each stdout protocol line to 1 MiB, caps retained stderr, stops on protocol failure or timeout, and requires a clean process exit. Run only an adapter you trust; use a separate operating-system or container sandbox when code provenance is uncertain. “Offline” in this pack means no service is required and the reference adapter makes no network call, not that the runner blocks networking.

The evaluator sends no expected verdict to the adapter. It independently materializes each vector, applies both the canonical JSON Schema and `validateKnowledgeResponse`, and then compares the adapter's decision and lossless output with that reference result.

Keep the JSON report as evidence with:

- the adapter source revision and digest;
- the provider/client implementation revision;
- the exact command and runtime version;
- the evaluator manifest digest;
- any failed case diagnostics; and
- the human-reviewed production gaps in the [implementation-report template](./templates/IMPLEMENTATION_REPORT.md).

Do not write generated reports into `evaluator/`; the consistency check correctly treats an extra pack file as drift. Redirect stdout to an evidence directory owned by the implementation being evaluated.

## What the vectors cover

- provider-neutral publisher, professional-society, library, repository-error, positive cases;
- provider/receipt identity binding;
- library rights-holder visibility;
- exact canonical actions;
- correction-warning preservation;
- retracted/withdrawn retrieval denial;
- resource/content-grant binding;
- privacy-minimized receipt keys;
- lossless preservation of accepted authorship, identifiers, dates, locators, status, rights, actions, warnings, and opaque adapter metadata; and
- rejection—not silent sanitization—of unknown fields inside closed OpenInquiry 0.1 objects.

OpenInquiry 0.1 has no extension container and closes profile objects. Unknown profile fields are therefore invalid in this pack. The separate `adapterMetadata` object belongs only to the evaluator transport and must be echoed structurally and value-exactly; it proves that a client or bridge does not discard metadata it does not interpret.

## What the pack does not cover

The evaluator never observes a provider's real session, entitlement source, authority delegation, protected content, request minimization, ordinary telemetry, output budgeting across repeated calls, overlap/reconstruction controls, canonical browser navigation, WebMCP registration lifecycle, accessible rendering, named-client behavior, deployment, or downstream citation/retention/training behavior. Those require separate implementation and external evidence.

All vector content is synthetic and not for clinical use.

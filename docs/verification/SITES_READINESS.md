<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sites publishing readiness

OpenInquiry keeps its existing Next.js development and release workflow. A
parallel Sites build compiles the same routes and publisher-controlled server
logic into a Cloudflare Workers-compatible artifact.

## Local preparation

```sh
npm run build:sites
```

The build must produce the server entry point and copy the current
`.openai/hosting.json` into the deployment artifact. The artifact verifier runs
automatically after the build.

The repository is bound to the existing OpenInquiry Sites project through the
opaque project ID in `.openai/hosting.json`. Its stable production origin is:

<https://openinquiry-publisher-demo.brianp.chatgpt.site>

Saving source, deploying a version, and changing who can view the Site remain
separate actions. Runtime configuration stays in Sites rather than this file.

## Hosted runtime configuration

Configure these values through Sites rather than committing them:

- `OPENINQUIRY_APP_ORIGIN`: the exact HTTPS origin assigned to the Site, with
  no path, query, fragment, or credentials.
- `OPENINQUIRY_SESSION_SECRET`: a secret containing at least 32 random bytes.

The origin anchors same-origin mutation checks and canonical links. The secret
signs the fictional demo-session cookie that carries the provider-derived
scenario and compact retrieval ledger. Neither value belongs in source control
or a deployment archive.

## Publish gate

Before saving a Sites version, freeze one exact source snapshot and require:

```sh
npm run check
npm run build
npm run test:browser:production
npm run build:sites
```

Also confirm the deployed access level before replacing a shared or public
version. A successful Sites deployment proves hosted behavior for that version;
it does not prove real publisher adoption, clinical use, independent assurance,
or named-client WebMCP compatibility.

## Current release checkpoint

On September 3, 2026, the competition snapshot was deployed to the public
origin above. Unauthenticated route and API checks passed, including complete
article delivery in the highest-permission fictional state. Codex's in-app
browser discovered all seven tools on the public journal, retrieved the same
14,373-character article, repeated the exact request idempotently, and opened
the exact supporting section. Any later source edit requires a new build,
source push, saved Sites version, deployment, and verification.

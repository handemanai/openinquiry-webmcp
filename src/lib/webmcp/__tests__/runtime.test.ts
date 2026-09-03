// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import test from "node:test";

import {
  KNOWLEDGE_TOOL_INPUT_SCHEMAS,
  KNOWLEDGE_TOOL_NAMES,
  WebMcpRegistrationError,
  createKnowledgeProviderAdapter,
  createKnowledgeToolDefinitions,
  getDocumentModelContext,
  inspectKnowledgeToolSurface,
  registerKnowledgeTools,
  validateKnowledgeToolInput,
  type KnowledgeProviderRole,
  type KnowledgeToolName,
  type ModelContextRegistrationAdapter,
  type ModelContextRegisterToolOptionsLike,
  type ModelContextToolLike,
  type ProfileToolInvocation,
} from "../index.ts";

class FakeModelContext implements ModelContextRegistrationAdapter {
  readonly tools = new Map<KnowledgeToolName, ModelContextToolLike>();
  readonly registrations: Array<{
    tool: ModelContextToolLike;
    options?: ModelContextRegisterToolOptionsLike;
  }> = [];
  failOnTool: KnowledgeToolName | null = null;

  async registerTool(
    tool: ModelContextToolLike,
    options?: ModelContextRegisterToolOptionsLike,
  ): Promise<void> {
    if (this.failOnTool === tool.name) throw new Error("simulated registration failure");
    if (this.tools.has(tool.name)) throw new Error("duplicate tool");
    if (options?.signal?.aborted) throw options.signal.reason;

    this.tools.set(tool.name, tool);
    this.registrations.push({ tool, options });

    options?.signal?.addEventListener(
      "abort",
      () => {
        this.tools.delete(tool.name);
      },
      { once: true },
    );
  }

  async execute(
    toolName: KnowledgeToolName,
    input: Record<string, unknown>,
    signal = new AbortController().signal,
  ): Promise<unknown> {
    const tool = this.tools.get(toolName);
    assert.ok(tool, `${toolName} should be registered`);
    return tool.execute(input, { signal });
  }
}

function createProvider(
  role: KnowledgeProviderRole,
  execute: (invocation: ProfileToolInvocation) => Promise<unknown> = async (
    invocation,
  ) => ({
    profile: {
      name: "openinquiry.publisher-knowledge-access",
      version: "0.1",
    },
    status: "ok",
    provider: invocation.provider,
    receipt: {
      receiptId: "receipt-test",
      issuedAt: "2026-08-26T12:00:00.000Z",
      providerId: invocation.provider.id,
      toolName: invocation.toolName,
      resourceIds: [],
      decision: "supplied",
      retention: "session",
    },
  }),
) {
  const names = {
    publisher: "Example Publisher",
    society: "Example Professional Society",
    library: "Example Library",
  } as const;

  return createKnowledgeProviderAdapter({
    provider: {
      id: `openinquiry-${role}`,
      name: names[role],
      role,
      canonicalUrl: `https://openinquiry.example/${role}`,
    },
    supportedTools: KNOWLEDGE_TOOL_NAMES,
    untrustedOutputTools: ["knowledge_search", "knowledge_retrieve"],
    service: { execute },
  });
}

test("the route inspector narrows tools by role and rejects provider-route mismatch", () => {
  const library = createProvider("library");
  const librarySurface = inspectKnowledgeToolSurface(library, {
    pathname: "/library/search?query=ulnar",
  });

  assert.equal(librarySurface.providerRoleMatches, true);
  assert.equal(librarySurface.toolNames.includes("knowledge_retrieve"), false);
  assert.deepEqual(librarySurface.toolNames, [
    "knowledge_describe",
    "knowledge_access",
    "knowledge_search",
    "knowledge_resolve",
    "knowledge_open",
    "knowledge_status",
  ]);

  const wrongSurface = inspectKnowledgeToolSurface(library, {
    pathname: "/publisher/article/example-1",
  });
  assert.equal(wrongSurface.providerRoleMatches, false);
  assert.deepEqual(wrongSurface.toolNames, []);
  assert.match(wrongSurface.issue ?? "", /cannot register/u);
});

test("tool definitions expose bounded schemas and precise annotations", () => {
  const definitions = createKnowledgeToolDefinitions({
    adapter: createProvider("library"),
    route: { pathname: "/library" },
  });
  const search = definitions.find((tool) => tool.name === "knowledge_search");
  const publisherDefinitions = createKnowledgeToolDefinitions({
    adapter: createProvider("publisher"),
    route: { pathname: "/publisher" },
  });
  const retrieve = publisherDefinitions.find((tool) => tool.name === "knowledge_retrieve");
  const open = definitions.find((tool) => tool.name === "knowledge_open");
  const titles = Object.fromEntries(publisherDefinitions.map(({ name, title }) => [
    name,
    title,
  ]));

  assert.ok(search);
  assert.ok(retrieve);
  assert.ok(open);
  assert.deepEqual(search.annotations, {
    readOnlyHint: true,
    untrustedContentHint: true,
  });
  assert.deepEqual(open.annotations, {
    readOnlyHint: false,
    untrustedContentHint: false,
  });
  assert.deepEqual(retrieve.annotations, {
    readOnlyHint: false,
    untrustedContentHint: true,
  });
  assert.deepEqual(titles, {
    knowledge_describe: "Describe this site",
    knowledge_access: "Check current access",
    knowledge_search: "Search publications",
    knowledge_retrieve: "Retrieve permitted evidence",
    knowledge_resolve: "Resolve access",
    knowledge_open: "Open source for reader",
    knowledge_status: "Check publication status",
  });
  for (const definition of publisherDefinitions) {
    assert.doesNotMatch(
      `${definition.title} ${definition.description}`,
      /untrusted_output_requires_policy_evaluation/u,
    );
  }
  assert.match(open.description, /link-only grant/u);
  assert.match(open.description, /ordinary browsing capabilities/u);
  assert.match(retrieve.description, /Request full_text/u);
  assert.match(retrieve.description, /exact retry is idempotent/u);

  const searchProperties = KNOWLEDGE_TOOL_INPUT_SCHEMAS.knowledge_search
    .properties as Record<string, Record<string, unknown>>;
  const retrieveProperties = KNOWLEDGE_TOOL_INPUT_SCHEMAS.knowledge_retrieve
    .properties as Record<string, Record<string, unknown>>;
  assert.equal(searchProperties.query?.maxLength, 300);
  assert.equal(searchProperties.limit?.maximum, 6);
  assert.equal(retrieveProperties.maxCharacters?.maximum, undefined);
  assert.ok((retrieveProperties.requestedRepresentation?.enum as string[]).includes("full_text"));
  assert.equal(KNOWLEDGE_TOOL_INPUT_SCHEMAS.knowledge_describe.required, undefined);
  assert.deepEqual(Object.keys(
    KNOWLEDGE_TOOL_INPUT_SCHEMAS.knowledge_access.properties as Record<string, unknown>,
  ).sort(), ["profileVersion", "requestId"]);
  assert.deepEqual(Object.keys(searchProperties).sort(), [
    "contentTypes",
    "limit",
    "profileVersion",
    "publishedAfter",
    "query",
    "requestId",
    "status",
  ]);
  assert.deepEqual(Object.keys(retrieveProperties).sort(), [
    "focusedQuery",
    "locator",
    "maxCharacters",
    "profileVersion",
    "requestId",
    "requestedRepresentation",
    "requestedUse",
    "resourceId",
  ]);
  assert.equal(KNOWLEDGE_TOOL_INPUT_SCHEMAS.knowledge_search.additionalProperties, false);
  assert.equal(
    validateKnowledgeToolInput("knowledge_search", {
      profileVersion: "0.1",
      query: "withdrawn record",
      status: ["withdrawn"],
    }).ok,
    true,
  );
});

test("provider-issued locators compose across tools without making display text authoritative", () => {
  const providerLocator = {
    sectionId: "weekly-activity-recommendation",
    sectionTitle: "Recommendations for adults",
    timestampEndSeconds: 540,
    timestampLabel: "08:42–09:00",
  };

  assert.equal(
    validateKnowledgeToolInput("knowledge_open", {
      profileVersion: "0.1",
      resourceId: "journal-guideline-2026-041",
      locator: providerLocator,
    }).ok,
    true,
  );
  assert.equal(
    validateKnowledgeToolInput("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: "journal-guideline-2026-041",
      requestedRepresentation: "quotation",
      locator: providerLocator,
    }).ok,
    true,
  );

  const displayOnly = validateKnowledgeToolInput("knowledge_open", {
    profileVersion: "0.1",
    resourceId: "journal-guideline-2026-041",
    locator: { sectionTitle: "Recommendations for adults" },
  });
  assert.equal(displayOnly.ok, false);
  if (!displayOnly.ok) {
    assert.equal(displayOnly.failure.issues?.[0]?.keyword, "requiredSelector");
  }
});

test("knowledge_describe bootstraps discovery without requiring a known version", () => {
  assert.equal(validateKnowledgeToolInput("knowledge_describe", {}).ok, true);
  assert.equal(validateKnowledgeToolInput("knowledge_describe", {
    profileVersion: "0.1",
    requestId: "describe-001",
  }).ok, true);

  const unsupported = validateKnowledgeToolInput("knowledge_describe", {
    profileVersion: "9.9",
  });
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(unsupported.failure.code, "PROFILE_VERSION_UNSUPPORTED");
    assert.equal(unsupported.failure.issues?.[0]?.path, "profileVersion");
  }
});

test("passage retrieval requires a focused query or provider-issued locator", () => {
  for (const requestedRepresentation of [
    "full_text",
    "recommendation",
    "quotation",
    "figure_description",
    "transcript_segment",
  ]) {
    const validation = validateKnowledgeToolInput("knowledge_retrieve", {
      profileVersion: "0.1",
      resourceId: "journal-guideline-2026-041",
      requestedRepresentation,
    });
    assert.equal(validation.ok, false, requestedRepresentation);
    if (!validation.ok) {
      assert.equal(validation.failure.code, "INVALID_REQUEST");
      assert.equal(validation.failure.issues?.[0]?.path, "focusedQuery");
      assert.equal(validation.failure.issues?.[0]?.keyword, "focusedRetrieval");
    }
  }

  assert.equal(validateKnowledgeToolInput("knowledge_retrieve", {
    profileVersion: "0.1",
    resourceId: "journal-guideline-2026-041",
    requestedRepresentation: "abstract",
  }).ok, true);
  assert.equal(validateKnowledgeToolInput("knowledge_retrieve", {
    profileVersion: "0.1",
    resourceId: "journal-guideline-2026-041",
    requestedRepresentation: "quotation",
    focusedQuery: "weekly physical activity",
  }).ok, true);
  assert.equal(validateKnowledgeToolInput("knowledge_retrieve", {
    profileVersion: "0.1",
    resourceId: "journal-guideline-2026-041",
    requestedRepresentation: "full_text",
    focusedQuery: "weekly physical activity",
    maxCharacters: 20_000,
  }).ok, true);
});

test("registration uses the second-argument AbortSignal and disposal removes tools", async () => {
  const modelContext = new FakeModelContext();
  const registration = await registerKnowledgeTools({
    adapter: createProvider("publisher"),
    route: {
      pathname: "/publisher/search",
      capabilities: ["knowledge_search", "knowledge_open"],
    },
    modelContext,
  });

  assert.equal(registration.supported, true);
  assert.deepEqual(registration.registeredToolNames, [
    "knowledge_search",
    "knowledge_open",
  ]);
  assert.deepEqual([...modelContext.tools.keys()], ["knowledge_search", "knowledge_open"]);
  assert.equal(modelContext.registrations[0]?.options?.signal, registration.signal);

  registration.dispose();
  assert.equal(registration.signal.aborted, true);
  assert.equal(modelContext.tools.size, 0);
});

test("an injected route-lifecycle signal unregisters the whole route surface", async () => {
  const modelContext = new FakeModelContext();
  const routeLifecycle = new AbortController();
  const registration = await registerKnowledgeTools({
    adapter: createProvider("society"),
    route: {
      pathname: "/society/video/example-2026",
      capabilities: ["knowledge_retrieve", "knowledge_open"],
    },
    modelContext,
    signal: routeLifecycle.signal,
  });

  assert.equal(modelContext.tools.size, 2);
  routeLifecycle.abort(new DOMException("route changed", "AbortError"));
  assert.equal(registration.signal.aborted, true);
  assert.equal(modelContext.tools.size, 0);
});

test("valid calls delegate to the shared profile service with execution cancellation", async () => {
  const invocations: ProfileToolInvocation[] = [];
  const modelContext = new FakeModelContext();
  await registerKnowledgeTools({
    adapter: createProvider("publisher", async (invocation) => {
      invocations.push(invocation);
      return { status: "ok", queryAccepted: true };
    }),
    route: {
      pathname: "/publisher",
      capabilities: ["knowledge_search"],
    },
    modelContext,
  });

  const execution = new AbortController();
  const result = await modelContext.execute(
    "knowledge_search",
    { profileVersion: "0.1", query: "ulnar nerve stability", limit: 3 },
    execution.signal,
  );

  assert.deepEqual(result, { status: "ok", queryAccepted: true });
  assert.equal(invocations.length, 1);
  assert.equal(invocations[0]?.signal, execution.signal);
  assert.equal(invocations[0]?.provider.role, "publisher");
  assert.equal(Object.hasOwn(invocations[0]?.input ?? {}, "entitlement"), false);
});

test("runtime validation blocks oversized input without echoing query content", async () => {
  let serviceCalls = 0;
  const modelContext = new FakeModelContext();
  await registerKnowledgeTools({
    adapter: createProvider("publisher", async () => {
      serviceCalls += 1;
      return { status: "ok" };
    }),
    route: {
      pathname: "/publisher",
      capabilities: ["knowledge_search"],
    },
    modelContext,
    now: () => new Date("2026-08-26T12:00:00.000Z"),
    createReceiptId: () => "boundary-test",
  });

  const privateQuery = `PRIVATE-${"x".repeat(310)}`;
  const result = await modelContext.execute("knowledge_search", {
    profileVersion: "0.1",
    query: privateQuery,
  });
  const serialized = JSON.stringify(result);

  assert.equal(serviceCalls, 0);
  assert.equal((result as { error?: { code?: string } }).error?.code, "REQUEST_TOO_LARGE");
  assert.equal(serialized.includes(privateQuery), false);
  assert.equal(serialized.includes("PRIVATE-"), false);
  assert.equal(
    (result as { receipt?: { toolName?: string } }).receipt?.toolName,
    "knowledge_search",
  );
});

test("runtime validation distinguishes malformed input from oversized input", () => {
  const missingQuery = validateKnowledgeToolInput("knowledge_search", {
    profileVersion: "0.1",
  });
  assert.equal(missingQuery.ok, false);
  if (!missingQuery.ok) {
    assert.equal(missingQuery.failure.code, "INVALID_REQUEST");
    assert.equal(missingQuery.failure.issues?.[0]?.path, "query");
    assert.equal(missingQuery.failure.issues?.[0]?.keyword, "required");
  }

  const oversizedQuery = validateKnowledgeToolInput("knowledge_search", {
    profileVersion: "0.1",
    query: "x".repeat(301),
  });
  assert.equal(oversizedQuery.ok, false);
  if (!oversizedQuery.ok) {
    assert.equal(oversizedQuery.failure.code, "REQUEST_TOO_LARGE");
    assert.equal(oversizedQuery.failure.issues?.[0]?.keyword, "maxLength");
  }
});

test("provider exceptions become privacy-minimized structured errors", async () => {
  const modelContext = new FakeModelContext();
  await registerKnowledgeTools({
    adapter: createProvider("publisher", async () => {
      throw new Error("SECRET_TOKEN and raw prompt must not cross the boundary");
    }),
    route: {
      pathname: "/publisher",
      capabilities: ["knowledge_access"],
    },
    modelContext,
    createReceiptId: () => "boundary-provider-failure",
  });

  const result = await modelContext.execute("knowledge_access", {
    profileVersion: "0.1",
  });
  const serialized = JSON.stringify(result);

  assert.equal(
    (result as { error?: { code?: string } }).error?.code,
    "PROVIDER_UNAVAILABLE",
  );
  assert.equal(serialized.includes("SECRET_TOKEN"), false);
  assert.equal(serialized.includes("raw prompt"), false);
});

test("execution cancellation rejects instead of turning cancellation into a profile error", async () => {
  const modelContext = new FakeModelContext();
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  await registerKnowledgeTools({
    adapter: createProvider("publisher", async () => {
      await pending;
      return { status: "ok" };
    }),
    route: {
      pathname: "/publisher",
      capabilities: ["knowledge_access"],
    },
    modelContext,
  });

  const execution = new AbortController();
  const resultPromise = modelContext.execute(
    "knowledge_access",
    { profileVersion: "0.1" },
    execution.signal,
  );
  execution.abort(new DOMException("caller canceled", "AbortError"));
  release?.();

  await assert.rejects(resultPromise, { name: "AbortError" });
});

test("partial registration failure aborts earlier registrations", async () => {
  const modelContext = new FakeModelContext();
  modelContext.failOnTool = "knowledge_open";

  await assert.rejects(
    registerKnowledgeTools({
      adapter: createProvider("publisher"),
      route: {
        pathname: "/publisher",
        capabilities: ["knowledge_search", "knowledge_open"],
      },
      modelContext,
    }),
    (error: unknown) =>
      error instanceof WebMcpRegistrationError && error.toolName === "knowledge_open",
  );
  assert.equal(modelContext.tools.size, 0);
});

test("document adapter is injectable and unsupported documents degrade cleanly", async () => {
  assert.equal(getDocumentModelContext({}), null);

  const fake = new FakeModelContext();
  const adapted = getDocumentModelContext({
    modelContext: { registerTool: fake.registerTool.bind(fake) },
  });
  assert.ok(adapted);

  const unsupported = await registerKnowledgeTools({
    adapter: createProvider("society"),
    route: { pathname: "/society" },
    document: {},
  });
  assert.equal(unsupported.supported, false);
  assert.deepEqual(unsupported.registeredToolNames, []);
});

test("cross-origin exposure remains explicit and restricted to trustworthy origins", async () => {
  const modelContext = new FakeModelContext();
  await registerKnowledgeTools({
    adapter: createProvider("society"),
    route: {
      pathname: "/society",
      capabilities: ["knowledge_describe"],
    },
    modelContext,
    exposedTo: ["https://trusted.example/path", "https://trusted.example"],
  });
  assert.deepEqual(modelContext.registrations[0]?.options?.exposedTo, [
    "https://trusted.example",
  ]);

  await assert.rejects(
    registerKnowledgeTools({
      adapter: createProvider("society"),
      route: { pathname: "/society" },
      modelContext: new FakeModelContext(),
      exposedTo: ["http://not-trustworthy.example"],
    }),
    TypeError,
  );
});

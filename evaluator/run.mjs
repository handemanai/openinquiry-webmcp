// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ADAPTER_PROTOCOL } from "./adapter-runtime.mjs";
import {
  CANONICAL_PROFILE_SCHEMA_ID,
  CANONICAL_PROFILE_VALIDATOR,
  evaluateCanonicalResponse,
} from "./canonical-validation.mjs";
import { verifyManifest } from "./verify-manifest.mjs";

const baseResponsesUrl = new URL("./fixtures/base-responses.json", import.meta.url);
const vectorUrls = [
  new URL("./vectors/semantic.json", import.meta.url),
  new URL("./vectors/client-preservation.json", import.meta.url),
];
const MAX_ADAPTER_STDOUT_LINE_BYTES = 1_048_576;
const MAX_ADAPTER_STDERR_BYTES = 16_384;
const ADAPTER_EXIT_TIMEOUT_MS = 5_000;
const ADAPTER_ENV_ALLOWLIST = Object.freeze([
  "COMSPEC",
  "LANG",
  "LC_ALL",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "WINDIR",
]);

function adapterEnvironment() {
  const environment = { NO_COLOR: "1" };
  for (const key of ADAPTER_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function digestJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function pointerTokens(pointer) {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`Mutation path must be a JSON Pointer: ${String(pointer)}`);
  }
  return pointer.slice(1).split("/").map((token) =>
    token.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function resolveParent(document, pointer) {
  const tokens = pointerTokens(pointer);
  const key = tokens.pop();
  let parent = document;
  for (const token of tokens) {
    if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, token)) {
      throw new Error(`Mutation path does not exist: ${pointer}`);
    }
    parent = parent[token];
  }
  return { parent, key };
}

function applyMutation(document, mutation) {
  const { parent, key } = resolveParent(document, mutation.path);
  if (!parent || typeof parent !== "object" || key === undefined) {
    throw new Error(`Mutation parent is not an object: ${mutation.path}`);
  }
  if (mutation.op === "remove") {
    if (!Object.hasOwn(parent, key)) throw new Error(`Cannot remove absent path: ${mutation.path}`);
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
    return;
  }
  if (mutation.op === "replace" && !Object.hasOwn(parent, key)) {
    throw new Error(`Cannot replace absent path: ${mutation.path}`);
  }
  if (mutation.op === "add" || mutation.op === "replace") {
    if (Array.isArray(parent)) parent[Number(key)] = structuredClone(mutation.value);
    else parent[key] = structuredClone(mutation.value);
    return;
  }
  throw new Error(`Unsupported mutation operation: ${String(mutation.op)}`);
}

function materializeVector(vector, bases, vectorSet) {
  if (!Object.hasOwn(bases, vector.base)) {
    throw new Error(`${vector.id}: unknown base response ${String(vector.base)}`);
  }
  const response = structuredClone(bases[vector.base]);
  for (const mutation of vector.mutations ?? []) applyMutation(response, mutation);
  const adapterMetadata = {
    vectorSet,
    vectorId: vector.id,
    evaluatorOpaqueProbe: {
      preserveExactValues: true,
      orderProbe: ["provider", "resource", "rights", "receipt"],
    },
    ...(vector.adapterMetadata ?? {}),
  };
  return { ...vector, vectorSet, response, adapterMetadata };
}

class AdapterClient {
  constructor(command) {
    const [executable, ...args] = command;
    if (typeof executable !== "string" || executable.length === 0) {
      throw new Error("Adapter executable must be a non-empty string");
    }
    this.child = spawn(executable, args, {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: adapterEnvironment(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.pending = new Map();
    this.stderr = "";
    this.stdoutBuffer = "";
    this.fatal = undefined;
    this.exitState = undefined;
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk) => this.onStdout(chunk));
    this.child.stderr.on("data", (chunk) => {
      if (this.stderr.length < MAX_ADAPTER_STDERR_BYTES) {
        this.stderr = `${this.stderr}${chunk.toString("utf8")}`
          .slice(0, MAX_ADAPTER_STDERR_BYTES);
      }
    });
    this.child.on("error", (error) => {
      this.exitState = { error };
      this.resolveExit(this.exitState);
      this.failAll(error, false);
    });
    this.child.on("exit", (code, signal) => {
      this.exitState = { code, signal };
      this.resolveExit(this.exitState);
      if (this.pending.size > 0) {
        this.failAll(
          new Error(`Adapter exited before replying (code ${String(code)}, signal ${String(signal)})`),
          false,
        );
      }
    });
  }

  onStdout(chunk) {
    if (this.fatal) return;
    this.stdoutBuffer += chunk;
    let newlineIndex = this.stdoutBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).replace(/\r$/u, "");
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (Buffer.byteLength(line, "utf8") > MAX_ADAPTER_STDOUT_LINE_BYTES) {
        this.failAll(new Error("Adapter stdout line exceeded the 1 MiB protocol limit"));
        return;
      }
      this.onLine(line);
      if (this.fatal) return;
      newlineIndex = this.stdoutBuffer.indexOf("\n");
    }
    if (Buffer.byteLength(this.stdoutBuffer, "utf8") > MAX_ADAPTER_STDOUT_LINE_BYTES) {
      this.failAll(new Error("Adapter stdout line exceeded the 1 MiB protocol limit"));
    }
  }

  onLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.failAll(new Error(`Adapter emitted non-JSON stdout: ${line.slice(0, 200)}`));
      return;
    }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      this.failAll(new Error("Adapter response must be a JSON object"));
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) {
      this.failAll(new Error(`Adapter emitted an unexpected response id: ${String(message.id)}`));
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(message.id);
    pending.resolve(message);
  }

  failAll(error, terminate = true) {
    this.fatal ??= error;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
    if (terminate) this.terminate();
  }

  request(message, timeoutMs = 5_000) {
    if (this.fatal) return Promise.reject(this.fatal);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.failAll(new Error(`Adapter timed out for ${message.id}`));
      }, timeoutMs);
      if (this.pending.has(message.id)) {
        clearTimeout(timeout);
        reject(new Error(`Duplicate pending adapter request id: ${message.id}`));
        return;
      }
      this.pending.set(message.id, { resolve, reject, timeout });
      this.child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error) {
          this.failAll(error);
        }
      });
    });
  }

  async finish(timeoutMs = ADAPTER_EXIT_TIMEOUT_MS) {
    if (this.fatal) throw this.fatal;
    this.child.stdin.end();
    let timeout;
    const timedOut = new Promise((resolve) => {
      timeout = setTimeout(() => resolve({ timeout: true }), timeoutMs);
    });
    const state = await Promise.race([this.exitPromise, timedOut]);
    clearTimeout(timeout);
    if (state.timeout) {
      this.terminate();
      throw new Error("Adapter did not exit after standard input closed");
    }
    if (state.error) throw state.error;
    if (state.signal || state.code !== 0) {
      const diagnostic = this.stderr ? `: ${this.stderr.trim()}` : "";
      throw new Error(
        `Adapter did not exit cleanly (code ${String(state.code)}, signal ${String(state.signal)})${diagnostic}`,
      );
    }
    if (this.stdoutBuffer.length > 0) {
      throw new Error("Adapter ended with a non-terminated stdout line");
    }
  }

  terminate() {
    if (this.child.exitCode === null && this.child.signalCode === null && !this.child.killed) {
      this.child.kill();
    }
  }
}

function expectedDiagnosticPresent(vector, canonical) {
  if (!vector.expectedDiagnostic) return true;
  const messages = vector.expectedLayer === "schema"
    ? canonical.schema.map((error) => `${error.path} ${error.message}`)
    : canonical.semantic;
  return messages.some((message) => message.includes(vector.expectedDiagnostic));
}

function assessAdapterReply(vector, reply) {
  const failures = [];
  if (reply.protocol !== ADAPTER_PROTOCOL) failures.push("adapter returned the wrong protocol identifier");
  if (reply.id !== vector.id) failures.push("adapter returned the wrong vector id");
  if (!isDeepStrictEqual(reply.adapterMetadata, vector.adapterMetadata)) {
    failures.push("adapter rewrote or dropped opaque adapter metadata");
  }
  if (vector.expected === "accept") {
    if (reply.decision !== "accept") failures.push(`expected accept, received ${String(reply.decision)}`);
    if (!Object.hasOwn(reply, "response")) failures.push("accepted result omitted the response");
    else if (!isDeepStrictEqual(reply.response, vector.response)) {
      failures.push("adapter rewrote the accepted OpenInquiry response");
    }
  } else {
    if (reply.decision !== "reject") failures.push(`expected reject, received ${String(reply.decision)}`);
    if (Object.hasOwn(reply, "response")) {
      failures.push("rejected input was returned in rewritten or normalized form");
    }
    if (!Array.isArray(reply.diagnostics) || reply.diagnostics.length === 0) {
      failures.push("rejection did not include adapter diagnostics");
    }
  }
  return failures;
}

export async function runEvaluator({
  adapterCommand,
  expectedManifestDigest,
  verifyIntegrity = true,
} = {}) {
  if (!Array.isArray(adapterCommand) || adapterCommand.length === 0) {
    throw new Error("An adapter command is required");
  }

  const integrity = await verifyManifest({ expectedDigest: expectedManifestDigest });
  if (verifyIntegrity && !integrity.ok) {
    throw new Error(`Evaluator manifest verification failed:\n- ${integrity.errors.join("\n- ")}`);
  }

  const bases = await readJson(baseResponsesUrl);
  const vectorSets = await Promise.all(vectorUrls.map(readJson));
  const vectors = vectorSets.flatMap((set) =>
    set.vectors.map((vector) => materializeVector(vector, bases, set.vectorSet)));

  for (const vector of vectors) {
    const canonical = evaluateCanonicalResponse(vector.response);
    const canonicalExpected = vector.expected === "accept";
    if (canonical.accepted !== canonicalExpected || !expectedDiagnosticPresent(vector, canonical)) {
      throw new Error(`${vector.id}: vector expectation does not match the canonical schema and semantic validator`);
    }
  }

  const client = new AdapterClient(adapterCommand);
  const cases = [];
  let implementation;
  let protocolCompleted = false;
  try {
    const handshakeMetadata = {
      opaqueHandshakeProbe: "must survive unchanged",
      manifestDigest: integrity.manifestDigest,
    };
    const handshake = await client.request({
      protocol: ADAPTER_PROTOCOL,
      id: "handshake",
      operation: "handshake",
      adapterMetadata: handshakeMetadata,
    });
    const handshakeFailures = [];
    if (handshake.protocol !== ADAPTER_PROTOCOL) handshakeFailures.push("wrong handshake protocol");
    if (handshake.id !== "handshake") handshakeFailures.push("wrong handshake id");
    if (!isDeepStrictEqual(handshake.adapterMetadata, handshakeMetadata)) {
      handshakeFailures.push("opaque handshake metadata was not preserved");
    }
    if (!handshake.implementation || typeof handshake.implementation !== "object") {
      handshakeFailures.push("implementation identity is missing");
    }
    if (handshakeFailures.length > 0) throw new Error(handshakeFailures.join("; "));
    implementation = handshake.implementation;

    for (const vector of vectors) {
      let failures;
      let adapterDiagnostics;
      try {
        const reply = await client.request({
          protocol: ADAPTER_PROTOCOL,
          id: vector.id,
          operation: "evaluate_response",
          response: vector.response,
          adapterMetadata: vector.adapterMetadata,
        });
        failures = assessAdapterReply(vector, reply);
        if (failures.length > 0 && Object.hasOwn(reply, "diagnostics")) {
          adapterDiagnostics = reply.diagnostics;
        }
      } catch (error) {
        failures = [error instanceof Error ? error.message : String(error)];
      }
      cases.push({
        id: vector.id,
        vectorSet: vector.vectorSet,
        expected: vector.expected,
        result: failures.length === 0 ? "pass" : "fail",
        failures,
        ...(adapterDiagnostics === undefined ? {} : { adapterDiagnostics }),
      });
    }
    protocolCompleted = true;
    await client.finish();
  } finally {
    if (!protocolCompleted) client.terminate();
  }

  const passed = cases.filter((candidate) => candidate.result === "pass").length;
  const failed = cases.length - passed;
  const reportCore = {
    reportFormat: "openinquiry-independent-evaluator-report/0.1",
    evidenceOnly: true,
    certification: false,
    profile: {
      name: "openinquiry.publisher-knowledge-access",
      version: "0.1",
      schemaId: CANONICAL_PROFILE_SCHEMA_ID,
      schemaValidator: CANONICAL_PROFILE_VALIDATOR,
      semanticValidator: "src/lib/profile/validation.ts#validateKnowledgeResponse",
    },
    pack: {
      name: integrity.manifest.pack?.name,
      version: integrity.manifest.pack?.version,
      manifestDigest: integrity.manifestDigest,
      integrityVerified: integrity.ok,
      externallyPinned: integrity.externallyPinned,
    },
    adapter: implementation,
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    summary: {
      result: failed === 0 ? "vectors_passed" : "vectors_failed",
      total: cases.length,
      passed,
      failed,
    },
    cases,
    limitations: [
      "This report is one local observation over deterministic vectors for the named adapter and manifest.",
      "It is not certification, adoption, production security, legal sufficiency, client interoperability, or downstream policy-compliance proof.",
      "The evaluator does not inspect authentication, provider authority, protected-content rights, telemetry outside receipts, repeated-call controls, visible browser behavior, or named-client behavior.",
      "The adapter process is not sandboxed; network-free execution is a documented convention, not an enforced boundary.",
    ],
  };
  return {
    ...reportCore,
    reportDigest: digestJson(reportCore),
  };
}

function adapterCommandFromArgs(args) {
  const marker = args.indexOf("--adapter");
  if (marker === -1 || marker === args.length - 1) {
    throw new Error("Usage: node --experimental-strip-types evaluator/run.mjs --adapter <command> [arguments...]");
  }
  return args.slice(marker + 1);
}

function expectedManifestDigestFromArgs(args) {
  const marker = args.indexOf("--adapter");
  const runnerArgs = marker === -1 ? args : args.slice(0, marker);
  const digestMarker = runnerArgs.indexOf("--expected-manifest-digest");
  if (digestMarker === -1) return undefined;
  const digest = runnerArgs[digestMarker + 1];
  if (!/^[a-f0-9]{64}$/u.test(digest ?? "")) {
    throw new Error("--expected-manifest-digest requires a lowercase SHA-256 digest");
  }
  return digest;
}

async function main() {
  const args = process.argv.slice(2);
  const report = await runEvaluator({
    adapterCommand: adapterCommandFromArgs(args),
    expectedManifestDigest: expectedManifestDigestFromArgs(args),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.summary.failed > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

export const DEFAULT_DEMO_RETRIEVAL_MAX_SESSION_RECORDS = 2048;
export const DEMO_RETRIEVAL_LEDGER_VERSION = 1 as const;

export const DEFAULT_DEMO_RETRIEVAL_LIMITS = Object.freeze({
  perResourceCharacters: 900,
  perProviderCharacters: 2400,
  maxDistinctUnitsPerResource: 3,
});

export interface DemoRetrievalLimits {
  perResourceCharacters: number;
  perProviderCharacters: number;
  maxDistinctUnitsPerResource: number;
}

export interface DemoRetrievalLedgerEntry {
  providerId: string;
  resourceId: string;
  characters: number;
  unitIds: readonly string[];
}

/**
 * Compact server-authored budget state carried inside the signed HttpOnly demo
 * session. It contains source identifiers and counters, never returned text,
 * prompts, clinical questions, credentials, or user identity.
 */
export interface DemoRetrievalLedger {
  version: typeof DEMO_RETRIEVAL_LEDGER_VERSION;
  entries: readonly DemoRetrievalLedgerEntry[];
}

export const EMPTY_DEMO_RETRIEVAL_LEDGER: DemoRetrievalLedger = Object.freeze({
  version: DEMO_RETRIEVAL_LEDGER_VERSION,
  entries: Object.freeze([]),
});

const MAX_LEDGER_ENTRIES = 16;
const MAX_LEDGER_UNITS_PER_ENTRY = 3;
const MAX_LEDGER_CHARACTERS = 500_000;
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,160}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && SAFE_IDENTIFIER.test(value);
}

export function isDemoRetrievalLedger(value: unknown): value is DemoRetrievalLedger {
  if (!isRecord(value)
    || value.version !== DEMO_RETRIEVAL_LEDGER_VERSION
    || !Array.isArray(value.entries)
    || value.entries.length > MAX_LEDGER_ENTRIES) return false;

  const entryKeys = new Set<string>();
  for (const entry of value.entries) {
    if (!isRecord(entry)
      || Object.keys(entry).sort().join(",") !== "characters,providerId,resourceId,unitIds"
      || !isSafeIdentifier(entry.providerId)
      || !isSafeIdentifier(entry.resourceId)
      || !Number.isInteger(entry.characters)
      || Number(entry.characters) < 0
      || Number(entry.characters) > MAX_LEDGER_CHARACTERS
      || !Array.isArray(entry.unitIds)
      || entry.unitIds.length > MAX_LEDGER_UNITS_PER_ENTRY
      || !entry.unitIds.every(isSafeIdentifier)
      || new Set(entry.unitIds).size !== entry.unitIds.length) return false;
    const entryKey = `${entry.providerId}\u0000${entry.resourceId}`;
    if (entryKeys.has(entryKey)) return false;
    entryKeys.add(entryKey);
  }
  return true;
}

export interface DemoRetrievalAttempt {
  sessionId: string;
  sessionExpiresAt: string;
  providerId: string;
  resourceId: string;
  /** Trusted provider unit selected by server-side application logic. */
  unitId: string;
  content: string;
  returnedUnitDigest?: string;
  /** Trusted provider-policy ceiling for this resource in the current session. */
  resourceCharacterLimit?: number;
  /** Trusted provider-policy ceiling for this provider in the current session. */
  providerCharacterLimit?: number;
  /** Trusted provider-policy ceiling for distinct protected units in this session. */
  resourceUnitLimit?: number;
}

export type DemoRetrievalDecision =
  | { allowed: true; returnedUnitDigest: string; replayed?: true }
  | {
      allowed: false;
      returnedUnitDigest: string;
      reason: "overlap" | "resource_budget" | "provider_budget" | "unit_budget";
    };

interface ResourceRecord {
  characters: number;
  unitIds: Set<string>;
}

interface ProviderRecord {
  characters: number;
  resources: Map<string, ResourceRecord>;
}

interface SessionRecord {
  expiresAtMs: number;
  lastAccessedAtMs: number;
  providers: Map<string, ProviderRecord>;
}

export type DemoRetrievalBudgetOptions = Partial<DemoRetrievalLimits> & {
  now?: () => Date;
  maxSessionRecords?: number;
};

export interface DemoRetrievalBudget {
  checkAndRecord(attempt: DemoRetrievalAttempt): DemoRetrievalDecision;
  hydrateSession(
    sessionId: string,
    sessionExpiresAt: string,
    ledger: DemoRetrievalLedger,
  ): void;
  snapshotSession(sessionId: string): DemoRetrievalLedger;
  forgetSession(sessionId: string): void;
}

export function sha256Digest(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function validateLimits(limits: DemoRetrievalLimits): void {
  if (!Number.isInteger(limits.perResourceCharacters) || limits.perResourceCharacters < 1) {
    throw new Error("perResourceCharacters must be a positive integer.");
  }
  if (!Number.isInteger(limits.perProviderCharacters) || limits.perProviderCharacters < 1) {
    throw new Error("perProviderCharacters must be a positive integer.");
  }
  if (!Number.isInteger(limits.maxDistinctUnitsPerResource)
    || limits.maxDistinctUnitsPerResource < 1
    || limits.maxDistinctUnitsPerResource > MAX_LEDGER_UNITS_PER_ENTRY) {
    throw new Error(`maxDistinctUnitsPerResource must be between 1 and ${MAX_LEDGER_UNITS_PER_ENTRY}.`);
  }
}

/**
 * Enforces sequential retrieval limits from a compact signed-session ledger.
 * A route can hydrate the ledger from a verified cookie, execute one request,
 * and sign the resulting snapshot into the replacement cookie. The in-memory
 * map is only request-local on that path and is also convenient for unit tests.
 */
export function createDemoRetrievalBudget(
  options: DemoRetrievalBudgetOptions = {},
): DemoRetrievalBudget {
  const {
    now = () => new Date(),
    maxSessionRecords = DEFAULT_DEMO_RETRIEVAL_MAX_SESSION_RECORDS,
    ...overrides
  } = options;
  const limits = { ...DEFAULT_DEMO_RETRIEVAL_LIMITS, ...overrides };
  validateLimits(limits);
  if (!Number.isInteger(maxSessionRecords) || maxSessionRecords < 1) {
    throw new Error("maxSessionRecords must be a positive integer.");
  }
  const sessions = new Map<string, SessionRecord>();

  function currentTimeMs(): number {
    const value = now().getTime();
    if (!Number.isFinite(value)) throw new Error("The retrieval-budget clock is invalid.");
    return value;
  }

  function sessionExpiryMs(value: string, currentMs: number): number {
    const expiresAtMs = Date.parse(value);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= currentMs) {
      throw new Error("The retrieval-budget session expiry must be in the future.");
    }
    return expiresAtMs;
  }

  function pruneExpired(currentMs: number): void {
    for (const [sessionId, session] of sessions) {
      if (session.expiresAtMs <= currentMs) sessions.delete(sessionId);
    }
  }

  function evictOneSession(): void {
    let selected: { sessionId: string; record: SessionRecord } | undefined;
    for (const [sessionId, record] of sessions) {
      if (!selected
        || record.expiresAtMs < selected.record.expiresAtMs
        || (record.expiresAtMs === selected.record.expiresAtMs
          && record.lastAccessedAtMs < selected.record.lastAccessedAtMs)
        || (record.expiresAtMs === selected.record.expiresAtMs
          && record.lastAccessedAtMs === selected.record.lastAccessedAtMs
          && sessionId.localeCompare(selected.sessionId) < 0)) {
        selected = { sessionId, record };
      }
    }
    if (selected) sessions.delete(selected.sessionId);
  }

  function hydrateSession(
    sessionId: string,
    sessionExpiresAt: string,
    ledger: DemoRetrievalLedger,
  ): void {
    if (!isDemoRetrievalLedger(ledger)) throw new Error("The retrieval ledger is invalid.");
    const currentMs = currentTimeMs();
    pruneExpired(currentMs);
    const providers = new Map<string, ProviderRecord>();
    for (const entry of ledger.entries) {
      const provider = providers.get(entry.providerId) ?? {
        characters: 0,
        resources: new Map<string, ResourceRecord>(),
      };
      provider.characters += entry.characters;
      provider.resources.set(entry.resourceId, {
        characters: entry.characters,
        unitIds: new Set(entry.unitIds),
      });
      providers.set(entry.providerId, provider);
    }
    if (!sessions.has(sessionId) && sessions.size >= maxSessionRecords) evictOneSession();
    sessions.set(sessionId, {
      expiresAtMs: sessionExpiryMs(sessionExpiresAt, currentMs),
      lastAccessedAtMs: currentMs,
      providers,
    });
  }

  function snapshotSession(sessionId: string): DemoRetrievalLedger {
    const record = sessions.get(sessionId);
    if (!record) return EMPTY_DEMO_RETRIEVAL_LEDGER;
    const entries: DemoRetrievalLedgerEntry[] = [];
    for (const [providerId, provider] of [...record.providers].sort(([left], [right]) =>
      left.localeCompare(right))) {
      for (const [resourceId, resource] of [...provider.resources].sort(([left], [right]) =>
        left.localeCompare(right))) {
        entries.push(Object.freeze({
          providerId,
          resourceId,
          characters: resource.characters,
          unitIds: Object.freeze([...resource.unitIds].sort()),
        }));
      }
    }
    const snapshot = {
      version: DEMO_RETRIEVAL_LEDGER_VERSION,
      entries: Object.freeze(entries),
    } as const;
    if (!isDemoRetrievalLedger(snapshot)) throw new Error("The retrieval ledger exceeds its bounds.");
    return Object.freeze(snapshot);
  }

  function checkAndRecord(attempt: DemoRetrievalAttempt): DemoRetrievalDecision {
    if (!isSafeIdentifier(attempt.unitId)) {
      throw new Error("The retrieval unit ID is invalid.");
    }
    const currentMs = currentTimeMs();
    pruneExpired(currentMs);
    const expiresAtMs = sessionExpiryMs(attempt.sessionExpiresAt, currentMs);
    const digest = attempt.returnedUnitDigest ?? sha256Digest(attempt.content);
    const existingSession = sessions.get(attempt.sessionId);
    const session = existingSession ?? {
      expiresAtMs,
      lastAccessedAtMs: currentMs,
      providers: new Map(),
    };
    if (existingSession) {
      session.expiresAtMs = Math.min(session.expiresAtMs, expiresAtMs);
      session.lastAccessedAtMs = currentMs;
    }
    const provider = session.providers.get(attempt.providerId) ?? {
      characters: 0,
      resources: new Map(),
    };
    const resource: ResourceRecord = provider.resources.get(attempt.resourceId) ?? {
      characters: 0,
      unitIds: new Set(),
    };
    const resourceCharacterLimit = attempt.resourceCharacterLimit
      ?? limits.perResourceCharacters;
    const resourceUnitLimit = attempt.resourceUnitLimit
      ?? limits.maxDistinctUnitsPerResource;
    const providerCharacterLimit = attempt.providerCharacterLimit
      ?? limits.perProviderCharacters;
    if (!Number.isInteger(resourceCharacterLimit) || resourceCharacterLimit < 1) {
      throw new Error("resourceCharacterLimit must be a positive integer.");
    }
    if (!Number.isInteger(resourceUnitLimit)
      || resourceUnitLimit < 1
      || resourceUnitLimit > MAX_LEDGER_UNITS_PER_ENTRY) {
      throw new Error(`resourceUnitLimit must be between 1 and ${MAX_LEDGER_UNITS_PER_ENTRY}.`);
    }
    if (!Number.isInteger(providerCharacterLimit) || providerCharacterLimit < 1) {
      throw new Error("providerCharacterLimit must be a positive integer.");
    }

    if (resource.unitIds.has(attempt.unitId)) {
      return { allowed: true, returnedUnitDigest: digest, replayed: true };
    }
    if (resource.unitIds.size >= resourceUnitLimit) {
      return { allowed: false, returnedUnitDigest: digest, reason: "unit_budget" };
    }
    if (resource.characters + attempt.content.length > resourceCharacterLimit) {
      return { allowed: false, returnedUnitDigest: digest, reason: "resource_budget" };
    }
    if (provider.characters + attempt.content.length > providerCharacterLimit) {
      return { allowed: false, returnedUnitDigest: digest, reason: "provider_budget" };
    }

    resource.unitIds.add(attempt.unitId);
    resource.characters += attempt.content.length;
    provider.characters += attempt.content.length;
    provider.resources.set(attempt.resourceId, resource);
    session.providers.set(attempt.providerId, provider);
    if (!existingSession && sessions.size >= maxSessionRecords) evictOneSession();
    sessions.set(attempt.sessionId, session);
    return { allowed: true, returnedUnitDigest: digest };
  }

  return Object.freeze({
    checkAndRecord,
    hydrateSession,
    snapshotSession,
    forgetSession(sessionId: string): void {
      sessions.delete(sessionId);
    },
  });
}

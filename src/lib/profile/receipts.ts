import type {
  AccessDecision,
  KnowledgeToolName,
  ReceiptSeed,
  SourceReceipt,
} from "./types.ts";

export interface SourceReceiptInput {
  seed: ReceiptSeed;
  providerId: string;
  toolName: KnowledgeToolName;
  resourceIds: readonly string[];
  access?: AccessDecision;
  policyId?: string;
  decision: SourceReceipt["decision"];
}

/**
 * Builds a receipt from an explicit allowlist of provider-side decision fields.
 * There is intentionally no parameter for a prompt, query, patient context,
 * credential, token, or user identifier.
 */
export function createSourceReceipt(input: SourceReceiptInput): SourceReceipt {
  const resourceIds = [...new Set(input.resourceIds)].sort();
  const receipt: SourceReceipt = {
    receiptId: input.seed.receiptId,
    issuedAt: input.seed.issuedAt,
    providerId: input.providerId,
    toolName: input.toolName,
    resourceIds,
    decision: input.decision,
    retention: input.seed.retention ?? "session",
  };

  if (input.access) {
    receipt.accessState = input.access.state;
    receipt.accessBasis = input.access.basis;
  }
  if (input.policyId) receipt.policyId = input.policyId;
  if (input.seed.returnedUnitDigest) {
    receipt.returnedUnitDigest = input.seed.returnedUnitDigest;
  }

  return receipt;
}

export const SOURCE_RECEIPT_KEYS = new Set<keyof SourceReceipt>([
  "receiptId",
  "issuedAt",
  "providerId",
  "toolName",
  "resourceIds",
  "accessState",
  "accessBasis",
  "policyId",
  "decision",
  "returnedUnitDigest",
  "retention",
]);

/** Rejects extra receipt properties, including accidental raw-query telemetry. */
export function receiptHasOnlyMinimizedFields(value: unknown): value is SourceReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => SOURCE_RECEIPT_KEYS.has(key as keyof SourceReceipt));
}

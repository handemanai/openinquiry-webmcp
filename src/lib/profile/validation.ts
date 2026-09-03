import {
  PROFILE_NAME,
  PROFILE_VERSION,
  type KnowledgeResponse,
  type SourceReceipt,
} from "./types.ts";
import { receiptHasOnlyMinimizedFields } from "./receipts.ts";

const RESPONSE_STATUSES = new Set(["ok", "limited", "denied", "not_found", "error"]);
const PROVIDER_ROLES = new Set(["publisher", "society", "library", "repository", "other"]);
const RESOURCE_STATUSES = new Set([
  "current",
  "updated",
  "corrected",
  "retracted",
  "withdrawn",
  "unknown",
]);
const RECEIPT_DECISIONS = new Set(["supplied", "limited", "denied", "metadata_only"]);
const TOOL_NAMES = new Set([
  "knowledge_describe",
  "knowledge_access",
  "knowledge_search",
  "knowledge_retrieve",
  "knowledge_resolve",
  "knowledge_open",
  "knowledge_status",
]);
const ACTION_TYPES = new Set([
  "open",
  "deep_link",
  "sign_in",
  "join",
  "subscribe",
  "institutional_access",
  "purchase",
  "contact_library",
]);
const ERROR_CODES = new Set([
  "INVALID_REQUEST",
  "ENTITLEMENT_REQUIRED",
  "USE_NOT_PERMITTED",
  "RESOURCE_NOT_FOUND",
  "RESOURCE_RETRACTED",
  "RESOURCE_WITHDRAWN",
  "QUERY_TOO_BROAD",
  "REQUEST_TOO_LARGE",
  "SENSITIVE_QUERY_REJECTED",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "PROFILE_VERSION_UNSUPPORTED",
]);

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const RFC3339_FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const RFC3339_FULL_TIME = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(z|([+-])(\d{2})(?::?(\d{2}))?)$/iu;

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Matches the canonical schema validator's RFC 3339 full-date assertion. */
function validFullDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339_FULL_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = [0, 31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month];
}

function validFullTime(value: string): boolean {
  const match = RFC3339_FULL_TIME.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  const timezoneSign = match[5] === "-" ? -1 : 1;
  const timezoneHour = Number(match[6] ?? 0);
  const timezoneMinute = Number(match[7] ?? 0);
  if (timezoneHour > 23 || timezoneMinute > 59) return false;
  if (hour <= 23 && minute <= 59 && second < 60) return true;

  // RFC 3339 permits a leap second only at the end of a UTC day.
  const utcMinute = minute - timezoneMinute * timezoneSign;
  const utcHour = hour - timezoneHour * timezoneSign - (utcMinute < 0 ? 1 : 0);
  return (utcHour === 23 || utcHour === -1)
    && (utcMinute === 59 || utcMinute === -1)
    && second < 61;
}

/** Matches the canonical schema validator's RFC 3339 date-time assertion. */
function validDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.split(/[t\s]/iu);
  return parts.length === 2 && validFullDate(parts[0]) && validFullTime(parts[1]);
}

function validUrl(value: unknown): boolean {
  if (!nonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
) {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allow.has(key)) errors.push(`${path}.${key} is not allowed`);
  }
}

function validateReceipt(value: unknown, errors: string[]): value is SourceReceipt {
  if (!object(value)) {
    errors.push("receipt must be an object");
    return false;
  }
  if (!receiptHasOnlyMinimizedFields(value)) {
    errors.push("receipt contains a non-minimized field");
  }
  for (const key of ["receiptId", "issuedAt", "providerId", "toolName", "decision", "retention"] as const) {
    if (!nonEmptyString(value[key])) errors.push(`receipt.${key} must be a non-empty string`);
  }
  if (value.issuedAt !== undefined && !validDateTime(value.issuedAt)) {
    errors.push("receipt.issuedAt must be an RFC 3339 date-time");
  }
  if (!TOOL_NAMES.has(String(value.toolName))) errors.push("receipt.toolName is not a profile tool");
  if (!RECEIPT_DECISIONS.has(String(value.decision))) errors.push("receipt.decision is invalid");
  if (value.retention !== "session" && value.retention !== "provider_policy") {
    errors.push("receipt.retention is invalid");
  }
  if (!Array.isArray(value.resourceIds) || value.resourceIds.some((id) => !nonEmptyString(id))) {
    errors.push("receipt.resourceIds must contain only non-empty strings");
  }
  return errors.length === 0;
}

/**
 * Dependency-free structural and semantic validator for provider responses.
 * It is intentionally stricter than TypeScript at runtime and complements the
 * published JSON Schema without requiring an application-wide dependency.
 */
export function validateKnowledgeResponse(value: unknown): string[] {
  const errors: string[] = [];
  if (!object(value)) return ["response must be an object"];
  exactKeys(
    value,
    [
      "profile",
      "status",
      "provider",
      "access",
      "rights",
      "resources",
      "grants",
      "receipt",
      "actions",
      "warnings",
      "error",
    ],
    "response",
    errors,
  );

  if (!object(value.profile)) {
    errors.push("profile must be an object");
  } else {
    exactKeys(
      value.profile,
      ["name", "version", "schemaUrl", "supportedVersions"],
      "profile",
      errors,
    );
    if (value.profile.name !== PROFILE_NAME) errors.push("profile.name is invalid");
    if (value.profile.version !== PROFILE_VERSION) errors.push("profile.version is invalid");
    if (value.profile.schemaUrl !== undefined && !validUrl(value.profile.schemaUrl)) {
      errors.push("profile.schemaUrl must be an HTTP(S) URL");
    }
    if (value.profile.supportedVersions !== undefined
      && (!Array.isArray(value.profile.supportedVersions)
        || value.profile.supportedVersions.length === 0
        || value.profile.supportedVersions.some((version) => version !== PROFILE_VERSION))) {
      errors.push("profile.supportedVersions must contain supported profile versions");
    }
  }
  if (!RESPONSE_STATUSES.has(String(value.status))) errors.push("status is invalid");

  if (!object(value.provider)) {
    errors.push("provider must be an object");
  } else {
    exactKeys(
      value.provider,
      ["id", "name", "role", "canonicalUrl", "rightsHolderName", "policyUrl"],
      "provider",
      errors,
    );
    if (!nonEmptyString(value.provider.id)) errors.push("provider.id is required");
    if (!nonEmptyString(value.provider.name)) errors.push("provider.name is required");
    if (!PROVIDER_ROLES.has(String(value.provider.role))) errors.push("provider.role is invalid");
    if (!validUrl(value.provider.canonicalUrl)) errors.push("provider.canonicalUrl must be an HTTP(S) URL");
    if (value.provider.policyUrl !== undefined && !validUrl(value.provider.policyUrl)) {
      errors.push("provider.policyUrl must be an HTTP(S) URL");
    }
  }

  const resourceIds = new Set<string>();
  const resources = value.resources;
  if (resources !== undefined) {
    if (!Array.isArray(resources)) {
      errors.push("resources must be an array");
    } else {
      resources.forEach((resource, index) => {
        const path = `resources[${index}]`;
        if (!object(resource)) {
          errors.push(`${path} must be an object`);
          return;
        }
        exactKeys(
          resource,
          [
            "id",
            "type",
            "title",
            "authors",
            "responsibleOrganization",
            "containerTitle",
            "identifiers",
            "canonicalUrl",
            "deepLink",
            "locator",
            "dates",
            "version",
            "status",
            "statusNote",
            "statusUrl",
          ],
          path,
          errors,
        );
        if (!nonEmptyString(resource.id)) errors.push(`${path}.id is required`);
        else resourceIds.add(resource.id);
        if (!nonEmptyString(resource.type)) errors.push(`${path}.type is required`);
        if (!nonEmptyString(resource.title)) errors.push(`${path}.title is required`);
        if (!Array.isArray(resource.authors) || resource.authors.length === 0) {
          errors.push(`${path}.authors must include at least one author or speaker`);
        } else {
          resource.authors.forEach((author, authorIndex) => {
            if (!object(author) || !nonEmptyString(author.name)) {
              errors.push(`${path}.authors[${authorIndex}].name is required`);
            }
          });
        }
        if (!validUrl(resource.canonicalUrl)) errors.push(`${path}.canonicalUrl must be an HTTP(S) URL`);
        if (resource.deepLink !== undefined && !validUrl(resource.deepLink)) {
          errors.push(`${path}.deepLink must be an HTTP(S) URL`);
        }
        if (!object(resource.dates)) {
          errors.push(`${path}.dates must be an object`);
        } else {
          exactKeys(resource.dates, ["published", "updated", "checked"], `${path}.dates`, errors);
          if (resource.dates.published !== undefined && !validFullDate(resource.dates.published)) {
            errors.push(`${path}.dates.published must be an RFC 3339 full-date`);
          }
          if (resource.dates.updated !== undefined && !validFullDate(resource.dates.updated)) {
            errors.push(`${path}.dates.updated must be an RFC 3339 full-date`);
          }
          if (resource.dates.checked !== undefined && !validDateTime(resource.dates.checked)) {
            errors.push(`${path}.dates.checked must be an RFC 3339 date-time`);
          }
        }
        if (!RESOURCE_STATUSES.has(String(resource.status))) errors.push(`${path}.status is invalid`);
        if ((resource.status === "corrected" || resource.status === "retracted" || resource.status === "withdrawn")
          && !nonEmptyString(resource.statusUrl)) {
          errors.push(`${path}.statusUrl is required for corrected, retracted, or withdrawn resources`);
        }
      });
    }
  }

  if (value.access !== undefined) {
    if (!object(value.access)) {
      errors.push("access must be an object");
    } else {
      exactKeys(value.access, ["state", "basis", "basisLabel", "decidedBy", "validUntil"], "access", errors);
      if (!nonEmptyString(value.access.state)) errors.push("access.state is required");
      if (!nonEmptyString(value.access.basis)) errors.push("access.basis is required");
      if (!nonEmptyString(value.access.decidedBy)) errors.push("access.decidedBy is required");
      if (value.access.validUntil !== undefined && !validDateTime(value.access.validUntil)) {
        errors.push("access.validUntil must be an RFC 3339 date-time");
      }
      if (object(value.provider) && value.access.decidedBy !== value.provider.id) {
        errors.push("access.decidedBy must identify the response provider");
      }
    }
  }

  if (value.rights !== undefined) {
    if (!object(value.rights)) {
      errors.push("rights must be an object");
    } else {
      exactKeys(
        value.rights,
        ["policyId", "decision", "allowedUses", "prohibitedUses", "limits", "attribution", "requestedHandling", "policyUrl"],
        "rights",
        errors,
      );
      if (!nonEmptyString(value.rights.policyId)) errors.push("rights.policyId is required");
      if (!new Set(["allow", "allow_with_limits", "deny"]).has(String(value.rights.decision))) {
        errors.push("rights.decision is invalid");
      }
      if (!Array.isArray(value.rights.allowedUses)) errors.push("rights.allowedUses must be an array");
      if (value.rights.limits !== undefined) {
        if (!object(value.rights.limits)) {
          errors.push("rights.limits must be an object");
        } else if (value.rights.limits.expiresAt !== undefined
          && !validDateTime(value.rights.limits.expiresAt)) {
          errors.push("rights.limits.expiresAt must be an RFC 3339 date-time");
        }
      }
      if (!object(value.rights.attribution) || typeof value.rights.attribution.required !== "boolean") {
        errors.push("rights.attribution.required must be boolean");
      }
      if (value.rights.requestedHandling !== undefined) {
        if (!object(value.rights.requestedHandling)
          || value.rights.requestedHandling.verification !== "not_verified_by_webmcp") {
          errors.push("rights.requestedHandling must state that WebMCP does not verify compliance");
        }
      }
    }
  }

  if (value.grants !== undefined) {
    if (!Array.isArray(value.grants)) {
      errors.push("grants must be an array");
    } else {
      value.grants.forEach((grant, index) => {
        const path = `grants[${index}]`;
        if (!object(grant)) {
          errors.push(`${path} must be an object`);
          return;
        }
        exactKeys(
          grant,
          ["resourceId", "representation", "content", "locator", "suppliedByProvider", "contentDigest"],
          path,
          errors,
        );
        if (!resourceIds.has(String(grant.resourceId))) errors.push(`${path}.resourceId has no matching resource`);
        if (grant.suppliedByProvider !== true) errors.push(`${path}.suppliedByProvider must be true`);
        if (grant.representation === "link_only" && grant.content !== undefined) {
          errors.push(`${path}.content is not permitted for link_only`);
        }
      });
    }
  }

  const receiptErrorsBefore = errors.length;
  validateReceipt(value.receipt, errors);
  if (errors.length === receiptErrorsBefore && object(value.receipt) && object(value.provider)) {
    if (value.receipt.providerId !== value.provider.id) errors.push("receipt.providerId must match provider.id");
    if (Array.isArray(value.receipt.resourceIds)) {
      for (const id of value.receipt.resourceIds) {
        if (resources !== undefined && !resourceIds.has(String(id))) {
          errors.push(`receipt.resourceIds contains unknown resource ${String(id)}`);
        }
      }
    }
  }

  if (resources !== undefined && Array.isArray(resources) && resources.length > 0) {
    if (object(value.provider) && value.provider.role === "library"
      && !nonEmptyString(value.provider.rightsHolderName)) {
      errors.push("library resource responses must identify the actual rights holder");
    }
    if (!object(value.access)) errors.push("a resource response must carry an access decision");
    if (!object(value.rights)) errors.push("a resource response must carry a rights decision");
    if (!Array.isArray(value.actions)) {
      errors.push("a resource response must carry canonical provider actions");
    } else {
      for (const resource of resources) {
        if (!object(resource)) continue;
        const hasCanonicalAction = value.actions.some((action) =>
          object(action)
          && (action.type === "open" || action.type === "deep_link")
          && (action.url === resource.canonicalUrl || action.url === resource.deepLink));
        if (!hasCanonicalAction) errors.push(`resource ${String(resource.id)} lacks an exact canonical action`);
      }
    }
  }

  if (value.actions !== undefined) {
    if (!Array.isArray(value.actions)) {
      errors.push("actions must be an array");
    } else {
      value.actions.forEach((action, index) => {
        const path = `actions[${index}]`;
        if (!object(action)) {
          errors.push(`${path} must be an object`);
          return;
        }
        exactKeys(action, ["type", "label", "url", "providerId"], path, errors);
        if (!ACTION_TYPES.has(String(action.type))) errors.push(`${path}.type is invalid`);
        if (!nonEmptyString(action.label)) errors.push(`${path}.label is required`);
        if (!validUrl(action.url)) errors.push(`${path}.url must be an HTTP(S) URL`);
        if (!nonEmptyString(action.providerId)) errors.push(`${path}.providerId is required`);
        if (object(value.provider) && action.providerId !== value.provider.id) {
          errors.push(`${path}.providerId must match provider.id`);
        }
      });
    }
  }

  if (value.error !== undefined) {
    if (!object(value.error)) {
      errors.push("error must be an object");
    } else {
      exactKeys(
        value.error,
        ["code", "message", "field", "retryable", "retryAfterSeconds"],
        "error",
        errors,
      );
      if (!ERROR_CODES.has(String(value.error.code))) errors.push("error.code is invalid");
      if (!nonEmptyString(value.error.message)) errors.push("error.message is required");
      if (value.error.retryAfterSeconds !== undefined
        && (!Number.isInteger(value.error.retryAfterSeconds) || Number(value.error.retryAfterSeconds) < 1)) {
        errors.push("error.retryAfterSeconds must be a positive integer");
      }
    }
  }

  if ((value.status === "denied" || value.status === "not_found" || value.status === "error")
    && !object(value.error)) {
    errors.push(`${String(value.status)} response must include error`);
  }
  if (value.status === "limited" && object(value.rights) && value.rights.decision !== "allow_with_limits") {
    errors.push("limited response must carry allow_with_limits rights");
  }
  if (value.status === "denied" && object(value.rights) && value.rights.decision !== "deny") {
    errors.push("denied response must carry deny rights");
  }
  if (object(value.receipt)) {
    const expectedReceiptDecisions: Record<string, string[]> = {
      ok: ["supplied", "metadata_only"],
      limited: ["limited", "metadata_only"],
      denied: ["denied"],
      not_found: ["denied"],
      error: ["denied"],
    };
    if (!expectedReceiptDecisions[String(value.status)]?.includes(String(value.receipt.decision))) {
      errors.push("receipt.decision does not match response status");
    }
  }

  if (Array.isArray(resources)) {
    const hasCorrected = resources.some((resource) => object(resource) && resource.status === "corrected");
    const hasCorrectedWarning = Array.isArray(value.warnings)
      && value.warnings.some((warning) => object(warning) && warning.code === "RESOURCE_CORRECTED");
    if (hasCorrected && !hasCorrectedWarning) errors.push("corrected resource must carry a correction warning");

    const blockedResourceIds = new Set(resources.flatMap((resource) =>
      object(resource) && (resource.status === "retracted" || resource.status === "withdrawn")
        && typeof resource.id === "string"
        ? [resource.id]
        : []));
    const suppliesBlockedContent = Array.isArray(value.grants)
      && value.grants.some((grant) => object(grant)
        && blockedResourceIds.has(String(grant.resourceId))
        && grant.representation !== "metadata"
        && grant.representation !== "link_only");
    if (suppliesBlockedContent && object(value.receipt) && value.receipt.toolName === "knowledge_retrieve") {
      errors.push("retrieval must not supply a retracted or withdrawn content unit");
    }
  }

  return errors;
}

export function assertKnowledgeResponse(value: unknown): asserts value is KnowledgeResponse {
  const errors = validateKnowledgeResponse(value);
  if (errors.length) throw new Error(`Profile response failed validation:\n- ${errors.join("\n- ")}`);
}

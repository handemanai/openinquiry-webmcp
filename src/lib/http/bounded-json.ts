// SPDX-License-Identifier: Apache-2.0

export const SESSION_SELECTOR_JSON_MAX_BYTES = 64;

/**
 * The largest published request is a status request containing up to twenty
 * 200-character identifiers. Eight KiB also accommodates the maximum escaped
 * search/retrieval fields and request context. This application byte ceiling
 * is also the control on pathological JSON nesting; schema validation follows
 * parsing, and the boundary does not rely on a separate nesting-depth parser.
 */
export const PROVIDER_TOOL_JSON_MAX_BYTES = 8 * 1024;

export type BoundedJsonFailure =
  | "unsupported_media_type"
  | "too_large"
  | "invalid_json";

export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; failure: BoundedJsonFailure };

function isJsonMediaType(value: string | null): boolean {
  if (!value) return false;
  return value.split(";", 1)[0]?.trim().toLocaleLowerCase("en-US") === "application/json";
}

function declaredLengthExceedsLimit(value: string | null, maxBytes: number): boolean {
  if (value === null) return false;
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) return true;
  try {
    return BigInt(normalized) > BigInt(maxBytes);
  } catch {
    return true;
  }
}

/**
 * Reads and parses one JSON request body while retaining at most maxBytes.
 * Content-Length is an early rejection signal only; the streamed byte count is
 * authoritative so a missing or understated header cannot bypass the limit.
 */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("A positive safe integer JSON byte limit is required.");
  }
  if (!isJsonMediaType(request.headers.get("content-type"))) {
    return { ok: false, failure: "unsupported_media_type" };
  }
  if (declaredLengthExceedsLimit(request.headers.get("content-length"), maxBytes)) {
    return { ok: false, failure: "too_large" };
  }
  if (!request.body) return { ok: false, failure: "invalid_json" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value.byteLength > maxBytes - totalBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, failure: "too_large" };
      }
      chunks.push(chunk.value);
      totalBytes += chunk.value.byteLength;
    }
  } catch {
    return { ok: false, failure: "invalid_json" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, failure: "invalid_json" };
  }
}

// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  PROVIDER_TOOL_JSON_MAX_BYTES,
  readBoundedJson,
} from "../index";

function jsonPaddedTo(targetBytes: number): string {
  const empty = JSON.stringify({ padding: "" });
  const remaining = targetBytes - new TextEncoder().encode(empty).byteLength;
  if (remaining < 0) throw new Error("The requested JSON size is too small.");
  const value = JSON.stringify({ padding: "x".repeat(remaining) });
  if (new TextEncoder().encode(value).byteLength !== targetBytes) {
    throw new Error("The test JSON did not reach the requested byte length.");
  }
  return value;
}

function streamedJsonRequest(chunks: readonly Uint8Array[], declaredBytes: number): Request {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Request("https://openinquiry.test/provider-tool", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(declaredBytes),
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("bounded JSON reader", () => {
  it.each([
    ["one byte below", PROVIDER_TOOL_JSON_MAX_BYTES - 1],
    ["at the exact limit", PROVIDER_TOOL_JSON_MAX_BYTES],
  ] as const)("accepts valid JSON %s", async (_label, byteLength) => {
    const body = jsonPaddedTo(byteLength);
    const result = await readBoundedJson(
      new Request("https://openinquiry.test/provider-tool", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
      PROVIDER_TOOL_JSON_MAX_BYTES,
    );

    expect(result).toMatchObject({ ok: true });
    expect(new TextEncoder().encode(body)).toHaveLength(byteLength);
  });

  it("decodes multibyte UTF-8 split across stream chunks at the byte limit", async () => {
    const body = JSON.stringify({ value: "left 🩺 right" });
    const bytes = new TextEncoder().encode(body);
    const multibyteStart = bytes.findIndex((byte) => byte > 0x7f);
    expect(multibyteStart).toBeGreaterThan(0);
    const chunks = [
      bytes.slice(0, multibyteStart + 1),
      bytes.slice(multibyteStart + 1, multibyteStart + 3),
      bytes.slice(multibyteStart + 3),
    ];

    const result = await readBoundedJson(
      streamedJsonRequest(chunks, bytes.byteLength),
      bytes.byteLength,
    );

    expect(result).toEqual({ ok: true, value: { value: "left 🩺 right" } });
  });
});

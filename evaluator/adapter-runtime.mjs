// SPDX-License-Identifier: Apache-2.0

import { createInterface } from "node:readline";

export const ADAPTER_PROTOCOL = "openinquiry-independent-evaluator/0.1";

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function serveAdapter({ implementation, evaluate }) {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let requestQueue = Promise.resolve();

  async function handleLine(line) {
    let request;
    try {
      request = JSON.parse(line);
      if (request.protocol !== ADAPTER_PROTOCOL) {
        throw new Error(`Unsupported adapter protocol: ${String(request.protocol)}`);
      }
      if (request.operation === "handshake") {
        write({
          protocol: ADAPTER_PROTOCOL,
          id: request.id,
          implementation,
          adapterMetadata: request.adapterMetadata,
        });
        return;
      }
      if (request.operation !== "evaluate_response") {
        throw new Error(`Unsupported adapter operation: ${String(request.operation)}`);
      }
      const result = await evaluate(request.response);
      write({
        protocol: ADAPTER_PROTOCOL,
        id: request.id,
        ...result,
        adapterMetadata: request.adapterMetadata,
      });
    } catch (error) {
      write({
        protocol: ADAPTER_PROTOCOL,
        id: request?.id ?? "unparseable",
        decision: "protocol_error",
        diagnostics: [{
          layer: "adapter_protocol",
          message: error instanceof Error ? error.message : String(error),
        }],
        adapterMetadata: request?.adapterMetadata,
      });
    }
  }

  lines.on("line", (line) => {
    requestQueue = requestQueue.then(() => handleLine(line));
  });
}

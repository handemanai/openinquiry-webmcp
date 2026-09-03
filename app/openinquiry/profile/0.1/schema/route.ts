// SPDX-License-Identifier: Apache-2.0

import schema from "@/schemas/openinquiry-profile-0.1.schema.json";

/** Versioned, same-origin contract advertised by knowledge_describe. */
export function GET() {
  return Response.json(schema, {
    headers: {
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}

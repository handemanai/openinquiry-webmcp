// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { projectGuidelinesReaderView } from "@/src/lib/demo/guidelines-reader";

import { parsePublicGuidelinesReaderView } from "./guidelines-reader-client";

describe("guidelines reader client boundary", () => {
  it("accepts the server-projected public and entitled reader views", () => {
    expect(parsePublicGuidelinesReaderView(projectGuidelinesReaderView("guest")))
      .toEqual(projectGuidelinesReaderView("guest"));
    expect(parsePublicGuidelinesReaderView(projectGuidelinesReaderView("subscriber")))
      .toEqual(projectGuidelinesReaderView("subscriber"));
  });

  it("rejects protected text disguised as a public preview", () => {
    const publicView = projectGuidelinesReaderView("guest");
    expect(parsePublicGuidelinesReaderView({
      ...publicView,
      sections: publicView.sections.map((section, index) => index === 0
        ? { ...section, text: "protected text" }
        : section),
    })).toBeNull();
  });

  it("rejects an entitled view that omits the complete human sections", () => {
    const entitledView = projectGuidelinesReaderView("subscriber");
    expect(parsePublicGuidelinesReaderView({
      ...entitledView,
      sections: entitledView.sections.map((section) => ({
        heading: section.heading,
        id: section.id,
      })),
    })).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

import { getDemoSessionCodec } from "@/src/lib/session";

import { getServerProviderPersona } from "./server-demo-session";

describe("signed fictional session resolver boundary", () => {
  beforeEach(() => cookieGet.mockReset());

  it("renders the journal from the server-verified signed-in bit", async () => {
    const issued = getDemoSessionCodec().issueScenario("s3");
    cookieGet.mockReturnValue({ value: issued.token });

    expect(issued.session.persona).toBe("subscriber");
    await expect(getServerProviderPersona("journal")).resolves.toBe("subscriber");
  });

  it("falls back to Guest without a verified cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(getServerProviderPersona("journal")).resolves.toBe("guest");
  });
});

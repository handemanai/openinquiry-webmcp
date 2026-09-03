// SPDX-License-Identifier: Apache-2.0

import { defineConfig, devices } from "@playwright/test";

const configuredPort = Number(process.env.OPENINQUIRY_TEST_PORT ?? "3001");
const port = Number.isInteger(configuredPort) && configuredPort > 0
  ? configuredPort
  : 3001;
const host = process.env.OPENINQUIRY_TEST_HOST ?? "127.0.0.1";
const baseURL = `http://${host}:${port}`;
const useExistingExternalServer = process.env.OPENINQUIRY_SKIP_TEST_SERVER === "1";
const useProductionBuild = process.env.OPENINQUIRY_TEST_PRODUCTION === "1";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExistingExternalServer ? undefined : {
    command: `${useProductionBuild ? "npm run start" : "npm run dev"} -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      OPENINQUIRY_APP_ORIGIN: baseURL,
      OPENINQUIRY_SESSION_SECRET:
        process.env.OPENINQUIRY_SESSION_SECRET
        ?? "openinquiry-local-browser-tests-only-2026-08-29",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${baseURL}/demo`,
  },
});

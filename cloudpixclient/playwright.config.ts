import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalTimeout: 360_000,
  use: { baseURL: "http://localhost:3005", browserName: "chromium", launchOptions: { timeout: 30_000 }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "powershell -NoProfile -ExecutionPolicy Bypass -File ../scripts/start-test-backend.ps1",
      url: "http://localhost:8088/api/shared/test-health",
      timeout: 240_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
    {
      command: "npm.cmd run build && npm.cmd run start -- --port 3005",
      url: "http://localhost:3005",
      timeout: 180_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: "http://localhost:8088/api", CLOUDPIX_E2E: "1" },
    },
  ],
});


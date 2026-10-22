import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/** Runs against a production build: `npm run build` first, then `npm run test:e2e`. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } }, grep: /@responsive/ },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } }, grep: /@responsive/ },
  ],
  webServer: { command: `npx next start -p ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});

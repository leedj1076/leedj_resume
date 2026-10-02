import { defineConfig, devices } from "@playwright/test";

const port = 3100;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://127.0.0.1:${port}/dj`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      OPENAI_API_KEY: "",
      PINECONE_API_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ADMIN_PASSWORD: "",
      ADMIN_SESSION_SECRET: "",
      RESEND_API_KEY: "",
    },
  },
});

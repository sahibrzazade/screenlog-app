import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// E2E tests must never touch the production database. Supabase settings come
// from .env.test (local Supabase, see `npm run db:start`) and override any
// value already in the shell. The dev server inherits process.env, which Next.js
// ranks above .env.local, so the app under test talks to the same local stack.
config({ path: ".env.test", override: true, quiet: true });

const SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missing = SUPABASE_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `E2E aborted: ${missing.join(", ")} missing from .env.test. ` +
      "Without them the app would fall back to .env.local (production).",
  );
}

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
if (!["localhost", "127.0.0.1"].includes(supabaseHost)) {
  throw new Error(
    `E2E aborted: NEXT_PUBLIC_SUPABASE_URL points at "${supabaseHost}". ` +
      "Tests may only run against a local Supabase.",
  );
}

// A port of its own, never reused: an already running `npm run dev` on :3000
// is wired to production and must not serve the tests.
const PORT = 3100;

// Tests run against a production build: `next dev` compiles each route on its
// first request, and parallel workers hitting cold routes time out. A build
// also lives in .next (dev uses .next/dev), so `npm run dev` can stay open.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // Server actions call local Supabase and the live TMDB API; with parallel
  // workers a login or save can take longer than the 5s default.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});

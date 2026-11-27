import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// RLS tests sign in as real users and write rows, so they may only ever run
// against a local Supabase. Settings come from .env.test (see
// `npm run db:start`); in CI they are exported by the workflow instead.
config({ path: ".env.test", override: true, quiet: true });

const SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missing = SUPABASE_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `RLS tests aborted: ${missing.join(", ")} missing from .env.test.`,
  );
}

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
if (!["localhost", "127.0.0.1"].includes(supabaseHost)) {
  throw new Error(
    `RLS tests aborted: NEXT_PUBLIC_SUPABASE_URL points at "${supabaseHost}". ` +
      "Tests may only run against a local Supabase.",
  );
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["rls/**/*.test.ts"],
    // Every call is a round trip to the local stack.
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});

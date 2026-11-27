import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    // e2e/ is Playwright; rls/ needs a running local Supabase (`npm run test:rls`).
    exclude: ["node_modules", "e2e", "rls"],
  },
});

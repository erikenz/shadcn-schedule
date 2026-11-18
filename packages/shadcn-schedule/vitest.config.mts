import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // Base UI's ScrollArea measures the viewport and updates scrollbar state
      // asynchronously after mount, which trips React's act() warning in nearly
      // every component test. The calendar tests don't assert scrollbar
      // behavior, so tests use the lightweight stub.
      "@base-ui/react/scroll-area": path.resolve(
        import.meta.dirname,
        "test-utils/scroll-area-stub.tsx"
      ),
    },
  },
  test: {
    environment: "jsdom",
    // Needed for @testing-library/react's automatic cleanup between tests.
    globals: true,
    // vmThreads keeps per-file isolation while creating the jsdom environment
    // once per worker, instead of once per test file (67 files here). Requires
    // TZ to be set before the process starts (package test script) because the
    // worker-thread pools share the main process timezone.
    pool: "vmThreads",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 20_000,
  },
});

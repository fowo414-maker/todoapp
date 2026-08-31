import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "."),
    },
  },
  test: {
    globals: false,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["test/e2e/**", "node_modules/**"],
    // Default to node; component tests opt into jsdom with
    // `// @vitest-environment jsdom` at the top of the file.
    environment: "node",
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});

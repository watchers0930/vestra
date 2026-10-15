import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "../..") } },
  test: { environment: "node", include: ["lib/guest-monitoring/tests/**/*.test.ts"],
    fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000 },
});

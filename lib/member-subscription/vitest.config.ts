import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "../..") } },
  test: { environment: "node", include: ["lib/member-subscription/tests/**/*.test.ts"], fileParallelism: false },
});

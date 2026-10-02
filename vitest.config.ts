import { defineConfig } from "vitest/config";
import { availableParallelism } from "node:os";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "edge-runtime",
    maxWorkers: Math.min(8, availableParallelism()),
  },
});

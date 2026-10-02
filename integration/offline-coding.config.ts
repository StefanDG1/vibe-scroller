import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["integration/offline-coding.live.test.ts"],
    environment: "node",
    testTimeout: 180000,
    fileParallelism: false,
  },
});

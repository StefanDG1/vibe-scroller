import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("../../tests/server-only-empty.ts", import.meta.url),
      ),
    },
  },
  test: {
    server: { deps: { inline: ["@workos-inc/authkit-nextjs"] } },
    include: ["apps/starter/auth-redirect.test.ts"],
    environment: "node",
  },
});

// Keep this TypeScript config in CommonJS form for Vite's native config loader.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("vitest/config") as typeof import("vitest/config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fileURLToPath } = require("node:url") as typeof import("node:url");

module.exports = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});

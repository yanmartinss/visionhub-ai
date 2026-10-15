import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts", "test/**/*.{test,spec}.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".cts", ".json"],
  },
});

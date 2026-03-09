import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    exclude: ["node_modules/**", "dist/**"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
})
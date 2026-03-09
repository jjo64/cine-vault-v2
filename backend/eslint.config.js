import tseslint from "typescript-eslint"
import globals from "globals"
import prettier from "eslint-config-prettier"

export default [
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-console": "off",
    },
  },
]
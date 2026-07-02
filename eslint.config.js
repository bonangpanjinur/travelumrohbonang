import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // File yang di-ignore
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.migration-backup/**",
      // shadcn/ui — auto-generated, tidak perlu diaudit
      "artifacts/umroh-app/src/components/ui/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/eslint.config.js",
    ],
  },

  // Base JS rules untuk semua file
  js.configs.recommended,

  // TypeScript rules — semua TS/TSX di workspace
  ...tseslint.configs.recommended,

  // React Hooks — hanya 2 classic rules (bukan React Compiler rules)
  {
    files: ["artifacts/umroh-app/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Override rules untuk semua TS/TSX
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/consistent-type-imports": ["warn", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Express type augmentation pakai `declare global { namespace Express {} }` — sah
      "@typescript-eslint/no-namespace": "off",
      // Empty catch blocks diizinkan (sudah banyak di codebase)
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "warn",
    },
  },

  // api-server & libs — Node.js, console boleh
  {
    files: ["artifacts/api-server/src/**/*.ts", "lib/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // umroh-app — browser, batasi console
  {
    files: ["artifacts/umroh-app/src/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);

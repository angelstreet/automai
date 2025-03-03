
import typescriptEslintParser from "@typescript-eslint/parser";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["src/components/shadcn/*", "node_modules", ".next", "out", ".cursor", "docs", "public", "electron", "prisma", "scripts", "tailwind.config.ts", "tsconfig.json", "tsconfig.node.json"],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      prettier: prettierPlugin,
      "react-refresh": reactRefreshPlugin,
      "unused-imports": unusedImportsPlugin,
      import: importPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      react: reactPlugin
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
      "prettier/prettier": "error",
      "@typescript-eslint/no-namespace": "off",
      "react-refresh/only-export-components": "error",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "all", argsIgnorePattern: "^_" },
      ],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/no-absolute-path": "error",
      "import/no-self-import": "error",
      "import/no-cycle": "error",
      "import/no-useless-path-segments": "error",
      "import/no-relative-parent-imports": "off",
      "import/order": [
        "error",
        { groups: ["builtin", "external", "internal", "parent", "sibling", "index"], "newlines-between": "always", alphabetize: { order: "asc" } },
      ],
      "react-hooks/exhaustive-deps": "error",
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "import/no-duplicates": "error",
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
  },
];

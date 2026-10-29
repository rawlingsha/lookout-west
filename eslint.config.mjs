import astro from "eslint-plugin-astro";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "public/**",
      "node_modules/**",
      "analysis/**",
    ],
  },
  ...astro.configs.recommended,
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  {
    files: ["**/*.{js,mjs,ts,astro}"],
    rules: {
      "constructor-super": "error",
      "no-constant-binary-expression": "error",
      "no-dupe-else-if": "error",
      "no-loss-of-precision": "error",
      "no-unreachable": "error",
      "valid-typeof": "error",
    },
  },
];

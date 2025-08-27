/**
 * https://eslint.org/
 * https://typescript-eslint.io/
 * https://www.npmjs.com/package/eslint-plugin-react
 * https://www.npmjs.com/package/eslint-plugin-react-hooks
 * https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router
 */
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import pluginRouter from "@tanstack/eslint-plugin-router";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  /**
   * Ignore files
   */
  {
    ignores: [".nitro/*", ".output/*", ".tanstack/*"],
  },

  /**
   * ESLint
   *
   * https://eslint.org/docs/latest/rules
   */
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js: eslint },
    extends: ["js/recommended"],
    rules: {
      /** https://eslint.org/docs/latest/rules/eqeqeq */
      eqeqeq: "error",
      /** https://eslint.org/docs/latest/rules/guard-for-in */
      "guard-for-in": "error",
      /** https://eslint.org/docs/latest/rules/no-duplicate-imports */
      "no-duplicate-imports": "error",
      /** https://eslint.org/docs/latest/rules/no-useless-rename */
      "no-useless-rename": "error",
      /** https://eslint.org/docs/latest/rules/object-shorthand */
      "object-shorthand": "error",
    },
  },

  /**
   * TypeScript
   *
   * https://typescript-eslint.io/getting-started/typed-linting/
   */
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  /**
   * TypeScript
   *
   * https://typescript-eslint.io/users/configs#strict-type-checked
   * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/eslintrc/strict-type-checked.ts
   */
  tseslint.configs.strictTypeChecked,

  /**
   * TypeScript
   *
   * https://typescript-eslint.io/users/configs#stylistic-type-checked
   * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/eslintrc/stylistic-type-checked.ts
   */
  tseslint.configs.stylisticTypeChecked,

  /**
   * TypeScript
   *
   * https://typescript-eslint.io/rules/
   */
  {
    rules: {
      /** https://typescript-eslint.io/rules/no-misused-promises/ */
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      /** https://typescript-eslint.io/rules/no-unused-vars/ */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
      /**
       * https://typescript-eslint.io/rules/restrict-template-expressions/
       * https://github.com/typescript-eslint/typescript-eslint/blob/445514aa1c9a2927051d73a7c0c4a1d004a7f855/packages/eslint-plugin/src/configs/eslintrc/strict-type-checked.ts#L93-L103
       */
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      /** https://typescript-eslint.io/rules/only-throw-error/ */
      "@typescript-eslint/only-throw-error": [
        "error",
        { allow: ["NotFoundError"] },
      ],
    },
  },

  /**
   * React
   *
   * https://github.com/jsx-eslint/eslint-plugin-react?tab=readme-ov-file#flat-configs
   * https://github.com/jsx-eslint/eslint-plugin-react?tab=readme-ov-file#list-of-supported-rules
   */
  pluginReact.configs.flat["jsx-runtime"],
  {
    rules: {
      /** https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-leaked-render.md */
      "react/jsx-no-leaked-render": "error",
      /** https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-unescaped-entities.md */
      "react/no-unescaped-entities": "off",
      /** https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/self-closing-comp.md */
      "react/self-closing-comp": "error",
    },
  },
  /**
   * React Hooks
   *
   * https://www.npmjs.com/package/eslint-plugin-react-hooks
   * https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
   */
  reactHooks.configs["recommended-latest"],

  /**
   * TanStack Router
   *
   * https://tanstack.com/router/latest/docs/eslint/eslint-plugin-router
   */
  ...pluginRouter.configs["flat/recommended"],
]);

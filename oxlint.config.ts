import { defineConfig } from "oxlint";
import type { OxlintConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["github", "sonarjs", "react-doctor"]);

const config: OxlintConfig = defineConfig({
  extends: [core, react, vitest, antiSlop, shadcn, jsPlugins],
  env: core.env,
  options: { typeAware: true },
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "dist/**",
    "**/dist/**",
    "**/storybook-static/**",
    "**/components/ui/**",
    ".agents/**",
    "skills/**",
  ],
  jsPlugins: [...(jsPlugins.jsPlugins ?? []), ...(shadcn.jsPlugins ?? [])],
  settings: {
    ...jsPluginSettings,
    shadcn: {
      ui: "components/ui",
      componentImports: [
        "^@/components/ui(/|$)",
        "^\\.\\.?/.*components/ui(/|$)",
      ],
    },
  },
  rules: {
    "sonarjs/function-name": [
      "error",
      { format: "^[_a-zA-Z][a-zA-Z0-9]*$|^internal_[a-zA-Z0-9]*$" },
    ],
    "sonarjs/max-union-size": ["error", { threshold: 5 }],
  },
  overrides: [
    {
      // The schedule library builds UI components with dynamic calendar event positioning
      // (top/left/height offsets, custom colors, grid spacing).
      files: ["**/*.{ts,tsx}"],
      rules: {
        "shadcn/no-restyle": "off",
        "shadcn/no-raw-colors": "off",
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-inline-styles": "off",
      },
    },
    {
      files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/vitest.setup.ts"],
      rules: {
        "anti-slop/no-module-mocking": "off",
        "typescript/no-unsafe-assignment": "off",
      },
    },
    {
      files: ["scripts/**/*.{ts,js,mjs}"],
      rules: {
        "sonarjs/no-os-command-from-path": "off",
        "anti-slop/no-unsafe-dictionary-type": "off",
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "anti-slop/no-runtime-typeof": "off",
        "typescript/no-unsafe-type-assertion": "off",
        "eslint/no-negated-condition": "off",
      },
    },
  ],
});

export default config;

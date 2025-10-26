// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    overrides: [
    // Deno/Supabase Edge Functions
    {
      files: ["supabase/functions/**/*.ts"],
      plugins: ["deno"],
      extends: ["plugin:deno/recommended"],
      rules: {
        // Node-style import resolver can't resolve jsr: URLs; turn this off here
        "import/no-unresolved": "off",
        // optional: relax strictness in tiny edge functions
        "@typescript-eslint/no-explicit-any": "off",
      },
      settings: {
        // Don’t try to resolve jsr: or https: imports with Node resolver
        "import/resolver": {
          node: {
            extensions: [".ts", ".tsx"],
          },
        },
      },
    },
  ],
  },
]);

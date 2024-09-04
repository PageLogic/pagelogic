import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {ignores: ["dist/"]},
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {rules: {
    '@typescript-eslint/no-unused-vars': [
      "error",
      {
        "args": "all",
        "argsIgnorePattern": "^_(\\w+?_)?$",
        "caughtErrors": "all",
        "caughtErrorsIgnorePattern": "^_(\\w+?_)?$",
        "destructuredArrayIgnorePattern": "^_(\\w+?_)?$",
        "varsIgnorePattern": "^_(\\w+?_)?$",
        "ignoreRestSiblings": true
      }
    ]
  }}
];

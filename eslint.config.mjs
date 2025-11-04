import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
    {rules: {
        "semi": ["error", "always"], // Requires semicolons at the end of statements
        "indent": ["error", 4], // Enforces 4-space indentation
        "no-unused-vars": ["warn", { "args": "none" }] // Warns about unused variables, except for function arguments
    }}
]);

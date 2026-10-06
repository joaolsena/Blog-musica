// Verificação de código (npm run lint). Substitui a verificação que o Create React
// App fazia automaticamente: aponta variáveis sem uso, erros de JSX e uso
// incorreto dos hooks do React (useEffect, useState...).
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off", // o projeto não usa PropTypes
      // Aspas retas em textos (ex.: página Sobre) aparecem normalmente na tela
      "react/no-unescaped-entities": "off",
      // No React 18 o atributo é escrito em minúsculas (fetchPriority é do React 19)
      "react/no-unknown-property": ["error", { ignore: ["fetchpriority"] }],
      "no-unused-vars": ["warn", { varsIgnorePattern: "^React$" }],
    },
  },
  // Testes: funções globais do Vitest (describe, test, expect, vi...)
  {
    files: ["**/*.test.{js,jsx}", "src/setupTests.js"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  // Arquivos de configuração rodam no Node
  {
    files: ["*.config.js"],
    languageOptions: { globals: globals.node },
  },
];

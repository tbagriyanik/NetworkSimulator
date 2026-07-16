import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  plugins: {
    react,
    "react-hooks": reactHooks,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "caughtErrorsIgnorePattern": "^_"
    }],
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react/no-unescaped-entities": "warn",
    "react/display-name": "warn",
    "react/prop-types": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "warn",
    "@next/next/no-html-link-for-pages": "warn",
    
    // General JavaScript rules
    "no-console": "off",
    "no-debugger": "warn",
    "no-empty": "off",
    "no-irregular-whitespace": "warn",
    "no-case-declarations": "off",
    "no-fallthrough": "warn",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "warn",
    "no-undef": "warn",
    "no-unreachable": "warn",
    "no-useless-escape": "warn",
  },
}, {
  files: ["**/*.ts", "**/*.tsx"],
  rules: {
    "no-undef": "off",
  },
}, {
  files: ["**/*.cjs"],
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "no-undef": "off",
    "no-console": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "examples/**", "skills", "playwright_verify.ts"]
}];

export default eslintConfig;

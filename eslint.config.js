const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const stylistic = require('@stylistic/eslint-plugin');
const prettier = require('eslint-config-prettier');
const vue = require('eslint-plugin-vue');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'tests/.build/**', 'tests/.e2e-ext/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.vue'],
  })),
  {
    // Extension source: ES modules bundled into a browser content script.
    files: ['src/**/*.ts', 'tests/test-entry.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    // Build scripts and config files run directly under Node as CommonJS.
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    // ESM config + build scripts run under Node; Vite injects __dirname for
    // config, and build scripts use import.meta.
    files: ['*.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    // Playwright specs run under Node but their page.evaluate callbacks use
    // browser globals.
    files: ['tests/**/*.spec.ts', 'tests/helpers.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
      globals: { ...globals.browser },
    },
  },
  prettier,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      curly: ['error', 'all'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    rules: { 'no-console': 'warn' },
  },
  {
    files: ['**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    files: ['tests/e2e/**/*.ts'],
    rules: { 'no-empty-pattern': 'off' },
  },
];

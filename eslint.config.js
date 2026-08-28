const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'coverage/**', 'dist/**'],
    rules: {
      'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }],
    },
  },
]);

module.exports = {
  root: true,

  parserOptions: {
    ecmaVersion: 2022,
  },

  env: {
    browser: true,
    es2022: true,
    node: true,
  },

  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
  ],

  plugins: [
    '@typescript-eslint',
  ],

  overrides: [
    {
      files: ['**/*.ts', '**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
      },
      extends: ['plugin:@typescript-eslint/recommended'],
    },
  ],

  globals: {
    process: 'readonly',
  },

  rules: {
    'prefer-promise-reject-errors': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },

  ignorePatterns: [
    'dist',
    '.quasar',
    'node_modules',
  ],
}

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'  // ← DODAJ TĘ LINIĘ
      }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
];
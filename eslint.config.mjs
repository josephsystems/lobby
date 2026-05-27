import jseslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'commitlint.config.cjs'],
  },
  // Include standard JavaScript recommended rules
  jseslint.configs.recommended,
  
  // Include standard TypeScript recommended rules
  // (This automatically sets up the parser, plugin, and handles base-rule replacements)
  ...tseslint.configs.recommended,

  // custom overrides
  {
    files: ['**/*.ts'],
    rules: {
      // Force explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // Catch unused variables (allow underscore-prefixed args)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // General overrides across all files
  {
    rules: {
      // No console.log in committed code
      'no-console': 'error',
    },
  }
);

// Lint rules; the size limits come from knowledge-base/engineering-standards.md §5.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const sizeLimits = { skipBlankLines: true, skipComments: true };

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'src-tauri/target/', 'src-tauri/gen/', 'spikes/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      'max-lines': ['error', { max: 400, ...sizeLimits }],
      'max-lines-per-function': ['error', { max: 60, ...sizeLimits }],
    },
  },
  {
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@tauri-apps/*'], message: 'Page scripts never touch IPC.' }] },
      ],
    },
  },
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
);

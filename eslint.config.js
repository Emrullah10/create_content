import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  { languageOptions: { globals: { ...globals.node, ...globals.jest } } },
  pluginJs.configs.recommended,
  { rules: { 'no-unused-vars': 'off', 'no-undef': 'off' } },
  { files: ['e2e/**/*.js'], languageOptions: { globals: globals.node }, rules: { 'no-undef': 'error' } },
];

import safeql from '@ts-safeql/eslint-plugin/config';
import { config, configs } from 'typescript-eslint';

export default config({
  files: ['**/*.ts'],
  ignores: ['frontend/**', 'dist/**', 'node_modules/**'],
  extends: [configs.base, safeql.configs.useConfigFile],
});

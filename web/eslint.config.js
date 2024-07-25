import safeql from '@ts-safeql/eslint-plugin/config';
import { config, configs } from 'typescript-eslint';

export default config(configs.base, { files: ['src/**/*.ts', '!src/frontend/**'] }, safeql.configs.useConfigFile);

import safeql from '@ts-safeql/eslint-plugin/config';
import { config, configs } from 'typescript-eslint';

export default config(configs.base, { files: ['**/*.ts', '!frontend/**'] }, safeql.configs.useConfigFile);

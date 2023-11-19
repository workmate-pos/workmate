import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: [
    {
      [`https://${process.env.SHOPIFY_SHOP}/admin/api/2023-07/graphql.json`]: {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
        },
      },
    },
  ],
  emitLegacyCommonJSImports: false,
  generates: {
    './services/gql/queries/generated/types.ts': {
      plugins: ['typescript'],
    },
    './services/gql/queries/generated/queries.ts': {
      documents: ['./services/gql/queries/**/*.graphql'],
      preset: 'import-types',
      plugins: ['./shopify-graphql-plugin.js', 'typescript-operations'],
      config: {
        graphQlClassImportPath: '@teifi-digital/shopify-app-express/services/graphql.js',
      },
      presetConfig: {
        typesPath: './types.js',
      },
    },
  },
};

export default config;

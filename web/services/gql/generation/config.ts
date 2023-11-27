import { z } from 'zod';
import { GraphQLProjectConfig, loadConfig } from 'graphql-config';

const GenQLExtension = z.object({
  genql: z.object({
    schemaOutput: z.string(),
    documentsOutput: z.string(),
    emitComments: z.boolean().default(true),
    defaultScalarType: z.string().default('string | number | boolean'),
    pruneUnusedTypes: z.boolean().default(true),
    scalarTypes: z.record(z.string()).default({}),
    documentHeader: z.array(z.string()).default([]),
    queryTransformation: z
      .string()
      .default('query')
      .describe(
        'Transforms the query into some desired representation. `query` can be used to access the raw query text. Available types are `Variables` and `Result`',
      ),
  }),
});

export type GenQLOptions = z.infer<typeof GenQLExtension>['genql'];

export async function getGraphqlConfig() {
  const graphqlConfig = await loadConfig({ throwOnEmpty: true, throwOnMissing: true });

  if (!graphqlConfig) {
    console.error('\x1b[31mNo graphql config found.\x1b[0m');
    process.exit(1);
  }

  return graphqlConfig.getDefault();
}

export async function getGenerationOptions(config: GraphQLProjectConfig): Promise<GenQLOptions> {
  const parseResult = GenQLExtension.safeParse(config.extensions);

  if (!parseResult.success) {
    console.error(
      `
\x1b[31m
Invalid generation configuration.
\x1b[33m
Expected Format:

extensions:
  generation:
    schemaOutput: "./src/graphql/schema.ts"
    documentsOutput: "./src/graphql/documents.ts"
    scalarTypes:
      Double: "number"
    defaultScalarType: "string"
    documentHeader:
      - "import type { Graphql } from './client';"
    queryTransformation: "(client: Graphql, variables: Variables) => client.query<Result>(query, variables)"

\x1b[31m
Errors:
${parseResult.error.errors.map(error => `  - ${JSON.stringify(error)}`).join('\n')}
\x1b[0m
`.trim(),
    );
    process.exit(1);
  }

  return parseResult.data.generation;
}

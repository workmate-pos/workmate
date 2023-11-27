/**
 * GraphQL generator - generates types for a schema, and type-safe query functions.
 */

import { mkdir, watch, writeFile } from 'fs/promises';
import prettier from 'prettier';
import { never } from '../../../util/never.js';
import {
  getDocumentDefinitions,
  getTsNameForOperationDefinition,
  getTsNameForOperationResult,
  getTsNameForOperationVariables,
} from './document.js';
import { getSchemaDefinitions, getTsNameForNamedType } from './schema.js';
import { basename, dirname, relative, resolve } from 'path';
import { camelCase, getDuplicates } from './util.js';
import { GenQLOptions, getGenerationOptions, getGraphqlConfig } from './config.js';

type DocumentDefinitions = Record<string, ReturnType<typeof getDocumentDefinitions>>;

export async function generate(watch: boolean) {
  const config = await getGraphqlConfig();
  const generationOptions = await getGenerationOptions(config);

  const schema = await printProcess(() => config.getSchema(), 'Fetching', 'Fetched', 'schema');

  while (true) {
    const documents = await printProcess(() => config.getDocuments(), 'Loading', 'Loaded', 'documents');

    const documentDefinitions = Object.fromEntries(
      documents.map(document => [document.location ?? never(), getDocumentDefinitions(document, schema)] as const),
    );

    assertNoDuplicateFragments(documentDefinitions);
    assertNoDuplicateOperations(documentDefinitions);

    const requiredTypeNames = getRequiredTypeNames(documentDefinitions);
    const schemaDefinitions = getSchemaDefinitions(schema, requiredTypeNames, generationOptions);

    await printProcess(() => writeSchema(schemaDefinitions, generationOptions), 'Creating', 'Created', 'schema');
    await printProcess(() => writeDocument(documentDefinitions, generationOptions), 'Creating', 'Created', 'document');

    if (!watch) {
      break;
    }

    await printWaiting(() => waitForChange(documents.map(document => document.location ?? never())), 'changes');

    process.stdout.cursorTo(0);
    process.stdout.moveCursor(0, -4);
    process.stdout.clearScreenDown();
  }

  console.log('\x1b[32mDone.\x1b[0m');
}

async function printProcess<T>(fn: () => Promise<T>, initialStatus: string, finalStatus: string, subject: string) {
  const start = Date.now();

  let done = false;
  const promise = fn().then(result => {
    done = true;
    return result;
  });

  const gray = '\x1b[37m';
  const white = '\x1b[97m';

  function getMessage() {
    const elapsedSeconds = (Date.now() - start) / 1000;
    const color = done ? '\x1b[32m' : '\x1b[33m';
    const status = done ? finalStatus : initialStatus;
    const resetColor = '\x1b[0m';
    const resetLine = '\r' + ' '.repeat(process.stdout.columns) + '\r';
    const ret = done ? '\n' : '';

    return `${resetLine}${color}${status} ${subject} ${gray}(${white}${elapsedSeconds.toFixed(
      1,
    )}${gray} seconds)${resetColor}${ret}`;
  }

  while (!done) {
    process.stdout.write(getMessage());
    await sleep(100);
  }

  process.stdout.write(getMessage());

  return promise;
}

async function printWaiting<T>(fn: () => Promise<T>, subject: string) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  let done = false;
  const promise = fn().then(result => {
    done = true;
    return result;
  });

  function getMessage() {
    const color = done ? '\x1b[32m' : '\x1b[33m';
    const resetColor = '\x1b[0m';
    const resetLine = '\r' + ' '.repeat(process.stdout.columns) + '\r';

    if (done) {
      return `${resetLine}${color}Received ${subject}${resetColor}\n`;
    }

    return `${resetLine}${color}${spinner[i++ % spinner.length]} Waiting for ${subject}${resetColor}`;
  }

  while (!done) {
    process.stdout.write(getMessage());
    await sleep(100);
  }

  process.stdout.write(getMessage());

  return promise;
}

async function waitForChange(paths: string[]) {
  const abortController = new AbortController();
  const watchers = paths.map(path => watch(path, { signal: abortController.signal }));

  return new Promise<void>(resolve => {
    for (const watcher of watchers) {
      watcher[Symbol.asyncIterator]()
        .next()
        .then(() => {
          abortController.abort();
          resolve();
        })
        .catch(error => {
          if (error.code !== 'ABORT_ERR') {
            throw error;
          }
        });
    }
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeDocument(documentDefinitions: DocumentDefinitions, options: GenQLOptions) {
  const documentOutputPath = resolve(process.cwd(), options.documentsOutput);
  await mkdir(dirname(documentOutputPath), { recursive: true });

  let documentCode = '';

  const importTypes = [...getUsedTypeNames(documentDefinitions)].map(name => getTsNameForNamedType(name)).join(', ');
  const importPath = `./${relative(dirname(documentOutputPath), options.schemaOutput)}`;
  documentCode += `import type { ${importTypes} } from '${importPath}';\n`;

  for (const { fragmentDefinitions, operationDefinitions } of Object.values(documentDefinitions)) {
    for (const definition of [...Object.values(fragmentDefinitions), ...Object.values(operationDefinitions)]) {
      documentCode += definition + ';\n';
    }
  }

  documentCode += `const transform = <Variables, Result>(query: string) => ${options.queryTransformation};\n`;
  documentCode += 'export const gql = {\n';

  for (const [location, { operationDefinitions }] of Object.entries(documentDefinitions)) {
    const name = camelCase(basename(location).split('.')[0] ?? never());

    documentCode += `${name}: {\n`;

    for (const operationName of Object.keys(operationDefinitions)) {
      const variablesTypeName = getTsNameForOperationVariables(operationName);
      const resultTypeName = getTsNameForOperationResult(operationName);
      const queryTextConstName = getTsNameForOperationDefinition(operationName);
      documentCode += `${operationName}: transform<${variablesTypeName}, ${resultTypeName}>(${queryTextConstName}),\n`;
    }
    documentCode += '},\n';
  }
  documentCode += '};\n';

  documentCode = [...options.documentHeader, documentCode].join('\n');

  await writeFormattedTypescript(documentOutputPath, documentCode);
}

async function writeSchema(schemaDefinitions: Record<string, string>, options: GenQLOptions) {
  const schemaOutputPath = resolve(process.cwd(), options.schemaOutput);
  await mkdir(dirname(schemaOutputPath), { recursive: true });

  let schemaCode = '';
  for (const definition of Object.values(schemaDefinitions)) {
    schemaCode += definition + ';\n';
  }

  await writeFormattedTypescript(schemaOutputPath, schemaCode);
}

async function writeFormattedTypescript(outputPath: string, code: string) {
  const prettierConfig = await prettier.resolveConfig(outputPath);
  const formatted = prettier.format(code, { parser: 'typescript', ...prettierConfig });
  await writeFile(outputPath, formatted, 'utf-8');
}

function assertNoDuplicateFragments(documentDefinitions: DocumentDefinitions) {
  const fragmentNames = Object.values(documentDefinitions).flatMap(({ fragmentDefinitions }) =>
    Object.keys(fragmentDefinitions),
  );

  assertNoDuplicates(fragmentNames, 'fragment names');
}

function assertNoDuplicateOperations(documentDefinitions: DocumentDefinitions) {
  const operationNames = Object.values(documentDefinitions).flatMap(({ operationDefinitions }) =>
    Object.keys(operationDefinitions),
  );

  assertNoDuplicates(operationNames, 'operation names');
}

function assertNoDuplicates<T>(things: T[], name: string) {
  const duplicates = getDuplicates(things);

  if (duplicates.length > 0) {
    console.error(
      `
\x1b[31m
Duplicate ${name}.
${duplicates.map(name => `- ${name}`).join('\n')}
\x1b[0m
`.trim(),
    );
    process.exit(1);
  }
}

/**
 * Get all type names that are used directly or indirectly in the document definitions.
 * These must be created in the schema.
 */
function getRequiredTypeNames(documentDefinitions: DocumentDefinitions) {
  return new Set(Object.values(documentDefinitions).flatMap(({ requiredTypeNames }) => [...requiredTypeNames]));
}

/**
 * Get all type names that are used directly in the document definitions.
 * These must be imported in the document.
 */
function getUsedTypeNames(documentDefinitions: DocumentDefinitions) {
  return new Set([...Object.values(documentDefinitions).flatMap(({ usedTypeNames }) => [...usedTypeNames])]);
}

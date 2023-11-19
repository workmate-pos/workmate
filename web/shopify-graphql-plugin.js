/**
 * Plugin for @graphql-codegen/cli that generates an SDK that uses the Shopify GraphQL Client.
 */

import { Kind } from 'graphql';
import { BaseVisitor } from '@graphql-codegen/visitor-plugin-common';
import { basename } from 'path';

const INDENT = '  ';

/**
 * @typedef {Object} Config
 * @extends {import("@graphql-codegen/visitor-plugin-common").RawConfig}
 * @property {string} [graphQlClassImportPath] - The import path for the GraphQL class.
 */

/**
 * @typedef {Object<string, import("graphql").OperationDefinitionNode>} DocumentOperations
 */

/**
 * @type {import("@graphql-codegen/plugin-helpers").PluginFunction<Config>}
 */
const plugin = async (schema, documents, config, info) => {
  if (!config.graphQlClassImportPath) {
    throw new Error('The "graphQlClassImportPath" option is required.');
  }

  /**
   * @type {DocumentOperations}
   */
  const documentOperations = Object.fromEntries(
    documents.map(document => [
      basename(document.location).split('.')[0],
      document.document.definitions.filter(definition => definition.kind === Kind.OPERATION_DEFINITION),
    ]),
  );

  const visitor = new ShopifyGraphqlPluginVisitor(documentOperations, config);

  return {
    prepend: [`import type { Graphql } from '${config.graphQlClassImportPath}';`],
    content: visitor.getOperationCode(),
  };
};

/**
 * @extends {BaseVisitor<Config, Config>}
 */
class ShopifyGraphqlPluginVisitor extends BaseVisitor {
  /**
   * @type {DocumentOperations}
   */
  documentOperations = [];

  /**
   * @param documentOperations {DocumentOperations}
   * @param config {Config}
   */
  constructor(documentOperations, config) {
    super(config, config);
    this.documentOperations = documentOperations;
  }

  /**
   * @param {import("graphql").OperationDefinitionNode} operation
   * @returns {string}
   */
  #getOperationImplementation(operation) {
    const functionName = operation.name.value.split('_').at(-1);
    const operationVariablesTypeName = this.convertName(operation.name.value, { suffix: 'QueryVariables' });
    const operationQueryTypeName = this.convertName(operation.name.value, { suffix: 'Query' });
    const body = operation.loc.source.body;
    const escapedBody = JSON.stringify(body);

    return `${functionName}: (graphql: Graphql, variables: ${operationVariablesTypeName}): Promise<${operationQueryTypeName}> => graphql.query<${operationQueryTypeName}>(${escapedBody}, variables)`;
  }

  #getDocumentImplementations() {
    /**
     * @type {string[]}
     */
    const documentImplementations = [];

    for (const [documentName, operations] of Object.entries(this.documentOperations)) {
      const objectName = toCamelCase(documentName);

      /**
       * @type {string[]}
       */
      const operationImplementations = [];

      for (const operation of operations) {
        operationImplementations.push(this.#getOperationImplementation(operation));
      }

      const operationImplementationsStr = unrollCodeSnippets(operationImplementations, INDENT, ',');

      documentImplementations.push(`${objectName}: {\n${operationImplementationsStr}\n}`);
    }

    return unrollCodeSnippets(documentImplementations, INDENT, ',');
  }

  getOperationCode() {
    const objectContentStr = this.#getDocumentImplementations();
    return `export const queries = {\n${objectContentStr}\n}`;
  }
}

/**
 * @param codeFragments {string[]}
 * @param indent {string}
 * @param separator {string}
 */
function unrollCodeSnippets(codeFragments, indent, separator = '') {
  let unrolled = '';

  for (const codeFragment of codeFragments) {
    for (const line of codeFragment.split('\n')) {
      unrolled += `${indent}${line}\n`;
    }
    unrolled += separator;
  }

  return unrolled;
}

/**
 * Convert kebab-case and snake_case to camelCase.
 * @param str {string}
 */
function toCamelCase(str) {
  return str.replace(/[-_]([a-z])/g, g => g[1].toUpperCase());
}

export { plugin };

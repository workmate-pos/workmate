import * as shopifySession from './queries/generated/shopify-session.sql.js';
import * as workOrder from './queries/generated/work-order.sql.js';
import * as workOrderCharges from './queries/generated/work-order-charges.sql.js';
import * as employee from './queries/generated/employee.sql.js';
import * as types from './queries/generated/types.sql.js';
import * as sequence from './queries/generated/sequence.sql.js';
import * as appPlan from './queries/generated/app-plan.sql.js';
import * as purchaseOrder from './queries/generated/purchase-order.sql.js';
import * as settings from './queries/generated/settings.sql.js';
import * as locations from './queries/generated/locations.sql.js';
import * as customers from './queries/generated/customers.sql.js';
import * as products from './queries/generated/products.sql.js';
import * as productVariants from './queries/generated/product-variants.sql.js';
import * as shopifyOrder from './queries/generated/shopify-order.sql.js';
import * as customFieldPresets from './queries/generated/custom-field-presets.sql.js';
import * as workOrderSoLi from './queries/generated/work-order-so-li-migration.sql.js';
import * as appMigration from './queries/generated/app-migration.sql.js';
import { PreparedQuery, sql as sqlTaggedTemplate } from '@pgtyped/runtime';
import { useClient } from './client.js';

/**
 * Object through which SQL queries in /services/db/queries are exposed.
 */
export const db = {
  shopifySession: wrapPreparedQueries(shopifySession),
  workOrder: wrapPreparedQueries(workOrder),
  workOrderCharges: wrapPreparedQueries(workOrderCharges),
  employee: wrapPreparedQueries(employee),
  types: wrapPreparedQueries(types),
  sequence: wrapPreparedQueries(sequence),
  appPlan: wrapPreparedQueries(appPlan),
  purchaseOrder: wrapPreparedQueries(purchaseOrder),
  settings: wrapPreparedQueries(settings),
  locations: wrapPreparedQueries(locations),
  customers: wrapPreparedQueries(customers),
  products: wrapPreparedQueries(products),
  productVariants: wrapPreparedQueries(productVariants),
  shopifyOrder: wrapPreparedQueries(shopifyOrder),
  customFieldPresets: wrapPreparedQueries(customFieldPresets),
  appMigration: wrapPreparedQueries(appMigration),
  migrations: {
    workOrderSoLi: wrapPreparedQueries(workOrderSoLi),
  },
};

/**
 * Sql tagged template that automatically uses the correct client.
 * Pgtyped will automatically create types whenever you this tag.
 */
export const sql = <T extends { params: any; result: any }>(arr: TemplateStringsArray) => {
  const preparedQuery = sqlTaggedTemplate<T>(arr);
  return async (param: T['params']): Promise<T['result'][]> => {
    using client = await useClient();
    return preparedQuery.run(param, client);
  };
};

/**
 * Wrap an object of prepared queries such that their client is automatically provided.
 */
function wrapPreparedQueries<const T extends PreparedQueries>(queries: T): WrappedPreparedQueries<T> {
  return Object.fromEntries(
    Object.entries(queries).map(([queryName, query]) => [queryName, wrapPreparedQuery(query)]),
  ) as WrappedPreparedQueries<T>;
}

function wrapPreparedQuery<Param, Result>(query: PreparedQuery<Param, Result>): (param: Param) => Promise<Result[]> {
  return async param => {
    using client = await useClient();
    const _error = new Error();
    return await query.run(param, client).catch(error => {
      _error.message = error.message;
      throw _error;
    });
  };
}

type PreparedQueries = {
  [queryName: string]: PreparedQuery<any, any>;
};

type WrappedPreparedQueries<T extends PreparedQueries> = {
  [queryName in keyof T]: WrappedPreparedQuery<T[queryName]>;
};

type WrappedPreparedQuery<P extends PreparedQuery<any, any>> =
  P extends PreparedQuery<infer Param, infer Result> ? (param: Param) => Promise<Result[]> : never;

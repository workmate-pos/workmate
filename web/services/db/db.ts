import * as shopifySession from './queries/generated/shopify-session.sql.js';
import * as workOrder from './queries/generated/work-order.sql.js';
import * as employee from './queries/generated/employee.sql.js';
import * as types from './queries/generated/types.sql.js';
import * as sequence from './queries/generated/sequence.sql.js';
import * as appPlan from './queries/generated/app-plan.sql.js';
import * as purchaseOrder from './queries/generated/purchase-order.sql.js';
import * as stockTransfers from './queries/generated/stock-transfers.sql.js';
import * as settings from './queries/generated/settings.sql.js';
import * as locations from './queries/generated/locations.sql.js';
import * as customers from './queries/generated/customers.sql.js';
import * as products from './queries/generated/products.sql.js';
import * as productVariants from './queries/generated/product-variants.sql.js';
import * as shopifyOrder from './queries/generated/shopify-order.sql.js';
import * as customFieldPresets from './queries/generated/custom-field-presets.sql.js';
import * as appMigration from './queries/generated/app-migration.sql.js';
import { PreparedQuery } from '@pgtyped/runtime';
import { useClient } from './client.js';

/**
 * Object through which SQL queries in /services/db/queries are exposed.
 */
export const db = {
  shopifySession: wrapPreparedQueries(shopifySession),
  workOrder: wrapPreparedQueries(workOrder),
  employee: wrapPreparedQueries(employee),
  types: wrapPreparedQueries(types),
  sequence: wrapPreparedQueries(sequence),
  appPlan: wrapPreparedQueries(appPlan),
  purchaseOrder: wrapPreparedQueries(purchaseOrder),
  stockTransfers: wrapPreparedQueries(stockTransfers),
  settings: wrapPreparedQueries(settings),
  locations: wrapPreparedQueries(locations),
  customers: wrapPreparedQueries(customers),
  products: wrapPreparedQueries(products),
  productVariants: wrapPreparedQueries(productVariants),
  shopifyOrder: wrapPreparedQueries(shopifyOrder),
  customFieldPresets: wrapPreparedQueries(customFieldPresets),
  appMigration: wrapPreparedQueries(appMigration),
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

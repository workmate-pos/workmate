import * as shopifySession from './queries/generated/shopify-session.sql.js';
import * as workOrder from './queries/generated/work-order.sql.js';
import * as workOrderProduct from './queries/generated/work-order-product.sql.js';
import * as employee from './queries/generated/employee.sql.js';
import * as customer from './queries/generated/customer.sql.js';
import * as settings from './queries/generated/settings.sql.js';
import { PreparedQuery, sql as sqlTaggedTemplate } from '@pgtyped/runtime';
import { useClient } from './client.js';

/**
 * Object through which SQL queries in /services/db/queries are exposed.
 */
export const db = {
  shopifySession: wrapPreparedQueries(shopifySession),
  workOrder: wrapPreparedQueries(workOrder),
  workOrderProduct: wrapPreparedQueries(workOrderProduct),
  employee: wrapPreparedQueries(employee),
  customer: wrapPreparedQueries(customer),
  settings: wrapPreparedQueries(settings),
};

/**
 * Sql tagged template that automatically uses the correct client.
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
    return await query.run(param, client);
  };
}

type PreparedQueries = {
  [queryName: string]: PreparedQuery<any, any>;
};

type WrappedPreparedQueries<T extends PreparedQueries> = {
  [queryName in keyof T]: WrappedPreparedQuery<T[queryName]>;
};

type WrappedPreparedQuery<P extends PreparedQuery<any, any>> = P extends PreparedQuery<infer Param, infer Result>
  ? (param: Param) => Promise<Result[]>
  : never;

import * as shopifySession from './queries/generated/shopify-session.sql.js';
import * as workOrder from './queries/generated/work-order.sql.js';
import * as workOrderProduct from './queries/generated/work-order-product.sql.js';
import * as workOrderPayment from './queries/generated/work-order-payment.sql.js';
import * as workOrderEmployeeAssignment from './queries/generated/work-order-employee-assignment.sql.js';
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
  workOrderPayment: wrapPreparedQueries(workOrderPayment),
  workOrderEmployeeAssignment: wrapPreparedQueries(workOrderEmployeeAssignment),
  settings: wrapPreparedQueries(settings),
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

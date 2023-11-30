/** Types generated for queries found in "services/db/queries/customer.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** Query 'GetWorkOrderCustomer' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetWorkOrderCustomerResult = never;

/** Query 'GetWorkOrderCustomer' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetWorkOrderCustomerParams = never;

const getWorkOrderCustomerIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":104,"b":116}]}],"statement":"SELECT c.*\nFROM \"Customer\" c\n         INNER JOIN \"WorkOrder\" wo ON wo.\"customerId\" = c.id\nWHERE wo.id = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT c.*
 * FROM "Customer" c
 *          INNER JOIN "WorkOrder" wo ON wo."customerId" = c.id
 * WHERE wo.id = :workOrderId!
 * ```
 */
export const getWorkOrderCustomer = new PreparedQuery<IGetWorkOrderCustomerParams,IGetWorkOrderCustomerResult>(getWorkOrderCustomerIR);


/** Query 'Page' is invalid, so its result is assigned type 'never'.
 *  */
export type IPageResult = never;

/** Query 'Page' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IPageParams = never;

const pageIR: any = {"usedParamSet":{"shop":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":38,"b":43}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":73,"b":78},{"a":112,"b":117},{"a":151,"b":156}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":192,"b":198}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":213}]}],"statement":"SELECT *\nFROM \"Customer\"\nWHERE shop = :shop!\nAND (\n  name ILIKE COALESCE(:query, '%') OR\n  email ILIKE COALESCE(:query, '%') OR\n  phone ILIKE COALESCE(:query, '%')\n  )\nORDER BY name ASC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Customer"
 * WHERE shop = :shop!
 * AND (
 *   name ILIKE COALESCE(:query, '%') OR
 *   email ILIKE COALESCE(:query, '%') OR
 *   phone ILIKE COALESCE(:query, '%')
 *   )
 * ORDER BY name ASC
 * LIMIT :limit! OFFSET :offset
 * ```
 */
export const page = new PreparedQuery<IPageParams,IPageResult>(pageIR);


/** Query 'Upsert' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertResult = never;

/** Query 'Upsert' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertParams = never;

const upsertIR: any = {"usedParamSet":{"id":true,"shop":true,"name":true,"phone":true,"email":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":65}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":73}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":81},{"a":149,"b":154}]},{"name":"phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":84,"b":89},{"a":173,"b":178}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":92,"b":97},{"a":197,"b":202}]}],"statement":"INSERT INTO \"Customer\" (id, shop, name, phone, email)\nVALUES (:id!, :shop!, :name!, :phone, :email)\nON CONFLICT (id, shop) DO UPDATE\n    SET name  = :name!,\n        phone = :phone,\n        email = :email\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Customer" (id, shop, name, phone, email)
 * VALUES (:id!, :shop!, :name!, :phone, :email)
 * ON CONFLICT (id, shop) DO UPDATE
 *     SET name  = :name!,
 *         phone = :phone,
 *         email = :email
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);



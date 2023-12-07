/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetNextIdForShop' parameters type */
export interface IGetNextIdForShopParams {
  shopSequenceName: string;
}

/** 'GetNextIdForShop' return type */
export interface IGetNextIdForShopResult {
  id: number;
}

/** 'GetNextIdForShop' query type */
export interface IGetNextIdForShopQuery {
  params: IGetNextIdForShopParams;
  result: IGetNextIdForShopResult;
}

const getNextIdForShopIR: any = {"usedParamSet":{"shopSequenceName":true},"params":[{"name":"shopSequenceName","required":true,"transform":{"type":"scalar"},"locs":[{"a":28,"b":45}]}],"statement":"SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS \"id!\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS "id!"
 * ```
 */
export const getNextIdForShop = new PreparedQuery<IGetNextIdForShopParams,IGetNextIdForShopResult>(getNextIdForShopIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  description: string;
  discountAmount: number;
  dueDate: DateOrString;
  name: string;
  shippingAmount: number;
  shop: string;
  status: string;
  taxAmount: number;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  createdAt: Date;
  customerId: string;
  description: string;
  discountAmount: number;
  dueDate: Date;
  id: number;
  name: string;
  shippingAmount: number;
  shop: string;
  status: string;
  taxAmount: number;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"taxAmount":true,"discountAmount":true,"shippingAmount":true,"description":true,"dueDate":true,"customerId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":165,"b":170}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":188}]},{"name":"taxAmount","required":true,"transform":{"type":"scalar"},"locs":[{"a":191,"b":201}]},{"name":"discountAmount","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":219}]},{"name":"shippingAmount","required":true,"transform":{"type":"scalar"},"locs":[{"a":222,"b":237}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":252}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":263,"b":271}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":274,"b":285}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"taxAmount\", \"discountAmount\", \"shippingAmount\",\n                         description, \"dueDate\", \"customerId\")\nVALUES (:shop!, :name!, :status!, :taxAmount!, :discountAmount!, :shippingAmount!, :description!,\n        :dueDate!, :customerId!)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status           = EXCLUDED.status,\n                                           \"taxAmount\"      = EXCLUDED.\"taxAmount\",\n                                           \"discountAmount\" = EXCLUDED.\"discountAmount\",\n                                           \"shippingAmount\" = EXCLUDED.\"shippingAmount\",\n                                           description      = EXCLUDED.description,\n                                           \"dueDate\"        = EXCLUDED.\"dueDate\",\n                                           \"customerId\"     = EXCLUDED.\"customerId\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "taxAmount", "discountAmount", "shippingAmount",
 *                          description, "dueDate", "customerId")
 * VALUES (:shop!, :name!, :status!, :taxAmount!, :discountAmount!, :shippingAmount!, :description!,
 *         :dueDate!, :customerId!)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status           = EXCLUDED.status,
 *                                            "taxAmount"      = EXCLUDED."taxAmount",
 *                                            "discountAmount" = EXCLUDED."discountAmount",
 *                                            "shippingAmount" = EXCLUDED."shippingAmount",
 *                                            description      = EXCLUDED.description,
 *                                            "dueDate"        = EXCLUDED."dueDate",
 *                                            "customerId"     = EXCLUDED."customerId"
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'InfoPage' parameters type */
export interface IInfoPageParams {
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  shop: string;
  status?: string | null | void;
}

/** 'InfoPage' return type */
export interface IInfoPageResult {
  discountAmount: number;
  dueDate: Date;
  hasDeposit: boolean;
  name: string;
  paidAmount: number;
  productAmount: number;
  serviceAmount: number;
  shippingAmount: number;
  status: string;
  taxAmount: number;
}

/** 'InfoPage' query type */
export interface IInfoPageQuery {
  params: IInfoPageParams;
  result: IInfoPageResult;
}

const infoPageIR: any = {"usedParamSet":{"shop":true,"status":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":158}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":199,"b":205}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":288,"b":293},{"a":351,"b":356},{"a":421,"b":426}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":485,"b":491}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":500,"b":506}]}],"statement":"WITH wo AS (SELECT id, name, status, \"taxAmount\", \"discountAmount\", \"shippingAmount\", \"dueDate\"\n            FROM \"WorkOrder\" wo\n            WHERE shop = :shop!\n              AND wo.status = COALESCE(:status, wo.status)\n              AND (\n                        wo.status ILIKE COALESCE(:query, '%') OR\n                        wo.name ILIKE COALESCE(:query, '%') OR\n                        wo.description ILIKE COALESCE(:query, '%'))\n            ORDER BY wo.id DESC\n            LIMIT :limit! OFFSET :offset),\n     prod AS (SELECT \"workOrderId\", COALESCE(SUM(quantity * \"unitPrice\"), 0) :: INTEGER AS \"productAmount!\"\n              FROM \"WorkOrderProduct\"\n              GROUP BY \"workOrderId\"),\n     wosea AS (SELECT wos.\"workOrderId\", COALESCE(SUM(wosea.hours * wosea.\"employeeRate\"), 0) :: INTEGER AS \"serviceEmployeeAmount!\"\n              FROM \"WorkOrderService\" wos\n              INNER JOIN \"WorkOrderServiceEmployeeAssignment\" wosea ON wosea.\"workOrderServiceId\" = wos.id\n              GROUP BY wos.\"workOrderId\"),\n    wos AS (SELECT \"workOrderId\", COALESCE(SUM(\"basePrice\"), 0) :: INTEGER AS \"serviceBaseAmount!\"\n            FROM \"WorkOrderService\"\n            GROUP BY \"workOrderId\"),\n     pay AS (SELECT \"workOrderId\",\n                    COALESCE(SUM(amount), 0) :: INTEGER        AS \"paidAmount!\",\n                    COALESCE(BOOL_OR(type = 'DEPOSIT'), FALSE) AS \"hasDeposit!\"\n             FROM \"WorkOrderPayment\"\n             GROUP BY \"workOrderId\")\nSELECT wo.name,\n       wo.status,\n       wo.\"taxAmount\",\n       wo.\"discountAmount\",\n       wo.\"shippingAmount\",\n       wo.\"dueDate\",\n       prod.\"productAmount!\",\n       pay.\"paidAmount!\",\n       pay.\"hasDeposit!\",\n       (wos.\"serviceBaseAmount!\" + wosea.\"serviceEmployeeAmount!\") AS \"serviceAmount!\"\nFROM wo\nLEFT JOIN prod ON wo.id = prod.\"workOrderId\"\nLEFT JOIN pay ON wo.id = pay.\"workOrderId\"\nLEFT JOIN wosea ON wo.id = wosea.\"workOrderId\"\nLEFT JOIN wos ON wo.id = wos.\"workOrderId\"\nORDER BY wo.id DESC"};

/**
 * Query generated from SQL:
 * ```
 * WITH wo AS (SELECT id, name, status, "taxAmount", "discountAmount", "shippingAmount", "dueDate"
 *             FROM "WorkOrder" wo
 *             WHERE shop = :shop!
 *               AND wo.status = COALESCE(:status, wo.status)
 *               AND (
 *                         wo.status ILIKE COALESCE(:query, '%') OR
 *                         wo.name ILIKE COALESCE(:query, '%') OR
 *                         wo.description ILIKE COALESCE(:query, '%'))
 *             ORDER BY wo.id DESC
 *             LIMIT :limit! OFFSET :offset),
 *      prod AS (SELECT "workOrderId", COALESCE(SUM(quantity * "unitPrice"), 0) :: INTEGER AS "productAmount!"
 *               FROM "WorkOrderProduct"
 *               GROUP BY "workOrderId"),
 *      wosea AS (SELECT wos."workOrderId", COALESCE(SUM(wosea.hours * wosea."employeeRate"), 0) :: INTEGER AS "serviceEmployeeAmount!"
 *               FROM "WorkOrderService" wos
 *               INNER JOIN "WorkOrderServiceEmployeeAssignment" wosea ON wosea."workOrderServiceId" = wos.id
 *               GROUP BY wos."workOrderId"),
 *     wos AS (SELECT "workOrderId", COALESCE(SUM("basePrice"), 0) :: INTEGER AS "serviceBaseAmount!"
 *             FROM "WorkOrderService"
 *             GROUP BY "workOrderId"),
 *      pay AS (SELECT "workOrderId",
 *                     COALESCE(SUM(amount), 0) :: INTEGER        AS "paidAmount!",
 *                     COALESCE(BOOL_OR(type = 'DEPOSIT'), FALSE) AS "hasDeposit!"
 *              FROM "WorkOrderPayment"
 *              GROUP BY "workOrderId")
 * SELECT wo.name,
 *        wo.status,
 *        wo."taxAmount",
 *        wo."discountAmount",
 *        wo."shippingAmount",
 *        wo."dueDate",
 *        prod."productAmount!",
 *        pay."paidAmount!",
 *        pay."hasDeposit!",
 *        (wos."serviceBaseAmount!" + wosea."serviceEmployeeAmount!") AS "serviceAmount!"
 * FROM wo
 * LEFT JOIN prod ON wo.id = prod."workOrderId"
 * LEFT JOIN pay ON wo.id = pay."workOrderId"
 * LEFT JOIN wosea ON wo.id = wosea."workOrderId"
 * LEFT JOIN wos ON wo.id = wos."workOrderId"
 * ORDER BY wo.id DESC
 * ```
 */
export const infoPage = new PreparedQuery<IInfoPageParams,IInfoPageResult>(infoPageIR);


/** 'Get' parameters type */
export interface IGetParams {
  id?: number | null | void;
  name?: string | null | void;
  shop?: string | null | void;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  customerId: string;
  description: string;
  discountAmount: number;
  dueDate: Date;
  id: number;
  name: string;
  shippingAmount: number;
  shop: string;
  status: string;
  taxAmount: number;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"id":true,"shop":true,"name":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":46,"b":48}]},{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":77,"b":81}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":112,"b":116}]}],"statement":"SELECT *\nFROM \"WorkOrder\"\nWHERE id = COALESCE(:id, id)\n  AND shop = COALESCE(:shop, shop)\n  AND name = COALESCE(:name, name)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder"
 * WHERE id = COALESCE(:id, id)
 *   AND shop = COALESCE(:shop, shop)
 *   AND name = COALESCE(:name, name)
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);



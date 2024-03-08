/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  derivedFromOrderId?: string | null | void;
  dueDate: DateOrString;
  name: string;
  note: string;
  shop: string;
  status: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  note: string;
  shop: string;
  status: string;
  updatedAt: Date;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"derivedFromOrderId":true,"note":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":129}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":140}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":154}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":175}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":183}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"derivedFromOrderId\", note)\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status               = EXCLUDED.status,\n                                           \"dueDate\"            = EXCLUDED.\"dueDate\",\n                                           \"customerId\"         = EXCLUDED.\"customerId\",\n                                           \"derivedFromOrderId\" = EXCLUDED.\"derivedFromOrderId\",\n                                           note                 = EXCLUDED.note\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note)
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
 *                                            "dueDate"            = EXCLUDED."dueDate",
 *                                            "customerId"         = EXCLUDED."customerId",
 *                                            "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
 *                                            note                 = EXCLUDED.note
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  shop: string;
  status?: string | null | void;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  note: string;
  shop: string;
  status: string;
  updatedAt: Date;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"query":true,"employeeIds":true,"customerId":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":148,"b":154}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":208},{"a":246,"b":251},{"a":297,"b":302},{"a":340,"b":345},{"a":383,"b":388}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":551,"b":562},{"a":569,"b":580},{"a":748,"b":759},{"a":766,"b":777}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":821,"b":831}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":877,"b":883}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":892,"b":898}]}],"statement":"SELECT wo.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"HourlyLabourCharge\" hl\n              WHERE hl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND (EXISTS(SELECT *\n              FROM \"FixedPriceLabourCharge\" fpl\n              WHERE fpl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT wo.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
 * WHERE wo.shop = :shop!
 *   AND wo.status = COALESCE(:status, wo.status)
 *   AND (
 *   wo.status ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *     OR c."displayName" ILIKE COALESCE(:query, '%')
 *     OR c.phone ILIKE COALESCE(:query, '%')
 *     OR c.email ILIKE COALESCE(:query, '%')
 *   )
 *   AND (EXISTS(SELECT *
 *               FROM "HourlyLabourCharge" hl
 *               WHERE hl."workOrderId" = wo.id
 *                 AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
 *   AND (EXISTS(SELECT *
 *               FROM "FixedPriceLabourCharge" fpl
 *               WHERE fpl."workOrderId" = wo.id
 *                 AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
 *   AND wo."customerId" = COALESCE(:customerId, wo."customerId")
 * ORDER BY wo.id DESC
 * LIMIT :limit! OFFSET :offset
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


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
  derivedFromOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  note: string;
  shop: string;
  status: string;
  updatedAt: Date;
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


/** 'GetItems' parameters type */
export interface IGetItemsParams {
  workOrderId: number;
}

/** 'GetItems' return type */
export interface IGetItemsResult {
  createdAt: Date;
  productVariantId: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetItems' query type */
export interface IGetItemsQuery {
  params: IGetItemsParams;
  result: IGetItemsResult;
}

const getItemsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":52,"b":64}]}],"statement":"SELECT *\nFROM \"WorkOrderItem\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItem"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getItems = new PreparedQuery<IGetItemsParams,IGetItemsResult>(getItemsIR);


/** 'GetUnlinkedItems' parameters type */
export interface IGetUnlinkedItemsParams {
  workOrderId: number;
}

/** 'GetUnlinkedItems' return type */
export interface IGetUnlinkedItemsResult {
  createdAt: Date;
  productVariantId: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetUnlinkedItems' query type */
export interface IGetUnlinkedItemsQuery {
  params: IGetUnlinkedItemsParams;
  result: IGetUnlinkedItemsResult;
}

const getUnlinkedItemsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":52,"b":64}]}],"statement":"SELECT *\nFROM \"WorkOrderItem\"\nWHERE \"workOrderId\" = :workOrderId!\n  AND \"shopifyOrderLineItemId\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItem"
 * WHERE "workOrderId" = :workOrderId!
 *   AND "shopifyOrderLineItemId" IS NULL
 * ```
 */
export const getUnlinkedItems = new PreparedQuery<IGetUnlinkedItemsParams,IGetUnlinkedItemsResult>(getUnlinkedItemsIR);


/** 'GetUnlinkedHourlyLabourCharges' parameters type */
export interface IGetUnlinkedHourlyLabourChargesParams {
  workOrderId: number;
}

/** 'GetUnlinkedHourlyLabourCharges' return type */
export interface IGetUnlinkedHourlyLabourChargesResult {
  createdAt: Date;
  employeeId: string | null;
  hours: string;
  name: string;
  rate: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetUnlinkedHourlyLabourCharges' query type */
export interface IGetUnlinkedHourlyLabourChargesQuery {
  params: IGetUnlinkedHourlyLabourChargesParams;
  result: IGetUnlinkedHourlyLabourChargesResult;
}

const getUnlinkedHourlyLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]}],"statement":"SELECT *\nFROM \"HourlyLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!\n  AND \"shopifyOrderLineItemId\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "HourlyLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 *   AND "shopifyOrderLineItemId" IS NULL
 * ```
 */
export const getUnlinkedHourlyLabourCharges = new PreparedQuery<IGetUnlinkedHourlyLabourChargesParams,IGetUnlinkedHourlyLabourChargesResult>(getUnlinkedHourlyLabourChargesIR);


/** 'GetUnlinkedFixedPriceLabourCharges' parameters type */
export interface IGetUnlinkedFixedPriceLabourChargesParams {
  workOrderId: number;
}

/** 'GetUnlinkedFixedPriceLabourCharges' return type */
export interface IGetUnlinkedFixedPriceLabourChargesResult {
  amount: string;
  createdAt: Date;
  employeeId: string | null;
  name: string;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid: string | null;
}

/** 'GetUnlinkedFixedPriceLabourCharges' query type */
export interface IGetUnlinkedFixedPriceLabourChargesQuery {
  params: IGetUnlinkedFixedPriceLabourChargesParams;
  result: IGetUnlinkedFixedPriceLabourChargesResult;
}

const getUnlinkedFixedPriceLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"SELECT *\nFROM \"FixedPriceLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!\n  AND \"shopifyOrderLineItemId\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "FixedPriceLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 *   AND "shopifyOrderLineItemId" IS NULL
 * ```
 */
export const getUnlinkedFixedPriceLabourCharges = new PreparedQuery<IGetUnlinkedFixedPriceLabourChargesParams,IGetUnlinkedFixedPriceLabourChargesResult>(getUnlinkedFixedPriceLabourChargesIR);


/** 'GetLinkedDraftOrderIds' parameters type */
export interface IGetLinkedDraftOrderIdsParams {
  workOrderId: number;
}

/** 'GetLinkedDraftOrderIds' return type */
export interface IGetLinkedDraftOrderIdsResult {
  orderId: string;
}

/** 'GetLinkedDraftOrderIds' query type */
export interface IGetLinkedDraftOrderIdsQuery {
  params: IGetLinkedDraftOrderIdsParams;
  result: IGetLinkedDraftOrderIdsResult;
}

const getLinkedDraftOrderIdsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":250,"b":262}]}],"statement":"SELECT DISTINCT so.\"orderId\"\nFROM \"WorkOrderItem\" woli\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON woli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\nWHERE woli.\"workOrderId\" = :workOrderId!\n  AND so.\"orderType\" = 'DRAFT_ORDER'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT so."orderId"
 * FROM "WorkOrderItem" woli
 *        INNER JOIN "ShopifyOrderLineItem" soli ON woli."shopifyOrderLineItemId" = soli."lineItemId"
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 * WHERE woli."workOrderId" = :workOrderId!
 *   AND so."orderType" = 'DRAFT_ORDER'
 * ```
 */
export const getLinkedDraftOrderIds = new PreparedQuery<IGetLinkedDraftOrderIdsParams,IGetLinkedDraftOrderIdsResult>(getLinkedDraftOrderIdsIR);


/** 'GetItemsByUuids' parameters type */
export interface IGetItemsByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetItemsByUuids' return type */
export interface IGetItemsByUuidsResult {
  createdAt: Date;
  productVariantId: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetItemsByUuids' query type */
export interface IGetItemsByUuidsQuery {
  params: IGetItemsByUuidsParams;
  result: IGetItemsByUuidsResult;
}

const getItemsByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":44,"b":50}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":84}]}],"statement":"SELECT *\nFROM \"WorkOrderItem\"\nWHERE uuid in :uuids!\nAND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItem"
 * WHERE uuid in :uuids!
 * AND "workOrderId" = :workOrderId!
 * ```
 */
export const getItemsByUuids = new PreparedQuery<IGetItemsByUuidsParams,IGetItemsByUuidsResult>(getItemsByUuidsIR);


/** 'SetLineItemShopifyOrderLineItemId' parameters type */
export interface ISetLineItemShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
  uuid: string;
  workOrderId: number;
}

/** 'SetLineItemShopifyOrderLineItemId' return type */
export type ISetLineItemShopifyOrderLineItemIdResult = void;

/** 'SetLineItemShopifyOrderLineItemId' query type */
export interface ISetLineItemShopifyOrderLineItemIdQuery {
  params: ISetLineItemShopifyOrderLineItemIdParams;
  result: ISetLineItemShopifyOrderLineItemIdResult;
}

const setLineItemShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":77}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":97}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":131}]}],"statement":"UPDATE \"WorkOrderItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\nAND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 * AND "workOrderId" = :workOrderId!
 * ```
 */
export const setLineItemShopifyOrderLineItemId = new PreparedQuery<ISetLineItemShopifyOrderLineItemIdParams,ISetLineItemShopifyOrderLineItemIdResult>(setLineItemShopifyOrderLineItemIdIR);



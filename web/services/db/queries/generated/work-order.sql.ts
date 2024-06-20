/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  derivedFromOrderId?: string | null | void;
  discountAmount?: string | null | void;
  discountType?: DiscountType | null | void;
  dueDate: DateOrString;
  internalNote: string;
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
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"derivedFromOrderId":true,"note":true,"internalNote":true,"discountAmount":true,"discountType":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":211}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":214,"b":219}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":222,"b":229}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":232,"b":240}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":243,"b":254}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":257,"b":275}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":278,"b":283}]},{"name":"internalNote","required":true,"transform":{"type":"scalar"},"locs":[{"a":286,"b":299}]},{"name":"discountAmount","required":false,"transform":{"type":"scalar"},"locs":[{"a":302,"b":316}]},{"name":"discountType","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":339}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"derivedFromOrderId\", note, \"internalNote\",\n                         \"discountAmount\",\n                         \"discountType\")\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :internalNote!, :discountAmount,\n        :discountType)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status               = EXCLUDED.status,\n                                           \"dueDate\"            = EXCLUDED.\"dueDate\",\n                                           \"customerId\"         = EXCLUDED.\"customerId\",\n                                           \"derivedFromOrderId\" = EXCLUDED.\"derivedFromOrderId\",\n                                           note                 = EXCLUDED.note,\n                                           \"internalNote\"       = EXCLUDED.\"internalNote\",\n                                           \"discountAmount\"     = EXCLUDED.\"discountAmount\",\n                                           \"discountType\"       = EXCLUDED.\"discountType\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note, "internalNote",
 *                          "discountAmount",
 *                          "discountType")
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :internalNote!, :discountAmount,
 *         :discountType)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
 *                                            "dueDate"            = EXCLUDED."dueDate",
 *                                            "customerId"         = EXCLUDED."customerId",
 *                                            "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
 *                                            note                 = EXCLUDED.note,
 *                                            "internalNote"       = EXCLUDED."internalNote",
 *                                            "discountAmount"     = EXCLUDED."discountAmount",
 *                                            "discountType"       = EXCLUDED."discountType"
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'UpdateDiscount' parameters type */
export interface IUpdateDiscountParams {
  discountAmount?: string | null | void;
  discountType?: DiscountType | null | void;
  id: number;
}

/** 'UpdateDiscount' return type */
export type IUpdateDiscountResult = void;

/** 'UpdateDiscount' query type */
export interface IUpdateDiscountQuery {
  params: IUpdateDiscountParams;
  result: IUpdateDiscountResult;
}

const updateDiscountIR: any = {"usedParamSet":{"discountAmount":true,"discountType":true,"id":true},"params":[{"name":"discountAmount","required":false,"transform":{"type":"scalar"},"locs":[{"a":44,"b":58}]},{"name":"discountType","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":98}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":114}]}],"statement":"UPDATE \"WorkOrder\"\n  SET \"discountAmount\" = :discountAmount,\n      \"discountType\"   = :discountType\nWHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrder"
 *   SET "discountAmount" = :discountAmount,
 *       "discountType"   = :discountType
 * WHERE id = :id!
 * ```
 */
export const updateDiscount = new PreparedQuery<IUpdateDiscountParams,IUpdateDiscountResult>(updateDiscountIR);


/** 'InsertCustomFields' parameters type */
export interface IInsertCustomFieldsParams {
  customFields: readonly ({
    workOrderId: number,
    key: string,
    value: string
  })[];
}

/** 'InsertCustomFields' return type */
export type IInsertCustomFieldsResult = void;

/** 'InsertCustomFields' query type */
export interface IInsertCustomFieldsQuery {
  params: IInsertCustomFieldsParams;
  result: IInsertCustomFieldsResult;
}

const insertCustomFieldsIR: any = {"usedParamSet":{"customFields":true},"params":[{"name":"customFields","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"key","required":true},{"name":"value","required":true}]},"locs":[{"a":83,"b":95}]}],"statement":"INSERT INTO \"WorkOrderCustomField\" (\"workOrderId\", key, value)\nVALUES (0, '', ''), :customFields OFFSET 1"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
 * VALUES (0, '', ''), :customFields OFFSET 1
 * ```
 */
export const insertCustomFields = new PreparedQuery<IInsertCustomFieldsParams,IInsertCustomFieldsResult>(insertCustomFieldsIR);


/** 'RemoveCustomFields' parameters type */
export interface IRemoveCustomFieldsParams {
  workOrderId: number;
}

/** 'RemoveCustomFields' return type */
export type IRemoveCustomFieldsResult = void;

/** 'RemoveCustomFields' query type */
export interface IRemoveCustomFieldsQuery {
  params: IRemoveCustomFieldsParams;
  result: IRemoveCustomFieldsResult;
}

const removeCustomFieldsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":69}]}],"statement":"DELETE\nFROM \"WorkOrderCustomField\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderCustomField"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const removeCustomFields = new PreparedQuery<IRemoveCustomFieldsParams,IRemoveCustomFieldsResult>(removeCustomFieldsIR);


/** 'GetCustomFields' parameters type */
export interface IGetCustomFieldsParams {
  workOrderId: number;
}

/** 'GetCustomFields' return type */
export interface IGetCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  updatedAt: Date;
  value: string;
  workOrderId: number;
}

/** 'GetCustomFields' query type */
export interface IGetCustomFieldsQuery {
  params: IGetCustomFieldsParams;
  result: IGetCustomFieldsResult;
}

const getCustomFieldsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":71}]}],"statement":"SELECT *\nFROM \"WorkOrderCustomField\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderCustomField"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getCustomFields = new PreparedQuery<IGetCustomFieldsParams,IGetCustomFieldsResult>(getCustomFieldsIR);


/** 'InsertItemCustomFields' parameters type */
export interface IInsertItemCustomFieldsParams {
  customFields: readonly ({
    workOrderId: number,
    workOrderItemUuid: string,
    key: string,
    value: string
  })[];
}

/** 'InsertItemCustomFields' return type */
export type IInsertItemCustomFieldsResult = void;

/** 'InsertItemCustomFields' query type */
export interface IInsertItemCustomFieldsQuery {
  params: IInsertItemCustomFieldsParams;
  result: IInsertItemCustomFieldsResult;
}

const insertItemCustomFieldsIR: any = {"usedParamSet":{"customFields":true},"params":[{"name":"customFields","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"workOrderItemUuid","required":true},{"name":"key","required":true},{"name":"value","required":true}]},"locs":[{"a":127,"b":139}]}],"statement":"INSERT INTO \"WorkOrderItemCustomField\" (\"workOrderId\", \"workOrderItemUuid\", key, value)\nVALUES (0, gen_random_uuid(), '', ''), :customFields OFFSET 1"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderItemCustomField" ("workOrderId", "workOrderItemUuid", key, value)
 * VALUES (0, gen_random_uuid(), '', ''), :customFields OFFSET 1
 * ```
 */
export const insertItemCustomFields = new PreparedQuery<IInsertItemCustomFieldsParams,IInsertItemCustomFieldsResult>(insertItemCustomFieldsIR);


/** 'RemoveItemCustomFields' parameters type */
export interface IRemoveItemCustomFieldsParams {
  workOrderId: number;
}

/** 'RemoveItemCustomFields' return type */
export type IRemoveItemCustomFieldsResult = void;

/** 'RemoveItemCustomFields' query type */
export interface IRemoveItemCustomFieldsQuery {
  params: IRemoveItemCustomFieldsParams;
  result: IRemoveItemCustomFieldsResult;
}

const removeItemCustomFieldsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"DELETE\nFROM \"WorkOrderItemCustomField\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderItemCustomField"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const removeItemCustomFields = new PreparedQuery<IRemoveItemCustomFieldsParams,IRemoveItemCustomFieldsResult>(removeItemCustomFieldsIR);


/** 'GetItemCustomFields' parameters type */
export interface IGetItemCustomFieldsParams {
  workOrderId: number;
}

/** 'GetItemCustomFields' return type */
export interface IGetItemCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  updatedAt: Date;
  value: string;
  workOrderId: number;
  workOrderItemUuid: string;
}

/** 'GetItemCustomFields' query type */
export interface IGetItemCustomFieldsQuery {
  params: IGetItemCustomFieldsParams;
  result: IGetItemCustomFieldsResult;
}

const getItemCustomFieldsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":75}]}],"statement":"SELECT *\nFROM \"WorkOrderItemCustomField\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItemCustomField"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getItemCustomFields = new PreparedQuery<IGetItemCustomFieldsParams,IGetItemCustomFieldsResult>(getItemCustomFieldsIR);


/** 'GetCustomItemCustomFields' parameters type */
export interface IGetCustomItemCustomFieldsParams {
  workOrderId: number;
}

/** 'GetCustomItemCustomFields' return type */
export interface IGetCustomItemCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  updatedAt: Date;
  value: string;
  workOrderCustomItemUuid: string;
  workOrderId: number;
}

/** 'GetCustomItemCustomFields' query type */
export interface IGetCustomItemCustomFieldsQuery {
  params: IGetCustomItemCustomFieldsParams;
  result: IGetCustomItemCustomFieldsResult;
}

const getCustomItemCustomFieldsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":81}]}],"statement":"SELECT *\nFROM \"WorkOrderCustomItemCustomField\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderCustomItemCustomField"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getCustomItemCustomFields = new PreparedQuery<IGetCustomItemCustomFieldsParams,IGetCustomItemCustomFieldsResult>(getCustomItemCustomFieldsIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  afterDueDate?: DateOrString | null | void;
  beforeDueDate?: DateOrString | null | void;
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  fullyPaid: boolean;
  inverseOrderConditions: boolean;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  partiallyPaid: boolean;
  purchaseOrdersFulfilled?: boolean | null | void;
  query?: string | null | void;
  requiredCustomFieldFilters: readonly ({
    key: string | null | void,
    value: string | null | void,
    inverse: boolean
  })[];
  shop: string;
  status?: string | null | void;
  unpaid: boolean;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  name: string;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"status":true,"afterDueDate":true,"beforeDueDate":true,"query":true,"employeeIds":true,"customerId":true,"unpaid":true,"partiallyPaid":true,"fullyPaid":true,"inverseOrderConditions":true,"purchaseOrdersFulfilled":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":970,"b":975}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1004,"b":1010}]},{"name":"afterDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1055,"b":1067}]},{"name":"beforeDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1115,"b":1128}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1180,"b":1185},{"a":1223,"b":1228},{"a":1274,"b":1279},{"a":1317,"b":1322},{"a":1360,"b":1365}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1537,"b":1548},{"a":1555,"b":1566},{"a":1743,"b":1754},{"a":1761,"b":1772}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1816,"b":1826}]},{"name":"unpaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2634,"b":2641}]},{"name":"partiallyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2768,"b":2782}]},{"name":"fullyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2848,"b":2858}]},{"name":"inverseOrderConditions","required":true,"transform":{"type":"scalar"},"locs":[{"a":2875,"b":2898}]},{"name":"purchaseOrdersFulfilled","required":false,"transform":{"type":"scalar"},"locs":[{"a":2984,"b":3007},{"a":3014,"b":3037}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3074,"b":3080}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3089,"b":3095}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT wo.name\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\n\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" wohlc ON wo.id = wohlc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" wofplc ON wo.id = wofplc.\"workOrderId\"\n\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\" OR\n  wohlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\" OR\n  wofplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON soli.\"lineItemId\" = poli.\"shopifyOrderLineItemId\"\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND wo.\"dueDate\" >= COALESCE(:afterDueDate, wo.\"dueDate\")\n  AND wo.\"dueDate\" <= COALESCE(:beforeDueDate, wo.\"dueDate\")\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderHourlyLabourCharge\" hl\n              WHERE hl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderFixedPriceLabourCharge\" fpl\n              WHERE fpl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"WorkOrderCustomField\" wocf\n                                    ON (wocf.\"workOrderId\" = wo.id AND\n                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nGROUP BY wo.id\nHAVING (\n         (NOT COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) OR NOT :unpaid!) AND\n         ((COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) AND NOT COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE)) OR\n          NOT :partiallyPaid!) AND\n         (COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE) OR NOT :fullyPaid!)\n         ) != :inverseOrderConditions!\n   AND ((SUM(poli.\"availableQuantity\") IS NOT DISTINCT FROM SUM(poli.\"quantity\")) = :purchaseOrdersFulfilled\n  OR :purchaseOrdersFulfilled IS NULL)\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
 *                               FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
 * SELECT wo.name
 * FROM "WorkOrder" wo
 *        LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
 * 
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge" wohlc ON wo.id = wohlc."workOrderId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge" wofplc ON wo.id = wofplc."workOrderId"
 * 
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId" OR
 *   wohlc."shopifyOrderLineItemId" = soli."lineItemId" OR
 *   wofplc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        LEFT JOIN "PurchaseOrderLineItem" poli ON soli."lineItemId" = poli."shopifyOrderLineItemId"
 * WHERE wo.shop = :shop!
 *   AND wo.status = COALESCE(:status, wo.status)
 *   AND wo."dueDate" >= COALESCE(:afterDueDate, wo."dueDate")
 *   AND wo."dueDate" <= COALESCE(:beforeDueDate, wo."dueDate")
 *   AND (
 *   wo.status ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *     OR c."displayName" ILIKE COALESCE(:query, '%')
 *     OR c.phone ILIKE COALESCE(:query, '%')
 *     OR c.email ILIKE COALESCE(:query, '%')
 *   )
 *   AND (EXISTS(SELECT *
 *               FROM "WorkOrderHourlyLabourCharge" hl
 *               WHERE hl."workOrderId" = wo.id
 *                 AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
 *   AND (EXISTS(SELECT *
 *               FROM "WorkOrderFixedPriceLabourCharge" fpl
 *               WHERE fpl."workOrderId" = wo.id
 *                 AND "employeeId" = ANY (:employeeIds)) OR :employeeIds IS NULL)
 *   AND wo."customerId" = COALESCE(:customerId, wo."customerId")
 *   AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))
 *        FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match
 *              FROM (SELECT filter.row,
 *                           (filter.key IS NOT NULL) AND
 *                           (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=
 *                           filter.inverse
 *                    FROM "CustomFieldFilters" filter
 *                           LEFT JOIN "WorkOrderCustomField" wocf
 *                                     ON (wocf."workOrderId" = wo.id AND
 *                                         wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)
 *              GROUP BY row) b(row, match))
 * GROUP BY wo.id
 * HAVING (
 *          (NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) OR NOT :unpaid!) AND
 *          ((COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND NOT COALESCE(BOOL_AND(so."fullyPaid"), FALSE)) OR
 *           NOT :partiallyPaid!) AND
 *          (COALESCE(BOOL_AND(so."fullyPaid"), FALSE) OR NOT :fullyPaid!)
 *          ) != :inverseOrderConditions!
 *    AND ((SUM(poli."availableQuantity") IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled
 *   OR :purchaseOrdersFulfilled IS NULL)
 * ORDER BY wo.id DESC
 * LIMIT :limit! OFFSET :offset
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


/** 'Get' parameters type */
export interface IGetParams {
  name: string;
  shop: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
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

const getIR: any = {"usedParamSet":{"shop":true,"name":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":39,"b":44}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":64}]}],"statement":"SELECT *\nFROM \"WorkOrder\"\nWHERE shop = :shop!\n  AND name = :name!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder"
 * WHERE shop = :shop!
 *   AND name = :name!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetById' parameters type */
export interface IGetByIdParams {
  id: number;
}

/** 'GetById' return type */
export interface IGetByIdResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
  name: string;
  note: string;
  shop: string;
  status: string;
  updatedAt: Date;
}

/** 'GetById' query type */
export interface IGetByIdQuery {
  params: IGetByIdParams;
  result: IGetByIdResult;
}

const getByIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":37,"b":40}]}],"statement":"SELECT *\nFROM \"WorkOrder\"\nWHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder"
 * WHERE id = :id!
 * ```
 */
export const getById = new PreparedQuery<IGetByIdParams,IGetByIdResult>(getByIdIR);


/** 'GetItems' parameters type */
export interface IGetItemsParams {
  workOrderId: number;
}

/** 'GetItems' return type */
export interface IGetItemsResult {
  absorbCharges: boolean;
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


/** 'GetCustomItems' parameters type */
export interface IGetCustomItemsParams {
  workOrderId: number;
}

/** 'GetCustomItems' return type */
export interface IGetCustomItemsResult {
  absorbCharges: boolean;
  createdAt: Date;
  name: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitPrice: string;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetCustomItems' query type */
export interface IGetCustomItemsQuery {
  params: IGetCustomItemsParams;
  result: IGetCustomItemsResult;
}

const getCustomItemsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":70}]}],"statement":"SELECT *\nFROM \"WorkOrderCustomItem\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderCustomItem"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getCustomItems = new PreparedQuery<IGetCustomItemsParams,IGetCustomItemsResult>(getCustomItemsIR);


/** 'GetItemsByUuids' parameters type */
export interface IGetItemsByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetItemsByUuids' return type */
export interface IGetItemsByUuidsResult {
  absorbCharges: boolean;
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

const getItemsByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":44,"b":50}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":86}]}],"statement":"SELECT *\nFROM \"WorkOrderItem\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItem"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getItemsByUuids = new PreparedQuery<IGetItemsByUuidsParams,IGetItemsByUuidsResult>(getItemsByUuidsIR);


/** 'GetCustomItemsByUuids' parameters type */
export interface IGetCustomItemsByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetCustomItemsByUuids' return type */
export interface IGetCustomItemsByUuidsResult {
  absorbCharges: boolean;
  createdAt: Date;
  name: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitPrice: string;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetCustomItemsByUuids' query type */
export interface IGetCustomItemsByUuidsQuery {
  params: IGetCustomItemsByUuidsParams;
  result: IGetCustomItemsByUuidsResult;
}

const getCustomItemsByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":50,"b":56}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":92}]}],"statement":"SELECT *\nFROM \"WorkOrderCustomItem\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderCustomItem"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getCustomItemsByUuids = new PreparedQuery<IGetCustomItemsByUuidsParams,IGetCustomItemsByUuidsResult>(getCustomItemsByUuidsIR);


/** 'SetItemShopifyOrderLineItemId' parameters type */
export interface ISetItemShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
  uuid: string;
  workOrderId: number;
}

/** 'SetItemShopifyOrderLineItemId' return type */
export type ISetItemShopifyOrderLineItemIdResult = void;

/** 'SetItemShopifyOrderLineItemId' query type */
export interface ISetItemShopifyOrderLineItemIdQuery {
  params: ISetItemShopifyOrderLineItemIdParams;
  result: ISetItemShopifyOrderLineItemIdResult;
}

const setItemShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":77}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":97}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":133}]}],"statement":"UPDATE \"WorkOrderItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setItemShopifyOrderLineItemId = new PreparedQuery<ISetItemShopifyOrderLineItemIdParams,ISetItemShopifyOrderLineItemIdResult>(setItemShopifyOrderLineItemIdIR);


/** 'SetCustomItemShopifyOrderLineItemId' parameters type */
export interface ISetCustomItemShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
  uuid: string;
  workOrderId: number;
}

/** 'SetCustomItemShopifyOrderLineItemId' return type */
export type ISetCustomItemShopifyOrderLineItemIdResult = void;

/** 'SetCustomItemShopifyOrderLineItemId' query type */
export interface ISetCustomItemShopifyOrderLineItemIdQuery {
  params: ISetCustomItemShopifyOrderLineItemIdParams;
  result: ISetCustomItemShopifyOrderLineItemIdResult;
}

const setCustomItemShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":83}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":103}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":139}]}],"statement":"UPDATE \"WorkOrderCustomItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderCustomItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setCustomItemShopifyOrderLineItemId = new PreparedQuery<ISetCustomItemShopifyOrderLineItemIdParams,ISetCustomItemShopifyOrderLineItemIdResult>(setCustomItemShopifyOrderLineItemIdIR);


/** 'UpsertItem' parameters type */
export interface IUpsertItemParams {
  absorbCharges: boolean;
  productVariantId: string;
  quantity: number;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
}

/** 'UpsertItem' return type */
export type IUpsertItemResult = void;

/** 'UpsertItem' query type */
export interface IUpsertItemQuery {
  params: IUpsertItemParams;
  result: IUpsertItemResult;
}

const upsertItemIR: any = {"usedParamSet":{"uuid":true,"workOrderId":true,"shopifyOrderLineItemId":true,"quantity":true,"productVariantId":true,"absorbCharges":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":165}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":180}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":205}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":208,"b":217}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":220,"b":237}]},{"name":"absorbCharges","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":254}]}],"statement":"INSERT INTO \"WorkOrderItem\" (uuid, \"workOrderId\", \"shopifyOrderLineItemId\", quantity, \"productVariantId\",\n                             \"absorbCharges\")\nVALUES (:uuid!, :workOrderId!, :shopifyOrderLineItemId, :quantity!, :productVariantId!, :absorbCharges!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE SET \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n                quantity                 = EXCLUDED.quantity,\n                \"productVariantId\"       = EXCLUDED.\"productVariantId\",\n                \"absorbCharges\"          = EXCLUDED.\"absorbCharges\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, "productVariantId",
 *                              "absorbCharges")
 * VALUES (:uuid!, :workOrderId!, :shopifyOrderLineItemId, :quantity!, :productVariantId!, :absorbCharges!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *                 quantity                 = EXCLUDED.quantity,
 *                 "productVariantId"       = EXCLUDED."productVariantId",
 *                 "absorbCharges"          = EXCLUDED."absorbCharges"
 * ```
 */
export const upsertItem = new PreparedQuery<IUpsertItemParams,IUpsertItemResult>(upsertItemIR);


/** 'UpsertItems' parameters type */
export interface IUpsertItemsParams {
  items: readonly ({
    uuid: string,
    workOrderId: number,
    shopifyOrderLineItemId: string | null | void,
    quantity: number,
    productVariantId: string,
    absorbCharges: boolean
  })[];
}

/** 'UpsertItems' return type */
export type IUpsertItemsResult = void;

/** 'UpsertItems' query type */
export interface IUpsertItemsQuery {
  params: IUpsertItemsParams;
  result: IUpsertItemsResult;
}

const upsertItemsIR: any = {"usedParamSet":{"items":true},"params":[{"name":"items","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"uuid","required":true},{"name":"workOrderId","required":true},{"name":"shopifyOrderLineItemId","required":false},{"name":"quantity","required":true},{"name":"productVariantId","required":true},{"name":"absorbCharges","required":true}]},"locs":[{"a":203,"b":208}]}],"statement":"INSERT INTO \"WorkOrderItem\" (uuid, \"workOrderId\", \"shopifyOrderLineItemId\", quantity, \"productVariantId\",\n                             \"absorbCharges\")\nVALUES (gen_random_uuid(), 0, NULL, 0, '', FALSE), :items\nOFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\nDO UPDATE SET \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\nquantity = EXCLUDED.quantity,\n\"productVariantId\" = EXCLUDED.\"productVariantId\",\n\"absorbCharges\" = EXCLUDED.\"absorbCharges\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, "productVariantId",
 *                              "absorbCharges")
 * VALUES (gen_random_uuid(), 0, NULL, 0, '', FALSE), :items
 * OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 * DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 * quantity = EXCLUDED.quantity,
 * "productVariantId" = EXCLUDED."productVariantId",
 * "absorbCharges" = EXCLUDED."absorbCharges"
 * ```
 */
export const upsertItems = new PreparedQuery<IUpsertItemsParams,IUpsertItemsResult>(upsertItemsIR);


/** 'UpsertCustomItems' parameters type */
export interface IUpsertCustomItemsParams {
  items: readonly ({
    uuid: string,
    workOrderId: number,
    shopifyOrderLineItemId: string | null | void,
    quantity: number,
    name: string,
    unitPrice: string,
    absorbCharges: boolean
  })[];
}

/** 'UpsertCustomItems' return type */
export type IUpsertCustomItemsResult = void;

/** 'UpsertCustomItems' query type */
export interface IUpsertCustomItemsQuery {
  params: IUpsertCustomItemsParams;
  result: IUpsertCustomItemsResult;
}

const upsertCustomItemsIR: any = {"usedParamSet":{"items":true},"params":[{"name":"items","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"uuid","required":true},{"name":"workOrderId","required":true},{"name":"shopifyOrderLineItemId","required":false},{"name":"quantity","required":true},{"name":"name","required":true},{"name":"unitPrice","required":true},{"name":"absorbCharges","required":true}]},"locs":[{"a":183,"b":188}]}],"statement":"INSERT INTO \"WorkOrderCustomItem\" (uuid, \"workOrderId\", \"shopifyOrderLineItemId\", quantity, name, \"unitPrice\", \"absorbCharges\")\nVALUES (gen_random_uuid(), 0, NULL, 0, '', '', FALSE), :items\nOFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\nDO UPDATE SET \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\nquantity = EXCLUDED.quantity,\nname = EXCLUDED.name,\n\"unitPrice\" = EXCLUDED.\"unitPrice\",\n\"absorbCharges\" = EXCLUDED.\"absorbCharges\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderCustomItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, name, "unitPrice", "absorbCharges")
 * VALUES (gen_random_uuid(), 0, NULL, 0, '', '', FALSE), :items
 * OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 * DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 * quantity = EXCLUDED.quantity,
 * name = EXCLUDED.name,
 * "unitPrice" = EXCLUDED."unitPrice",
 * "absorbCharges" = EXCLUDED."absorbCharges"
 * ```
 */
export const upsertCustomItems = new PreparedQuery<IUpsertCustomItemsParams,IUpsertCustomItemsResult>(upsertCustomItemsIR);


/** 'RemoveItem' parameters type */
export interface IRemoveItemParams {
  uuid: string;
  workOrderId: number;
}

/** 'RemoveItem' return type */
export type IRemoveItemResult = void;

/** 'RemoveItem' query type */
export interface IRemoveItemQuery {
  params: IRemoveItemParams;
  result: IRemoveItemResult;
}

const removeItemIR: any = {"usedParamSet":{"uuid":true,"workOrderId":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":46}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]}],"statement":"DELETE\nFROM \"WorkOrderItem\"\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderItem"
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const removeItem = new PreparedQuery<IRemoveItemParams,IRemoveItemResult>(removeItemIR);


/** 'GetAppliedDiscounts' parameters type */
export interface IGetAppliedDiscountsParams {
  workOrderId: number;
}

/** 'GetAppliedDiscounts' return type */
export interface IGetAppliedDiscountsResult {
  amount: string;
  code: string;
  createdAt: Date;
  id: number;
  orderId: string;
  updatedAt: Date;
}

/** 'GetAppliedDiscounts' query type */
export interface IGetAppliedDiscountsQuery {
  params: IGetAppliedDiscountsParams;
  result: IGetAppliedDiscountsResult;
}

const getAppliedDiscountsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":659,"b":671}]}],"statement":"SELECT DISTINCT sod.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" wfplc ON wo.id = wfplc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" whlc ON wo.id = whlc.\"workOrderId\"\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR wfplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR whlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       INNER JOIN \"ShopifyOrderDiscount\" sod ON sod.\"orderId\" = so.\"orderId\"\nWHERE wo.id = :workOrderId!\n  AND so.\"orderType\" = 'ORDER'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT sod.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge" wfplc ON wo.id = wfplc."workOrderId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge" whlc ON wo.id = whlc."workOrderId"
 *        INNER JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR wfplc."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR whlc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
 * WHERE wo.id = :workOrderId!
 *   AND so."orderType" = 'ORDER'
 * ```
 */
export const getAppliedDiscounts = new PreparedQuery<IGetAppliedDiscountsParams,IGetAppliedDiscountsResult>(getAppliedDiscountsIR);



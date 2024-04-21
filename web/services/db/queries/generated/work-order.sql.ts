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


/** 'InsertCustomField' parameters type */
export interface IInsertCustomFieldParams {
  key: string;
  value: string;
  workOrderId: number;
}

/** 'InsertCustomField' return type */
export type IInsertCustomFieldResult = void;

/** 'InsertCustomField' query type */
export interface IInsertCustomFieldQuery {
  params: IInsertCustomFieldParams;
  result: IInsertCustomFieldResult;
}

const insertCustomFieldIR: any = {"usedParamSet":{"workOrderId":true,"key":true,"value":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":83}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":90}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":99}]}],"statement":"INSERT INTO \"WorkOrderCustomField\" (\"workOrderId\", key, value)\nVALUES (:workOrderId!, :key!, :value!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
 * VALUES (:workOrderId!, :key!, :value!)
 * ```
 */
export const insertCustomField = new PreparedQuery<IInsertCustomFieldParams,IInsertCustomFieldResult>(insertCustomFieldIR);


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


/** 'GetPage' parameters type */
export interface IGetPageParams {
  afterDueDate?: DateOrString | null | void;
  beforeDueDate?: DateOrString | null | void;
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  fullyPaid: boolean;
  hasPaidDeposit: boolean;
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

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"status":true,"afterDueDate":true,"beforeDueDate":true,"query":true,"employeeIds":true,"customerId":true,"unpaid":true,"partiallyPaid":true,"fullyPaid":true,"hasPaidDeposit":true,"inverseOrderConditions":true,"purchaseOrdersFulfilled":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":1210,"b":1215}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1244,"b":1250}]},{"name":"afterDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1295,"b":1307}]},{"name":"beforeDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1355,"b":1368}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1420,"b":1425},{"a":1463,"b":1468},{"a":1514,"b":1519},{"a":1557,"b":1562},{"a":1600,"b":1605}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1777,"b":1788},{"a":1795,"b":1806},{"a":1983,"b":1994},{"a":2001,"b":2012}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2056,"b":2066}]},{"name":"unpaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2938,"b":2945}]},{"name":"partiallyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":3120,"b":3134}]},{"name":"fullyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":3200,"b":3210}]},{"name":"hasPaidDeposit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3337,"b":3352}]},{"name":"inverseOrderConditions","required":true,"transform":{"type":"scalar"},"locs":[{"a":3369,"b":3392}]},{"name":"purchaseOrdersFulfilled","required":false,"transform":{"type":"scalar"},"locs":[{"a":3478,"b":3501},{"a":3508,"b":3531}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3568,"b":3574}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3583,"b":3589}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT wo.name\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\n\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" wohlc ON wo.id = wohlc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" wofplc ON wo.id = wofplc.\"workOrderId\"\n\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\" OR\n  wohlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\" OR\n  wofplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON soli.\"lineItemId\" = poli.\"shopifyOrderLineItemId\"\n\n       LEFT JOIN \"WorkOrderDeposit\" wod ON wo.id = wod.\"workOrderId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" solid ON wod.\"shopifyOrderLineItemId\" = solid.\"lineItemId\"\n       LEFT JOIN \"ShopifyOrder\" sod ON solid.\"orderId\" = sod.\"orderId\"\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND wo.\"dueDate\" >= COALESCE(:afterDueDate, wo.\"dueDate\")\n  AND wo.\"dueDate\" <= COALESCE(:beforeDueDate, wo.\"dueDate\")\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderHourlyLabourCharge\" hl\n              WHERE hl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderFixedPriceLabourCharge\" fpl\n              WHERE fpl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"WorkOrderCustomField\" wocf\n                                    ON (wocf.\"workOrderId\" = wo.id AND\n                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nGROUP BY wo.id\nHAVING (\n         (((NOT COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) AND NOT COALESCE(BOOL_OR(sod.\"fullyPaid\"), FALSE))) OR\n          NOT :unpaid!) AND\n         (((COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) OR COALESCE(BOOL_OR(sod.\"fullyPaid\"), FALSE)) AND\n           NOT COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE)) OR NOT :partiallyPaid!) AND\n         (COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE) OR NOT :fullyPaid!) AND\n         ((NOT COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) AND COALESCE(BOOL_OR(sod.\"fullyPaid\"), FALSE)) OR\n          NOT :hasPaidDeposit!)\n         ) != :inverseOrderConditions!\n   AND ((SUM(poli.\"availableQuantity\") IS NOT DISTINCT FROM SUM(poli.\"quantity\")) = :purchaseOrdersFulfilled\n  OR :purchaseOrdersFulfilled IS NULL)\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

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
 * 
 *        LEFT JOIN "WorkOrderDeposit" wod ON wo.id = wod."workOrderId"
 *        LEFT JOIN "ShopifyOrderLineItem" solid ON wod."shopifyOrderLineItemId" = solid."lineItemId"
 *        LEFT JOIN "ShopifyOrder" sod ON solid."orderId" = sod."orderId"
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
 *          (((NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND NOT COALESCE(BOOL_OR(sod."fullyPaid"), FALSE))) OR
 *           NOT :unpaid!) AND
 *          (((COALESCE(BOOL_OR(so."fullyPaid"), FALSE) OR COALESCE(BOOL_OR(sod."fullyPaid"), FALSE)) AND
 *            NOT COALESCE(BOOL_AND(so."fullyPaid"), FALSE)) OR NOT :partiallyPaid!) AND
 *          (COALESCE(BOOL_AND(so."fullyPaid"), FALSE) OR NOT :fullyPaid!) AND
 *          ((NOT COALESCE(BOOL_OR(so."fullyPaid"), FALSE) AND COALESCE(BOOL_OR(sod."fullyPaid"), FALSE)) OR
 *           NOT :hasPaidDeposit!)
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
  id?: number | null | void;
  name?: string | null | void;
  shop?: string | null | void;
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


/** 'GetDeposits' parameters type */
export interface IGetDepositsParams {
  workOrderId: number;
}

/** 'GetDeposits' return type */
export interface IGetDepositsResult {
  amount: string;
  createdAt: Date;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetDeposits' query type */
export interface IGetDepositsQuery {
  params: IGetDepositsParams;
  result: IGetDepositsResult;
}

const getDepositsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]}],"statement":"SELECT *\nFROM \"WorkOrderDeposit\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderDeposit"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getDeposits = new PreparedQuery<IGetDepositsParams,IGetDepositsResult>(getDepositsIR);


/** 'GetDepositsByUuids' parameters type */
export interface IGetDepositsByUuidsParams {
  uuids: readonly (string)[];
  workOrderId: number;
}

/** 'GetDepositsByUuids' return type */
export interface IGetDepositsByUuidsResult {
  amount: string;
  createdAt: Date;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetDepositsByUuids' query type */
export interface IGetDepositsByUuidsQuery {
  params: IGetDepositsByUuidsParams;
  result: IGetDepositsByUuidsResult;
}

const getDepositsByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":47,"b":53}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":89}]}],"statement":"SELECT *\nFROM \"WorkOrderDeposit\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderDeposit"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getDepositsByUuids = new PreparedQuery<IGetDepositsByUuidsParams,IGetDepositsByUuidsResult>(getDepositsByUuidsIR);


/** 'UpsertDeposit' parameters type */
export interface IUpsertDepositParams {
  amount: string;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
}

/** 'UpsertDeposit' return type */
export type IUpsertDepositResult = void;

/** 'UpsertDeposit' query type */
export interface IUpsertDepositQuery {
  params: IUpsertDepositParams;
  result: IUpsertDepositResult;
}

const upsertDepositIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true,"shopifyOrderLineItemId":true,"amount":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":107}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":118,"b":140}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":150}]}],"statement":"INSERT INTO \"WorkOrderDeposit\" (\"workOrderId\", uuid, \"shopifyOrderLineItemId\", amount)\nVALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :amount!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE SET \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n                amount                   = EXCLUDED.amount"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderDeposit" ("workOrderId", uuid, "shopifyOrderLineItemId", amount)
 * VALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :amount!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *                 amount                   = EXCLUDED.amount
 * ```
 */
export const upsertDeposit = new PreparedQuery<IUpsertDepositParams,IUpsertDepositResult>(upsertDepositIR);


/** 'RemoveDeposit' parameters type */
export interface IRemoveDepositParams {
  uuid: string;
  workOrderId: number;
}

/** 'RemoveDeposit' return type */
export type IRemoveDepositResult = void;

/** 'RemoveDeposit' query type */
export interface IRemoveDepositQuery {
  params: IRemoveDepositParams;
  result: IRemoveDepositResult;
}

const removeDepositIR: any = {"usedParamSet":{"uuid":true,"workOrderId":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":49}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":85}]}],"statement":"DELETE\nFROM \"WorkOrderDeposit\"\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderDeposit"
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const removeDeposit = new PreparedQuery<IRemoveDepositParams,IRemoveDepositResult>(removeDepositIR);


/** 'GetPaidDeposits' parameters type */
export interface IGetPaidDepositsParams {
  workOrderId: number;
}

/** 'GetPaidDeposits' return type */
export interface IGetPaidDepositsResult {
  amount: string;
  createdAt: Date;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'GetPaidDeposits' query type */
export interface IGetPaidDepositsQuery {
  params: IGetPaidDepositsParams;
  result: IGetPaidDepositsResult;
}

const getPaidDepositsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":258,"b":270}]}],"statement":"SELECT wod.*\nFROM \"WorkOrderDeposit\" wod\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON \"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\nWHERE so.\"fullyPaid\" = TRUE\n  AND wod.\"workOrderId\" = :workOrderId!\n  AND so.\"orderType\" = 'ORDER'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT wod.*
 * FROM "WorkOrderDeposit" wod
 *        INNER JOIN "ShopifyOrderLineItem" soli ON "shopifyOrderLineItemId" = soli."lineItemId"
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 * WHERE so."fullyPaid" = TRUE
 *   AND wod."workOrderId" = :workOrderId!
 *   AND so."orderType" = 'ORDER'
 * ```
 */
export const getPaidDeposits = new PreparedQuery<IGetPaidDepositsParams,IGetPaidDepositsResult>(getPaidDepositsIR);


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

const getAppliedDiscountsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":784,"b":796}]}],"statement":"SELECT DISTINCT sod.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" wfplc ON wo.id = wfplc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" whlc ON wo.id = whlc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderDeposit\" wod ON wo.id = wod.\"workOrderId\"\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR wfplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR whlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR wod.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       INNER JOIN \"ShopifyOrderDiscount\" sod ON sod.\"orderId\" = so.\"orderId\"\nWHERE wo.id = :workOrderId!\n  AND so.\"orderType\" = 'ORDER'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT sod.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge" wfplc ON wo.id = wfplc."workOrderId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge" whlc ON wo.id = whlc."workOrderId"
 *        LEFT JOIN "WorkOrderDeposit" wod ON wo.id = wod."workOrderId"
 *        INNER JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR wfplc."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR whlc."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR wod."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
 * WHERE wo.id = :workOrderId!
 *   AND so."orderType" = 'ORDER'
 * ```
 */
export const getAppliedDiscounts = new PreparedQuery<IGetAppliedDiscountsParams,IGetAppliedDiscountsResult>(getAppliedDiscountsIR);



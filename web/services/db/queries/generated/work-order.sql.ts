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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"derivedFromOrderId":true,"note":true,"discountAmount":true,"discountType":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":165,"b":170}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":188}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":191,"b":199}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":213}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":234}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":237,"b":242}]},{"name":"discountAmount","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":259}]},{"name":"discountType","required":false,"transform":{"type":"scalar"},"locs":[{"a":262,"b":274}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"derivedFromOrderId\", note, \"discountAmount\",\n                         \"discountType\")\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :discountAmount, :discountType)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status               = EXCLUDED.status,\n                                           \"dueDate\"            = EXCLUDED.\"dueDate\",\n                                           \"customerId\"         = EXCLUDED.\"customerId\",\n                                           \"derivedFromOrderId\" = EXCLUDED.\"derivedFromOrderId\",\n                                           note                 = EXCLUDED.note,\n                                           \"discountAmount\"     = EXCLUDED.\"discountAmount\",\n                                           \"discountType\"       = EXCLUDED.\"discountType\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note, "discountAmount",
 *                          "discountType")
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!, :discountAmount, :discountType)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
 *                                            "dueDate"            = EXCLUDED."dueDate",
 *                                            "customerId"         = EXCLUDED."customerId",
 *                                            "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
 *                                            note                 = EXCLUDED.note,
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
  allPaid?: boolean | null | void;
  beforeDueDate?: DateOrString | null | void;
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  inverseOrderConditions?: boolean | null | void;
  limit: NumberOrString;
  minimumOrderCount?: number | null | void;
  offset?: NumberOrString | null | void;
  purchaseOrdersFulfilled?: boolean | null | void;
  query?: string | null | void;
  requiredCustomFieldFilters: readonly ({
    key: string | null | void,
    value: string | null | void,
    inverse: boolean
  })[];
  shop: string;
  status?: string | null | void;
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

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"status":true,"afterDueDate":true,"beforeDueDate":true,"query":true,"employeeIds":true,"customerId":true,"minimumOrderCount":true,"allPaid":true,"inverseOrderConditions":true,"purchaseOrdersFulfilled":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":1004,"b":1009}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1038,"b":1044}]},{"name":"afterDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1089,"b":1101}]},{"name":"beforeDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1149,"b":1162}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1214,"b":1219},{"a":1257,"b":1262},{"a":1308,"b":1313},{"a":1351,"b":1356},{"a":1394,"b":1399}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1571,"b":1582},{"a":1589,"b":1600},{"a":1777,"b":1788},{"a":1795,"b":1806}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1850,"b":1860}]},{"name":"minimumOrderCount","required":false,"transform":{"type":"scalar"},"locs":[{"a":2672,"b":2689}]},{"name":"allPaid","required":false,"transform":{"type":"scalar"},"locs":[{"a":2729,"b":2736},{"a":2741,"b":2748}]},{"name":"inverseOrderConditions","required":false,"transform":{"type":"scalar"},"locs":[{"a":2772,"b":2794}]},{"name":"purchaseOrdersFulfilled","required":false,"transform":{"type":"scalar"},"locs":[{"a":2884,"b":2907},{"a":2912,"b":2935}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2971,"b":2977}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2986,"b":2992}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT wo.name\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" wohlc ON wo.id = wohlc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" wofplc ON wo.id = wofplc.\"workOrderId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR wohlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR wofplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       LEFT JOIN \"ShopifyOrder\" so ON (\n  so.\"orderType\" = 'ORDER' AND\n  soli.\"orderId\" = so.\"orderId\"\n  )\nLEFT JOIN \"PurchaseOrderLineItem\" poli ON soli.\"lineItemId\" = poli.\"shopifyOrderLineItemId\"\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND wo.\"dueDate\" >= COALESCE(:afterDueDate, wo.\"dueDate\")\n  AND wo.\"dueDate\" <= COALESCE(:beforeDueDate, wo.\"dueDate\")\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderHourlyLabourCharge\" hl\n              WHERE hl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderFixedPriceLabourCharge\" fpl\n              WHERE fpl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          ((filter.key IS NOT NULL OR wocf.key IS NOT NULL)) AND\n                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"WorkOrderCustomField\" wocf\n                                    ON (wocf.\"workOrderId\" = wo.id AND\n                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nGROUP BY wo.id\nHAVING (COUNT(DISTINCT so.\"orderId\") >= COALESCE(:minimumOrderCount, 0)\n  AND (BOOL_AND(so.\"fullyPaid\") = :allPaid OR :allPaid IS NULL)) != COALESCE(:inverseOrderConditions, FALSE)\nAND (SUM(poli.\"availableQuantity\") IS NOT DISTINCT FROM SUM(poli.\"quantity\")) = :purchaseOrdersFulfilled OR :purchaseOrdersFulfilled IS NULL\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
 *                               FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
 * SELECT wo.name
 * FROM "WorkOrder" wo
 *        LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge" wohlc ON wo.id = wohlc."workOrderId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge" wofplc ON wo.id = wofplc."workOrderId"
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR wohlc."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR wofplc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        LEFT JOIN "ShopifyOrder" so ON (
 *   so."orderType" = 'ORDER' AND
 *   soli."orderId" = so."orderId"
 *   )
 * LEFT JOIN "PurchaseOrderLineItem" poli ON soli."lineItemId" = poli."shopifyOrderLineItemId"
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
 *                           ((filter.key IS NOT NULL OR wocf.key IS NOT NULL)) AND
 *                           (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=
 *                           filter.inverse
 *                    FROM "CustomFieldFilters" filter
 *                           LEFT JOIN "WorkOrderCustomField" wocf
 *                                     ON (wocf."workOrderId" = wo.id AND
 *                                         wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)
 *              GROUP BY row) b(row, match))
 * GROUP BY wo.id
 * HAVING (COUNT(DISTINCT so."orderId") >= COALESCE(:minimumOrderCount, 0)
 *   AND (BOOL_AND(so."fullyPaid") = :allPaid OR :allPaid IS NULL)) != COALESCE(:inverseOrderConditions, FALSE)
 * AND (SUM(poli."availableQuantity") IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled OR :purchaseOrdersFulfilled IS NULL
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


/** 'GetUnlinkedItems' parameters type */
export interface IGetUnlinkedItemsParams {
  workOrderId: number;
}

/** 'GetUnlinkedItems' return type */
export interface IGetUnlinkedItemsResult {
  absorbCharges: boolean;
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
  hoursLocked: boolean;
  name: string;
  rate: string;
  rateLocked: boolean;
  removeLocked: boolean;
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

const getUnlinkedHourlyLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":78}]}],"statement":"SELECT *\nFROM \"WorkOrderHourlyLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!\n  AND \"shopifyOrderLineItemId\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderHourlyLabourCharge"
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
  amountLocked: boolean;
  createdAt: Date;
  employeeId: string | null;
  name: string;
  removeLocked: boolean;
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

const getUnlinkedFixedPriceLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]}],"statement":"SELECT *\nFROM \"WorkOrderFixedPriceLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!\n  AND \"shopifyOrderLineItemId\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderFixedPriceLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 *   AND "shopifyOrderLineItemId" IS NULL
 * ```
 */
export const getUnlinkedFixedPriceLabourCharges = new PreparedQuery<IGetUnlinkedFixedPriceLabourChargesParams,IGetUnlinkedFixedPriceLabourChargesResult>(getUnlinkedFixedPriceLabourChargesIR);


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

const getItemsByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":44,"b":50}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":86}]}],"statement":"SELECT *\nFROM \"WorkOrderItem\"\nWHERE uuid in :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderItem"
 * WHERE uuid in :uuids!
 *   AND "workOrderId" = :workOrderId!
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

const setLineItemShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":77}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":97}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":133}]}],"statement":"UPDATE \"WorkOrderItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setLineItemShopifyOrderLineItemId = new PreparedQuery<ISetLineItemShopifyOrderLineItemIdParams,ISetLineItemShopifyOrderLineItemIdResult>(setLineItemShopifyOrderLineItemIdIR);


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



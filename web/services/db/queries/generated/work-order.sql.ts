/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'Upsert' parameters type */
export interface IUpsertParams {
  companyContactId?: string | null | void;
  companyId?: string | null | void;
  companyLocationId?: string | null | void;
  customerId: string;
  derivedFromOrderId?: string | null | void;
  discountAmount?: string | null | void;
  discountType?: DiscountType | null | void;
  dueDate: DateOrString;
  internalNote: string;
  locationId: string;
  name: string;
  note: string;
  paymentFixedDueDate?: DateOrString | null | void;
  paymentTermsTemplateId?: string | null | void;
  shop: string;
  staffMemberId: string;
  status: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  companyContactId: string | null;
  companyId: string | null;
  companyLocationId: string | null;
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
  locationId: string | null;
  name: string;
  note: string;
  paymentFixedDueDate: Date | null;
  paymentTermsTemplateId: string | null;
  shop: string;
  staffMemberId: string | null;
  status: string;
  updatedAt: Date;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"companyId":true,"companyLocationId":true,"companyContactId":true,"derivedFromOrderId":true,"note":true,"internalNote":true,"discountAmount":true,"discountType":true,"paymentTermsTemplateId":true,"paymentFixedDueDate":true,"locationId":true,"staffMemberId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":465,"b":470}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":473,"b":478}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":481,"b":488}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":491,"b":499}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":502,"b":513}]},{"name":"companyId","required":false,"transform":{"type":"scalar"},"locs":[{"a":516,"b":525}]},{"name":"companyLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":528,"b":545}]},{"name":"companyContactId","required":false,"transform":{"type":"scalar"},"locs":[{"a":548,"b":564}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":575,"b":593}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":596,"b":601}]},{"name":"internalNote","required":true,"transform":{"type":"scalar"},"locs":[{"a":612,"b":625}]},{"name":"discountAmount","required":false,"transform":{"type":"scalar"},"locs":[{"a":636,"b":650}]},{"name":"discountType","required":false,"transform":{"type":"scalar"},"locs":[{"a":661,"b":673}]},{"name":"paymentTermsTemplateId","required":false,"transform":{"type":"scalar"},"locs":[{"a":684,"b":706}]},{"name":"paymentFixedDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":717,"b":736}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":739,"b":750}]},{"name":"staffMemberId","required":true,"transform":{"type":"scalar"},"locs":[{"a":753,"b":767}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"companyId\", \"companyLocationId\",\n                         \"companyContactId\",\n                         \"derivedFromOrderId\", note,\n                         \"internalNote\",\n                         \"discountAmount\",\n                         \"discountType\",\n                         \"paymentTermsTemplateId\",\n                         \"paymentFixedDueDate\", \"locationId\", \"staffMemberId\")\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :companyId, :companyLocationId, :companyContactId,\n        :derivedFromOrderId, :note!,\n        :internalNote!,\n        :discountAmount,\n        :discountType,\n        :paymentTermsTemplateId,\n        :paymentFixedDueDate, :locationId!, :staffMemberId!)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status                   = EXCLUDED.status,\n                                           \"dueDate\"                = EXCLUDED.\"dueDate\",\n                                           \"customerId\"             = EXCLUDED.\"customerId\",\n                                           \"companyId\"              = EXCLUDED.\"companyId\",\n                                           \"companyLocationId\"      = EXCLUDED.\"companyLocationId\",\n                                           \"companyContactId\"       = EXCLUDED.\"companyContactId\",\n                                           \"derivedFromOrderId\"     = EXCLUDED.\"derivedFromOrderId\",\n                                           note                     = EXCLUDED.note,\n                                           \"internalNote\"           = EXCLUDED.\"internalNote\",\n                                           \"discountAmount\"         = EXCLUDED.\"discountAmount\",\n                                           \"discountType\"           = EXCLUDED.\"discountType\",\n                                           \"paymentTermsTemplateId\" = EXCLUDED.\"paymentTermsTemplateId\",\n                                           \"paymentFixedDueDate\"    = EXCLUDED.\"paymentFixedDueDate\",\n                                           \"locationId\"             = EXCLUDED.\"locationId\",\n                                           \"staffMemberId\"          = EXCLUDED.\"staffMemberId\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "companyId", "companyLocationId",
 *                          "companyContactId",
 *                          "derivedFromOrderId", note,
 *                          "internalNote",
 *                          "discountAmount",
 *                          "discountType",
 *                          "paymentTermsTemplateId",
 *                          "paymentFixedDueDate", "locationId", "staffMemberId")
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :companyId, :companyLocationId, :companyContactId,
 *         :derivedFromOrderId, :note!,
 *         :internalNote!,
 *         :discountAmount,
 *         :discountType,
 *         :paymentTermsTemplateId,
 *         :paymentFixedDueDate, :locationId!, :staffMemberId!)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status                   = EXCLUDED.status,
 *                                            "dueDate"                = EXCLUDED."dueDate",
 *                                            "customerId"             = EXCLUDED."customerId",
 *                                            "companyId"              = EXCLUDED."companyId",
 *                                            "companyLocationId"      = EXCLUDED."companyLocationId",
 *                                            "companyContactId"       = EXCLUDED."companyContactId",
 *                                            "derivedFromOrderId"     = EXCLUDED."derivedFromOrderId",
 *                                            note                     = EXCLUDED.note,
 *                                            "internalNote"           = EXCLUDED."internalNote",
 *                                            "discountAmount"         = EXCLUDED."discountAmount",
 *                                            "discountType"           = EXCLUDED."discountType",
 *                                            "paymentTermsTemplateId" = EXCLUDED."paymentTermsTemplateId",
 *                                            "paymentFixedDueDate"    = EXCLUDED."paymentFixedDueDate",
 *                                            "locationId"             = EXCLUDED."locationId",
 *                                            "staffMemberId"          = EXCLUDED."staffMemberId"
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

const updateDiscountIR: any = {"usedParamSet":{"discountAmount":true,"discountType":true,"id":true},"params":[{"name":"discountAmount","required":false,"transform":{"type":"scalar"},"locs":[{"a":42,"b":56}]},{"name":"discountType","required":false,"transform":{"type":"scalar"},"locs":[{"a":82,"b":94}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":110}]}],"statement":"UPDATE \"WorkOrder\"\nSET \"discountAmount\" = :discountAmount,\n    \"discountType\"   = :discountType\nWHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrder"
 * SET "discountAmount" = :discountAmount,
 *     "discountType"   = :discountType
 * WHERE id = :id!
 * ```
 */
export const updateDiscount = new PreparedQuery<IUpdateDiscountParams,IUpdateDiscountResult>(updateDiscountIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  afterDueDate?: DateOrString | null | void;
  beforeDueDate?: DateOrString | null | void;
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  fullyPaid: boolean;
  inverseOrderConditions: boolean;
  limit: NumberOrString;
  locationIds?: stringArray | null | void;
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
  staffMemberId?: string | null | void;
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

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"status":true,"afterDueDate":true,"beforeDueDate":true,"locationIds":true,"staffMemberId":true,"query":true,"employeeIds":true,"customerId":true,"unpaid":true,"partiallyPaid":true,"fullyPaid":true,"inverseOrderConditions":true,"purchaseOrdersFulfilled":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":896,"b":901}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":930,"b":936}]},{"name":"afterDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":981,"b":993}]},{"name":"beforeDueDate","required":false,"transform":{"type":"scalar"},"locs":[{"a":1041,"b":1054}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1113,"b":1124},{"a":1189,"b":1200}]},{"name":"staffMemberId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1280,"b":1293}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1351,"b":1356},{"a":1394,"b":1399},{"a":1445,"b":1450},{"a":1488,"b":1493},{"a":1531,"b":1536}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1705,"b":1716},{"a":1723,"b":1734}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1778,"b":1788}]},{"name":"unpaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2596,"b":2603}]},{"name":"partiallyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2730,"b":2744}]},{"name":"fullyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":2810,"b":2820}]},{"name":"inverseOrderConditions","required":true,"transform":{"type":"scalar"},"locs":[{"a":2837,"b":2860}]},{"name":"purchaseOrdersFulfilled","required":false,"transform":{"type":"scalar"},"locs":[{"a":3107,"b":3130},{"a":3137,"b":3160}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3197,"b":3203}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":3212,"b":3218}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT wo.name\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\n\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderCharge\" woc ON wo.id = woc.\"workOrderId\"\n\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\" OR\n  woc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"SpecialOrderLineItem\" spoli on soli.\"lineItemId\" = spoli.\"shopifyOrderLineItemId\"\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON poli.\"specialOrderLineItemId\" = spoli.id\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND wo.\"dueDate\" >= COALESCE(:afterDueDate, wo.\"dueDate\")\n  AND wo.\"dueDate\" <= COALESCE(:beforeDueDate, wo.\"dueDate\")\n  AND (\n  wo.\"locationId\" = ANY (COALESCE(:locationIds, ARRAY [wo.\"locationId\"]))\n    OR (wo.\"locationId\" IS NULL AND :locationIds :: text[] IS NULL)\n  )\n  AND wo.\"staffMemberId\" IS NOT DISTINCT FROM COALESCE(:staffMemberId, wo.\"staffMemberId\")\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderCharge\" c\n              WHERE c.\"workOrderId\" = wo.id\n                AND c.data ->> 'employeeId' = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE wocf.value, wocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"WorkOrderCustomField\" wocf\n                                    ON (wocf.\"workOrderId\" = wo.id AND\n                                        wocf.key ILIKE COALESCE(filter.key, wocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nGROUP BY wo.id\nHAVING (\n         (NOT COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) OR NOT :unpaid!) AND\n         ((COALESCE(BOOL_OR(so.\"fullyPaid\"), FALSE) AND NOT COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE)) OR\n          NOT :partiallyPaid!) AND\n         (COALESCE(BOOL_AND(so.\"fullyPaid\"), FALSE) OR NOT :fullyPaid!)\n         ) != :inverseOrderConditions!\n   AND ((SUM((SELECT r.quantity\n              FROM \"PurchaseOrderReceiptLineItem\" r\n              WHERE r.\"purchaseOrderId\" = poli.\"purchaseOrderId\"\n                AND r.\"lineItemUuid\" = poli.uuid)) IS NOT DISTINCT FROM SUM(poli.\"quantity\")) = :purchaseOrdersFulfilled\n  OR :purchaseOrdersFulfilled IS NULL)\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

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
 *        LEFT JOIN "WorkOrderCharge" woc ON wo.id = woc."workOrderId"
 * 
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId" OR
 *   woc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        LEFT JOIN "SpecialOrderLineItem" spoli on soli."lineItemId" = spoli."shopifyOrderLineItemId"
 *        LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
 * WHERE wo.shop = :shop!
 *   AND wo.status = COALESCE(:status, wo.status)
 *   AND wo."dueDate" >= COALESCE(:afterDueDate, wo."dueDate")
 *   AND wo."dueDate" <= COALESCE(:beforeDueDate, wo."dueDate")
 *   AND (
 *   wo."locationId" = ANY (COALESCE(:locationIds, ARRAY [wo."locationId"]))
 *     OR (wo."locationId" IS NULL AND :locationIds :: text[] IS NULL)
 *   )
 *   AND wo."staffMemberId" IS NOT DISTINCT FROM COALESCE(:staffMemberId, wo."staffMemberId")
 *   AND (
 *   wo.status ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *     OR c."displayName" ILIKE COALESCE(:query, '%')
 *     OR c.phone ILIKE COALESCE(:query, '%')
 *     OR c.email ILIKE COALESCE(:query, '%')
 *   )
 *   AND (EXISTS(SELECT *
 *               FROM "WorkOrderCharge" c
 *               WHERE c."workOrderId" = wo.id
 *                 AND c.data ->> 'employeeId' = ANY (:employeeIds)) OR :employeeIds IS NULL)
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
 *    AND ((SUM((SELECT r.quantity
 *               FROM "PurchaseOrderReceiptLineItem" r
 *               WHERE r."purchaseOrderId" = poli."purchaseOrderId"
 *                 AND r."lineItemUuid" = poli.uuid)) IS NOT DISTINCT FROM SUM(poli."quantity")) = :purchaseOrdersFulfilled
 *   OR :purchaseOrdersFulfilled IS NULL)
 * ORDER BY wo.id DESC
 * LIMIT :limit! OFFSET :offset
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


/** 'GetById' parameters type */
export interface IGetByIdParams {
  id: number;
}

/** 'GetById' return type */
export interface IGetByIdResult {
  companyContactId: string | null;
  companyId: string | null;
  companyLocationId: string | null;
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
  locationId: string | null;
  name: string;
  note: string;
  paymentFixedDueDate: Date | null;
  paymentTermsTemplateId: string | null;
  shop: string;
  staffMemberId: string | null;
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
  createdAt: Date;
  data: Json;
  productVariantSerialId: number | null;
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
  createdAt: Date;
  data: Json;
  productVariantSerialId: number | null;
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

const getAppliedDiscountsIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":498,"b":510}]}],"statement":"SELECT DISTINCT sod.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderCharge\" woc ON wo.id = woc.\"workOrderId\"\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR woc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       INNER JOIN \"ShopifyOrderDiscount\" sod ON sod.\"orderId\" = so.\"orderId\"\nWHERE wo.id = :workOrderId!\n  AND so.\"orderType\" = 'ORDER'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT sod.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderCharge" woc ON wo.id = woc."workOrderId"
 *        INNER JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR woc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        INNER JOIN "ShopifyOrderDiscount" sod ON sod."orderId" = so."orderId"
 * WHERE wo.id = :workOrderId!
 *   AND so."orderType" = 'ORDER'
 * ```
 */
export const getAppliedDiscounts = new PreparedQuery<IGetAppliedDiscountsParams,IGetAppliedDiscountsResult>(getAppliedDiscountsIR);



/** Types generated for queries found in "services/db/queries/purchase-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
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
  id: number;
  name: string;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":1139,"b":1144}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1177,"b":1183}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1248,"b":1258}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1310,"b":1315},{"a":1353,"b":1358},{"a":1404,"b":1409},{"a":1455,"b":1460},{"a":1497,"b":1502},{"a":1540,"b":1545},{"a":1587,"b":1592},{"a":1636,"b":1641},{"a":1679,"b":1684},{"a":1721,"b":1726},{"a":1767,"b":1772},{"a":1812,"b":1817},{"a":1854,"b":1859}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2607,"b":2613}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2622,"b":2628}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON po.id = poli.\"purchaseOrderId\"\n       LEFT JOIN \"ProductVariant\" pv ON poli.\"productVariantId\" = pv.\"productVariantId\"\n       LEFT JOIN \"Product\" p ON pv.\"productId\" = p.\"productId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\n       LEFT JOIN \"Employee\" e ON poea.\"employeeId\" = e.\"staffMemberId\"\n       LEFT JOIN \"Location\" l ON po.\"locationId\" = l.\"locationId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON poli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"Customer\" c ON so.\"customerId\" = c.\"customerId\"\n       LEFT JOIN \"WorkOrderItem\" woi ON soli.\"lineItemId\" = woi.\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrder\" wo ON woi.\"workOrderId\" = wo.\"id\"\nWHERE po.shop = :shop!\n  AND po.status ILIKE COALESCE(:status, po.status)\n  AND c.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, c.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR l.name ILIKE COALESCE(:query, '%')\n    OR so.name ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR pv.sku ILIKE COALESCE(:query, '%')\n    OR pv.\"title\" ILIKE COALESCE(:query, '%')\n    OR p.\"title\" ILIKE COALESCE(:query, '%')\n    OR e.name ILIKE COALESCE(:query, '%')\n  )\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"PurchaseOrderCustomField\" pocf\n                                    ON (pocf.\"purchaseOrderId\" = po.id AND\n                                        pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
 *                               FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
 * SELECT DISTINCT po.id, po.name
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
 *        LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
 *        LEFT JOIN "Product" p ON pv."productId" = p."productId"
 *        LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
 *        LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
 *        LEFT JOIN "Location" l ON po."locationId" = l."locationId"
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
 *        LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
 *        LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
 *        LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
 * WHERE po.shop = :shop!
 *   AND po.status ILIKE COALESCE(:status, po.status)
 *   AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR po."vendorName" ILIKE COALESCE(:query, '%')
 *     OR c."displayName" ILIKE COALESCE(:query, '%')
 *     OR l.name ILIKE COALESCE(:query, '%')
 *     OR so.name ILIKE COALESCE(:query, '%')
 *     OR po."shipTo" ILIKE COALESCE(:query, '%')
 *     OR po."shipFrom" ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *     OR pv.sku ILIKE COALESCE(:query, '%')
 *     OR pv."title" ILIKE COALESCE(:query, '%')
 *     OR p."title" ILIKE COALESCE(:query, '%')
 *     OR e.name ILIKE COALESCE(:query, '%')
 *   )
 *   AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))
 *        FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match
 *              FROM (SELECT filter.row,
 *                           (filter.key IS NOT NULL) AND
 *                           (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=
 *                           filter.inverse
 *                    FROM "CustomFieldFilters" filter
 *                           LEFT JOIN "PurchaseOrderCustomField" pocf
 *                                     ON (pocf."purchaseOrderId" = po.id AND
 *                                         pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)
 *              GROUP BY row) b(row, match))
 * ORDER BY po.id DESC
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
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  paid: string | null;
  shipFrom: string;
  shipping: string | null;
  shipTo: string;
  shop: string;
  status: string;
  tax: string | null;
  updatedAt: Date;
  vendorName: string | null;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"id":true,"shop":true,"name":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":52}]},{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":81,"b":85}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":120}]}],"statement":"SELECT *\nFROM \"PurchaseOrder\"\nWHERE id = COALESCE(:id, id)\n  AND shop = COALESCE(:shop, shop)\n  AND name = COALESCE(:name, name)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrder"
 * WHERE id = COALESCE(:id, id)
 *   AND shop = COALESCE(:shop, shop)
 *   AND name = COALESCE(:name, name)
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  purchaseOrderIds: readonly (number)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  paid: string | null;
  shipFrom: string;
  shipping: string | null;
  shipTo: string;
  shop: string;
  status: string;
  tax: string | null;
  updatedAt: Date;
  vendorName: string | null;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"purchaseOrderIds":true},"params":[{"name":"purchaseOrderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":42,"b":59}]}],"statement":"SELECT *\nFROM \"PurchaseOrder\"\nWHERE id IN :purchaseOrderIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrder"
 * WHERE id IN :purchaseOrderIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  deposited?: string | null | void;
  discount?: string | null | void;
  locationId?: string | null | void;
  name: string;
  note: string;
  paid?: string | null | void;
  shipFrom: string;
  shipping?: string | null | void;
  shipTo: string;
  shop: string;
  status: string;
  tax?: string | null | void;
  vendorName?: string | null | void;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  id: number;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"locationId":true,"discount":true,"tax":true,"shipping":true,"deposited":true,"paid":true,"name":true,"status":true,"shipFrom":true,"shipTo":true,"note":true,"vendorName":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":184,"b":189}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":202}]},{"name":"discount","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":213}]},{"name":"tax","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":219}]},{"name":"shipping","required":false,"transform":{"type":"scalar"},"locs":[{"a":222,"b":230}]},{"name":"deposited","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":242}]},{"name":"paid","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":249}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":257}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":267}]},{"name":"shipFrom","required":true,"transform":{"type":"scalar"},"locs":[{"a":270,"b":279}]},{"name":"shipTo","required":true,"transform":{"type":"scalar"},"locs":[{"a":282,"b":289}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":300,"b":305}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":318}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, \"locationId\", discount, tax, shipping, deposited, paid, name, status, \"shipFrom\",\n                             \"shipTo\", note, \"vendorName\")\nVALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,\n        :note!, :vendorName)\nON CONFLICT (shop, name) DO UPDATE\n  SET \"shipFrom\"   = EXCLUDED.\"shipFrom\",\n      \"shipTo\"     = EXCLUDED.\"shipTo\",\n      \"locationId\" = EXCLUDED.\"locationId\",\n      note         = EXCLUDED.note,\n      discount     = EXCLUDED.discount,\n      tax          = EXCLUDED.tax,\n      shipping     = EXCLUDED.shipping,\n      deposited    = EXCLUDED.deposited,\n      paid         = EXCLUDED.paid,\n      status       = EXCLUDED.status,\n      \"vendorName\" = EXCLUDED.\"vendorName\"\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, "locationId", discount, tax, shipping, deposited, paid, name, status, "shipFrom",
 *                              "shipTo", note, "vendorName")
 * VALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,
 *         :note!, :vendorName)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET "shipFrom"   = EXCLUDED."shipFrom",
 *       "shipTo"     = EXCLUDED."shipTo",
 *       "locationId" = EXCLUDED."locationId",
 *       note         = EXCLUDED.note,
 *       discount     = EXCLUDED.discount,
 *       tax          = EXCLUDED.tax,
 *       shipping     = EXCLUDED.shipping,
 *       deposited    = EXCLUDED.deposited,
 *       paid         = EXCLUDED.paid,
 *       status       = EXCLUDED.status,
 *       "vendorName" = EXCLUDED."vendorName"
 * RETURNING id
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetLineItems' parameters type */
export interface IGetLineItemsParams {
  purchaseOrderId: number;
}

/** 'GetLineItems' return type */
export interface IGetLineItemsResult {
  availableQuantity: number;
  createdAt: Date;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
  uuid: string;
}

/** 'GetLineItems' query type */
export interface IGetLineItemsQuery {
  params: IGetLineItemsParams;
  result: IGetLineItemsResult;
}

const getLineItemsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":80}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getLineItems = new PreparedQuery<IGetLineItemsParams,IGetLineItemsResult>(getLineItemsIR);


/** 'GetLineItemsByUuids' parameters type */
export interface IGetLineItemsByUuidsParams {
  purchaseOrderId: number;
  uuids: readonly (string)[];
}

/** 'GetLineItemsByUuids' return type */
export interface IGetLineItemsByUuidsResult {
  availableQuantity: number;
  createdAt: Date;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
  uuid: string;
}

/** 'GetLineItemsByUuids' query type */
export interface IGetLineItemsByUuidsQuery {
  params: IGetLineItemsByUuidsParams;
  result: IGetLineItemsByUuidsResult;
}

const getLineItemsByUuidsIR: any = {"usedParamSet":{"uuids":true,"purchaseOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":52,"b":58}]},{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":102}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE uuid IN :uuids!\n  AND \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE uuid IN :uuids!
 *   AND "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getLineItemsByUuids = new PreparedQuery<IGetLineItemsByUuidsParams,IGetLineItemsByUuidsResult>(getLineItemsByUuidsIR);


/** 'GetCustomFields' parameters type */
export interface IGetCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'GetCustomFields' return type */
export interface IGetCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  purchaseOrderId: number;
  updatedAt: Date;
  value: string;
}

/** 'GetCustomFields' query type */
export interface IGetCustomFieldsQuery {
  params: IGetCustomFieldsParams;
  result: IGetCustomFieldsResult;
}

const getCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":83}]}],"statement":"SELECT *\nFROM \"PurchaseOrderCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getCustomFields = new PreparedQuery<IGetCustomFieldsParams,IGetCustomFieldsResult>(getCustomFieldsIR);


/** 'GetCommonCustomFieldsForShop' parameters type */
export interface IGetCommonCustomFieldsForShopParams {
  limit: NumberOrString;
  offset: NumberOrString;
  query?: string | null | void;
  shop: string;
}

/** 'GetCommonCustomFieldsForShop' return type */
export interface IGetCommonCustomFieldsForShopResult {
  count: string | null;
  key: string;
}

/** 'GetCommonCustomFieldsForShop' query type */
export interface IGetCommonCustomFieldsForShopQuery {
  params: IGetCommonCustomFieldsForShopParams;
  result: IGetCommonCustomFieldsForShopResult;
}

const getCommonCustomFieldsForShopIR: any = {"usedParamSet":{"shop":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":149}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":181}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":232}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":241,"b":248}]}],"statement":"SELECT DISTINCT key, COUNT(*)\nFROM \"PurchaseOrderCustomField\"\n       INNER JOIN \"PurchaseOrder\" po ON \"purchaseOrderId\" = po.id\nWHERE po.shop = :shop!\n  AND key ILIKE COALESCE(:query, '%')\nGROUP BY key\nORDER BY COUNT(*)\nLIMIT :limit! OFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT key, COUNT(*)
 * FROM "PurchaseOrderCustomField"
 *        INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
 * WHERE po.shop = :shop!
 *   AND key ILIKE COALESCE(:query, '%')
 * GROUP BY key
 * ORDER BY COUNT(*)
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getCommonCustomFieldsForShop = new PreparedQuery<IGetCommonCustomFieldsForShopParams,IGetCommonCustomFieldsForShopResult>(getCommonCustomFieldsForShopIR);


/** 'InsertLineItemCustomField' parameters type */
export interface IInsertLineItemCustomFieldParams {
  key: string;
  purchaseOrderId: number;
  purchaseOrderLineItemUuid: string;
  value: string;
}

/** 'InsertLineItemCustomField' return type */
export type IInsertLineItemCustomFieldResult = void;

/** 'InsertLineItemCustomField' query type */
export interface IInsertLineItemCustomFieldQuery {
  params: IInsertLineItemCustomFieldParams;
  result: IInsertLineItemCustomFieldResult;
}

const insertLineItemCustomFieldIR: any = {"usedParamSet":{"purchaseOrderId":true,"purchaseOrderLineItemUuid":true,"key":true,"value":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":132}]},{"name":"purchaseOrderLineItemUuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":161}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":164,"b":168}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":171,"b":177}]}],"statement":"INSERT INTO \"PurchaseOrderLineItemCustomField\" (\"purchaseOrderId\", \"purchaseOrderLineItemUuid\", key, value)\nVALUES (:purchaseOrderId!, :purchaseOrderLineItemUuid!, :key!, :value!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderLineItemCustomField" ("purchaseOrderId", "purchaseOrderLineItemUuid", key, value)
 * VALUES (:purchaseOrderId!, :purchaseOrderLineItemUuid!, :key!, :value!)
 * ```
 */
export const insertLineItemCustomField = new PreparedQuery<IInsertLineItemCustomFieldParams,IInsertLineItemCustomFieldResult>(insertLineItemCustomFieldIR);


/** 'RemoveLineItemCustomFields' parameters type */
export interface IRemoveLineItemCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'RemoveLineItemCustomFields' return type */
export type IRemoveLineItemCustomFieldsResult = void;

/** 'RemoveLineItemCustomFields' query type */
export interface IRemoveLineItemCustomFieldsQuery {
  params: IRemoveLineItemCustomFieldsParams;
  result: IRemoveLineItemCustomFieldsResult;
}

const removeLineItemCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":89}]}],"statement":"DELETE\nFROM \"PurchaseOrderLineItemCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderLineItemCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeLineItemCustomFields = new PreparedQuery<IRemoveLineItemCustomFieldsParams,IRemoveLineItemCustomFieldsResult>(removeLineItemCustomFieldsIR);


/** 'GetLineItemCustomFields' parameters type */
export interface IGetLineItemCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'GetLineItemCustomFields' return type */
export interface IGetLineItemCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  purchaseOrderId: number;
  purchaseOrderLineItemUuid: string;
  updatedAt: Date;
  value: string;
}

/** 'GetLineItemCustomFields' query type */
export interface IGetLineItemCustomFieldsQuery {
  params: IGetLineItemCustomFieldsParams;
  result: IGetLineItemCustomFieldsResult;
}

const getLineItemCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":91}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItemCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItemCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getLineItemCustomFields = new PreparedQuery<IGetLineItemCustomFieldsParams,IGetLineItemCustomFieldsResult>(getLineItemCustomFieldsIR);


/** 'GetAssignedEmployees' parameters type */
export interface IGetAssignedEmployeesParams {
  purchaseOrderId: number;
}

/** 'GetAssignedEmployees' return type */
export interface IGetAssignedEmployeesResult {
  createdAt: Date;
  employeeId: string;
  id: number;
  purchaseOrderId: number;
  updatedAt: Date;
}

/** 'GetAssignedEmployees' query type */
export interface IGetAssignedEmployeesQuery {
  params: IGetAssignedEmployeesParams;
  result: IGetAssignedEmployeesResult;
}

const getAssignedEmployeesIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":90}]}],"statement":"SELECT *\nFROM \"PurchaseOrderEmployeeAssignment\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderEmployeeAssignment"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getAssignedEmployees = new PreparedQuery<IGetAssignedEmployeesParams,IGetAssignedEmployeesResult>(getAssignedEmployeesIR);


/** 'RemoveLineItems' parameters type */
export interface IRemoveLineItemsParams {
  purchaseOrderId: number;
}

/** 'RemoveLineItems' return type */
export type IRemoveLineItemsResult = void;

/** 'RemoveLineItems' query type */
export interface IRemoveLineItemsQuery {
  params: IRemoveLineItemsParams;
  result: IRemoveLineItemsResult;
}

const removeLineItemsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":78}]}],"statement":"DELETE\nFROM \"PurchaseOrderLineItem\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderLineItem"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeLineItems = new PreparedQuery<IRemoveLineItemsParams,IRemoveLineItemsResult>(removeLineItemsIR);


/** 'RemoveLineItem' parameters type */
export interface IRemoveLineItemParams {
  purchaseOrderId: number;
  uuid: string;
}

/** 'RemoveLineItem' return type */
export type IRemoveLineItemResult = void;

/** 'RemoveLineItem' query type */
export interface IRemoveLineItemQuery {
  params: IRemoveLineItemParams;
  result: IRemoveLineItemResult;
}

const removeLineItemIR: any = {"usedParamSet":{"uuid":true,"purchaseOrderId":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":54}]},{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":98}]}],"statement":"DELETE\nFROM \"PurchaseOrderLineItem\"\nWHERE uuid = :uuid!\n  AND \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderLineItem"
 * WHERE uuid = :uuid!
 *   AND "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeLineItem = new PreparedQuery<IRemoveLineItemParams,IRemoveLineItemResult>(removeLineItemIR);


/** 'RemoveCustomFields' parameters type */
export interface IRemoveCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'RemoveCustomFields' return type */
export type IRemoveCustomFieldsResult = void;

/** 'RemoveCustomFields' query type */
export interface IRemoveCustomFieldsQuery {
  params: IRemoveCustomFieldsParams;
  result: IRemoveCustomFieldsResult;
}

const removeCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":81}]}],"statement":"DELETE\nFROM \"PurchaseOrderCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeCustomFields = new PreparedQuery<IRemoveCustomFieldsParams,IRemoveCustomFieldsResult>(removeCustomFieldsIR);


/** 'RemoveAssignedEmployees' parameters type */
export interface IRemoveAssignedEmployeesParams {
  purchaseOrderId: number;
}

/** 'RemoveAssignedEmployees' return type */
export type IRemoveAssignedEmployeesResult = void;

/** 'RemoveAssignedEmployees' query type */
export interface IRemoveAssignedEmployeesQuery {
  params: IRemoveAssignedEmployeesParams;
  result: IRemoveAssignedEmployeesResult;
}

const removeAssignedEmployeesIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":88}]}],"statement":"DELETE\nFROM \"PurchaseOrderEmployeeAssignment\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderEmployeeAssignment"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeAssignedEmployees = new PreparedQuery<IRemoveAssignedEmployeesParams,IRemoveAssignedEmployeesResult>(removeAssignedEmployeesIR);


/** 'UpsertLineItem' parameters type */
export interface IUpsertLineItemParams {
  availableQuantity: number;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId?: string | null | void;
  unitCost: string;
  uuid: string;
}

/** 'UpsertLineItem' return type */
export type IUpsertLineItemResult = void;

/** 'UpsertLineItem' query type */
export interface IUpsertLineItemQuery {
  params: IUpsertLineItemParams;
  result: IUpsertLineItemResult;
}

const upsertLineItemIR: any = {"usedParamSet":{"uuid":true,"purchaseOrderId":true,"productVariantId":true,"shopifyOrderLineItemId":true,"quantity":true,"availableQuantity":true,"unitCost":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":201}]},{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":220}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":240}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":243,"b":265}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":277}]},{"name":"availableQuantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":280,"b":298}]},{"name":"unitCost","required":true,"transform":{"type":"scalar"},"locs":[{"a":309,"b":318}]}],"statement":"INSERT INTO \"PurchaseOrderLineItem\" (uuid, \"purchaseOrderId\", \"productVariantId\", \"shopifyOrderLineItemId\", quantity,\n                                     \"availableQuantity\", \"unitCost\")\nVALUES (:uuid!, :purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,\n        :unitCost!)\nON CONFLICT (\"purchaseOrderId\", uuid)\n  DO UPDATE\n  SET \"productVariantId\"       = EXCLUDED.\"productVariantId\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      quantity                 = EXCLUDED.quantity,\n      \"availableQuantity\"      = EXCLUDED.\"availableQuantity\",\n      \"unitCost\"               = EXCLUDED.\"unitCost\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderLineItem" (uuid, "purchaseOrderId", "productVariantId", "shopifyOrderLineItemId", quantity,
 *                                      "availableQuantity", "unitCost")
 * VALUES (:uuid!, :purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,
 *         :unitCost!)
 * ON CONFLICT ("purchaseOrderId", uuid)
 *   DO UPDATE
 *   SET "productVariantId"       = EXCLUDED."productVariantId",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       quantity                 = EXCLUDED.quantity,
 *       "availableQuantity"      = EXCLUDED."availableQuantity",
 *       "unitCost"               = EXCLUDED."unitCost"
 * ```
 */
export const upsertLineItem = new PreparedQuery<IUpsertLineItemParams,IUpsertLineItemResult>(upsertLineItemIR);


/** 'SetLineItemShopifyOrderLineItemId' parameters type */
export interface ISetLineItemShopifyOrderLineItemIdParams {
  purchaseOrderId: number;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
}

/** 'SetLineItemShopifyOrderLineItemId' return type */
export type ISetLineItemShopifyOrderLineItemIdResult = void;

/** 'SetLineItemShopifyOrderLineItemId' query type */
export interface ISetLineItemShopifyOrderLineItemIdQuery {
  params: ISetLineItemShopifyOrderLineItemIdParams;
  result: ISetLineItemShopifyOrderLineItemIdResult;
}

const setLineItemShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"purchaseOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":84}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":104}]},{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":146}]}],"statement":"UPDATE \"PurchaseOrderLineItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId\nWHERE uuid = :uuid!\nAND \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "PurchaseOrderLineItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId
 * WHERE uuid = :uuid!
 * AND "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const setLineItemShopifyOrderLineItemId = new PreparedQuery<ISetLineItemShopifyOrderLineItemIdParams,ISetLineItemShopifyOrderLineItemIdResult>(setLineItemShopifyOrderLineItemIdIR);


/** 'InsertCustomField' parameters type */
export interface IInsertCustomFieldParams {
  key: string;
  purchaseOrderId: number;
  value: string;
}

/** 'InsertCustomField' return type */
export type IInsertCustomFieldResult = void;

/** 'InsertCustomField' query type */
export interface IInsertCustomFieldQuery {
  params: IInsertCustomFieldParams;
  result: IInsertCustomFieldResult;
}

const insertCustomFieldIR: any = {"usedParamSet":{"purchaseOrderId":true,"key":true,"value":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":79,"b":95}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":102}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":111}]}],"statement":"INSERT INTO \"PurchaseOrderCustomField\" (\"purchaseOrderId\", key, value)\nVALUES (:purchaseOrderId!, :key!, :value!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
 * VALUES (:purchaseOrderId!, :key!, :value!)
 * ```
 */
export const insertCustomField = new PreparedQuery<IInsertCustomFieldParams,IInsertCustomFieldResult>(insertCustomFieldIR);


/** 'InsertAssignedEmployee' parameters type */
export interface IInsertAssignedEmployeeParams {
  employeeId: string;
  purchaseOrderId: number;
}

/** 'InsertAssignedEmployee' return type */
export type IInsertAssignedEmployeeResult = void;

/** 'InsertAssignedEmployee' query type */
export interface IInsertAssignedEmployeeQuery {
  params: IInsertAssignedEmployeeParams;
  result: IInsertAssignedEmployeeResult;
}

const insertAssignedEmployeeIR: any = {"usedParamSet":{"purchaseOrderId":true,"employeeId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":104}]},{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":118}]}],"statement":"INSERT INTO \"PurchaseOrderEmployeeAssignment\" (\"purchaseOrderId\", \"employeeId\")\nVALUES (:purchaseOrderId!, :employeeId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId")
 * VALUES (:purchaseOrderId!, :employeeId!)
 * ```
 */
export const insertAssignedEmployee = new PreparedQuery<IInsertAssignedEmployeeParams,IInsertAssignedEmployeeResult>(insertAssignedEmployeeIR);


/** 'GetProductVariantCostsForShop' parameters type */
export interface IGetProductVariantCostsForShopParams {
  productVariantId: string;
  shop: string;
}

/** 'GetProductVariantCostsForShop' return type */
export interface IGetProductVariantCostsForShopResult {
  quantity: number;
  unitCost: string;
}

/** 'GetProductVariantCostsForShop' query type */
export interface IGetProductVariantCostsForShopQuery {
  params: IGetProductVariantCostsForShopParams;
  result: IGetProductVariantCostsForShopResult;
}

const getProductVariantCostsForShopIR: any = {"usedParamSet":{"shop":true,"productVariantId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":146}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":192}]}],"statement":"SELECT \"unitCost\", \"quantity\"\nFROM \"PurchaseOrderLineItem\"\n       INNER JOIN \"PurchaseOrder\" po ON \"purchaseOrderId\" = po.id\nWHERE po.shop = :shop!\n  AND \"productVariantId\" = :productVariantId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT "unitCost", "quantity"
 * FROM "PurchaseOrderLineItem"
 *        INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
 * WHERE po.shop = :shop!
 *   AND "productVariantId" = :productVariantId!
 * ```
 */
export const getProductVariantCostsForShop = new PreparedQuery<IGetProductVariantCostsForShopParams,IGetProductVariantCostsForShopResult>(getProductVariantCostsForShopIR);


/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' parameters type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
}

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' return type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult {
  availableQuantity: number;
  createdAt: Date;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
  uuid: string;
}

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' query type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdQuery {
  params: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams;
  result: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult;
}

const getPurchaseOrderLineItemsByShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":94}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * ```
 */
export const getPurchaseOrderLineItemsByShopifyOrderLineItemId = new PreparedQuery<IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams,IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult>(getPurchaseOrderLineItemsByShopifyOrderLineItemIdIR);


/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemIds' parameters type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsParams {
  shopifyOrderLineItemIds: readonly (string)[];
}

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemIds' return type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsResult {
  availableQuantity: number;
  createdAt: Date;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
  uuid: string;
}

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemIds' query type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsQuery {
  params: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsParams;
  result: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsResult;
}

const getPurchaseOrderLineItemsByShopifyOrderLineItemIdsIR: any = {"usedParamSet":{"shopifyOrderLineItemIds":true},"params":[{"name":"shopifyOrderLineItemIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":72,"b":96}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"shopifyOrderLineItemId\" IN :shopifyOrderLineItemIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "shopifyOrderLineItemId" IN :shopifyOrderLineItemIds!
 * ```
 */
export const getPurchaseOrderLineItemsByShopifyOrderLineItemIds = new PreparedQuery<IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsParams,IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdsResult>(getPurchaseOrderLineItemsByShopifyOrderLineItemIdsIR);


/** 'GetLinkedPurchaseOrdersByShopifyOrderIds' parameters type */
export interface IGetLinkedPurchaseOrdersByShopifyOrderIdsParams {
  shopifyOrderIds: readonly (string)[];
}

/** 'GetLinkedPurchaseOrdersByShopifyOrderIds' return type */
export interface IGetLinkedPurchaseOrdersByShopifyOrderIdsResult {
  createdAt: Date;
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  paid: string | null;
  shipFrom: string;
  shipping: string | null;
  shipTo: string;
  shop: string;
  status: string;
  tax: string | null;
  updatedAt: Date;
  vendorName: string | null;
}

/** 'GetLinkedPurchaseOrdersByShopifyOrderIds' query type */
export interface IGetLinkedPurchaseOrdersByShopifyOrderIdsQuery {
  params: IGetLinkedPurchaseOrdersByShopifyOrderIdsParams;
  result: IGetLinkedPurchaseOrdersByShopifyOrderIdsResult;
}

const getLinkedPurchaseOrdersByShopifyOrderIdsIR: any = {"usedParamSet":{"shopifyOrderIds":true},"params":[{"name":"shopifyOrderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":301,"b":317}]}],"statement":"SELECT DISTINCT po.*\nFROM \"ShopifyOrder\" so\n       INNER JOIN \"ShopifyOrderLineItem\" soli USING (\"orderId\")\n       INNER JOIN \"PurchaseOrderLineItem\" poli ON poli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       INNER JOIN \"PurchaseOrder\" po ON po.id = poli.\"purchaseOrderId\"\nWHERE so.\"orderId\" in :shopifyOrderIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.*
 * FROM "ShopifyOrder" so
 *        INNER JOIN "ShopifyOrderLineItem" soli USING ("orderId")
 *        INNER JOIN "PurchaseOrderLineItem" poli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
 *        INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
 * WHERE so."orderId" in :shopifyOrderIds!
 * ```
 */
export const getLinkedPurchaseOrdersByShopifyOrderIds = new PreparedQuery<IGetLinkedPurchaseOrdersByShopifyOrderIdsParams,IGetLinkedPurchaseOrdersByShopifyOrderIdsResult>(getLinkedPurchaseOrdersByShopifyOrderIdsIR);



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
  placedDate: Date | null;
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



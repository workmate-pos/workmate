/** Types generated for queries found in "services/db/queries/purchase-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PurchaseOrderType = 'DROPSHIP' | 'NORMAL';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  limit: NumberOrString;
  locationIds?: stringArray | null | void;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  requiredCustomFieldFilters: readonly ({
    key: string | null | void,
    value: string | null | void,
    inverse: boolean
  })[];
  shop: string;
  status?: string | null | void;
  type?: PurchaseOrderType | null | void;
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

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"type":true,"status":true,"customerId":true,"locationIds":true,"query":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":1230,"b":1235}]},{"name":"type","required":false,"transform":{"type":"scalar"},"locs":[{"a":1262,"b":1266}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1309,"b":1315}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1380,"b":1390}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1451,"b":1462},{"a":1527,"b":1538}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1596,"b":1601},{"a":1639,"b":1644},{"a":1690,"b":1695},{"a":1741,"b":1746},{"a":1783,"b":1788},{"a":1826,"b":1831},{"a":1873,"b":1878},{"a":1922,"b":1927},{"a":1965,"b":1970},{"a":2007,"b":2012},{"a":2053,"b":2058},{"a":2098,"b":2103},{"a":2140,"b":2145}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2893,"b":2899}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2908,"b":2914}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON po.id = poli.\"purchaseOrderId\"\n       LEFT JOIN \"SpecialOrderLineItem\" spoli ON poli.\"specialOrderLineItemId\" = spoli.id\n       LEFT JOIN \"ProductVariant\" pv ON poli.\"productVariantId\" = pv.\"productVariantId\"\n       LEFT JOIN \"Product\" p ON pv.\"productId\" = p.\"productId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\n       LEFT JOIN \"Employee\" e ON poea.\"employeeId\" = e.\"staffMemberId\"\n       LEFT JOIN \"Location\" l ON po.\"locationId\" = l.\"locationId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON spoli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"Customer\" c ON so.\"customerId\" = c.\"customerId\"\n       LEFT JOIN \"WorkOrderItem\" woi ON soli.\"lineItemId\" = woi.\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrder\" wo ON woi.\"workOrderId\" = wo.\"id\"\nWHERE po.shop = :shop!\n  AND po.type = COALESCE(:type, po.type)\n  AND po.status ILIKE COALESCE(:status, po.status)\n  AND c.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, c.\"customerId\")\n  AND (\n  po.\"locationId\" = ANY (COALESCE(:locationIds, ARRAY [po.\"locationId\"]))\n    OR (wo.\"locationId\" IS NULL AND :locationIds :: text[] IS NULL)\n  )\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR l.name ILIKE COALESCE(:query, '%')\n    OR so.name ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR pv.sku ILIKE COALESCE(:query, '%')\n    OR pv.\"title\" ILIKE COALESCE(:query, '%')\n    OR p.\"title\" ILIKE COALESCE(:query, '%')\n    OR e.name ILIKE COALESCE(:query, '%')\n  )\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"PurchaseOrderCustomField\" pocf\n                                    ON (pocf.\"purchaseOrderId\" = po.id AND\n                                        pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * WITH "CustomFieldFilters" AS (SELECT row_number() over () as row, key, val, inverse
 *                               FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS "CustomFieldFilters"(key, val, inverse))
 * SELECT DISTINCT po.id, po.name
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
 *        LEFT JOIN "SpecialOrderLineItem" spoli ON poli."specialOrderLineItemId" = spoli.id
 *        LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
 *        LEFT JOIN "Product" p ON pv."productId" = p."productId"
 *        LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
 *        LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
 *        LEFT JOIN "Location" l ON po."locationId" = l."locationId"
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON spoli."shopifyOrderLineItemId" = soli."lineItemId"
 *        LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
 *        LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
 *        LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
 * WHERE po.shop = :shop!
 *   AND po.type = COALESCE(:type, po.type)
 *   AND po.status ILIKE COALESCE(:status, po.status)
 *   AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
 *   AND (
 *   po."locationId" = ANY (COALESCE(:locationIds, ARRAY [po."locationId"]))
 *     OR (wo."locationId" IS NULL AND :locationIds :: text[] IS NULL)
 *   )
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
  type: PurchaseOrderType;
  updatedAt: Date;
  vendorName: string | null;
}

/** 'GetLinkedPurchaseOrdersByShopifyOrderIds' query type */
export interface IGetLinkedPurchaseOrdersByShopifyOrderIdsQuery {
  params: IGetLinkedPurchaseOrdersByShopifyOrderIdsParams;
  result: IGetLinkedPurchaseOrdersByShopifyOrderIdsResult;
}

const getLinkedPurchaseOrdersByShopifyOrderIdsIR: any = {"usedParamSet":{"shopifyOrderIds":true},"params":[{"name":"shopifyOrderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":393,"b":409}]}],"statement":"SELECT DISTINCT po.*\nFROM \"ShopifyOrder\" so\n       INNER JOIN \"ShopifyOrderLineItem\" soli USING (\"orderId\")\n       INNER JOIN \"SpecialOrderLineItem\" spoli ON spoli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       INNER JOIN \"PurchaseOrderLineItem\" poli ON poli.\"specialOrderLineItemId\" = spoli.id\n       INNER JOIN \"PurchaseOrder\" po ON po.id = poli.\"purchaseOrderId\"\nWHERE so.\"orderId\" in :shopifyOrderIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.*
 * FROM "ShopifyOrder" so
 *        INNER JOIN "ShopifyOrderLineItem" soli USING ("orderId")
 *        INNER JOIN "SpecialOrderLineItem" spoli ON spoli."shopifyOrderLineItemId" = soli."lineItemId"
 *        INNER JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
 *        INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
 * WHERE so."orderId" in :shopifyOrderIds!
 * ```
 */
export const getLinkedPurchaseOrdersByShopifyOrderIds = new PreparedQuery<IGetLinkedPurchaseOrdersByShopifyOrderIdsParams,IGetLinkedPurchaseOrdersByShopifyOrderIdsResult>(getLinkedPurchaseOrdersByShopifyOrderIdsIR);



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

const getPageIR: any = {"usedParamSet":{"requiredCustomFieldFilters":true,"shop":true,"type":true,"status":true,"customerId":true,"locationIds":true,"query":true,"limit":true,"offset":true},"params":[{"name":"requiredCustomFieldFilters","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"key","required":false},{"name":"value","required":false},{"name":"inverse","required":true}]},"locs":[{"a":144,"b":170}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":1286,"b":1291}]},{"name":"type","required":false,"transform":{"type":"scalar"},"locs":[{"a":1318,"b":1322}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1365,"b":1371}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1436,"b":1446}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1507,"b":1518},{"a":1583,"b":1594}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1652,"b":1657},{"a":1695,"b":1700},{"a":1737,"b":1742},{"a":1788,"b":1793},{"a":1830,"b":1835},{"a":1873,"b":1878},{"a":1920,"b":1925},{"a":1969,"b":1974},{"a":2012,"b":2017},{"a":2054,"b":2059},{"a":2100,"b":2105},{"a":2145,"b":2150},{"a":2187,"b":2192}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2940,"b":2946}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":2955,"b":2961}]}],"statement":"WITH \"CustomFieldFilters\" AS (SELECT row_number() over () as row, key, val, inverse\n                              FROM (VALUES ('', '', FALSE), :requiredCustomFieldFilters OFFSET 2) AS \"CustomFieldFilters\"(key, val, inverse))\nSELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON po.id = poli.\"purchaseOrderId\"\n       LEFT JOIN \"SpecialOrderLineItem\" spoli ON poli.\"specialOrderLineItemId\" = spoli.id\n       LEFT JOIN \"ProductVariant\" pv ON poli.\"productVariantId\" = pv.\"productVariantId\"\n       LEFT JOIN \"Product\" p ON pv.\"productId\" = p.\"productId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\n       LEFT JOIN \"Employee\" e ON poea.\"employeeId\" = e.\"staffMemberId\"\n       LEFT JOIN \"Location\" l ON po.\"locationId\" = l.\"locationId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON spoli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"Customer\" c ON so.\"customerId\" = c.\"customerId\"\n       LEFT JOIN \"WorkOrderItem\" woi ON soli.\"lineItemId\" = woi.\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrder\" wo ON woi.\"workOrderId\" = wo.\"id\"\n       LEFT JOIN \"Supplier\" s ON po.\"supplierId\" = s.id\nWHERE po.shop = :shop!\n  AND po.type = COALESCE(:type, po.type)\n  AND po.status ILIKE COALESCE(:status, po.status)\n  AND c.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, c.\"customerId\")\n  AND (\n  po.\"locationId\" = ANY (COALESCE(:locationIds, ARRAY [po.\"locationId\"]))\n    OR (wo.\"locationId\" IS NULL AND :locationIds :: text[] IS NULL)\n  )\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR s.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR l.name ILIKE COALESCE(:query, '%')\n    OR so.name ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR pv.sku ILIKE COALESCE(:query, '%')\n    OR pv.\"title\" ILIKE COALESCE(:query, '%')\n    OR p.\"title\" ILIKE COALESCE(:query, '%')\n    OR e.name ILIKE COALESCE(:query, '%')\n  )\n  AND (SELECT COUNT(row) = COUNT(NULLIF(match, FALSE))\n       FROM (SELECT row, COALESCE(BOOL_OR(match), FALSE) AS match\n             FROM (SELECT filter.row,\n                          (filter.key IS NOT NULL) AND\n                          (COALESCE(filter.val ILIKE pocf.value, pocf.value IS NOT DISTINCT FROM filter.val)) !=\n                          filter.inverse\n                   FROM \"CustomFieldFilters\" filter\n                          LEFT JOIN \"PurchaseOrderCustomField\" pocf\n                                    ON (pocf.\"purchaseOrderId\" = po.id AND\n                                        pocf.key ILIKE COALESCE(filter.key, pocf.key))) AS a(row, match)\n             GROUP BY row) b(row, match))\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

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
 *        LEFT JOIN "Supplier" s ON po."supplierId" = s.id
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
 *     OR s.name ILIKE COALESCE(:query, '%')
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
  supplierId: number | null;
  tax: string | null;
  type: PurchaseOrderType;
  updatedAt: Date;
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



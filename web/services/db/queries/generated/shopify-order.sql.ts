/** Types generated for queries found in "services/db/queries/shopify-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type ShopifyOrderType = 'DRAFT_ORDER' | 'ORDER';

/** 'Get' parameters type */
export interface IGetParams {
  orderId: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  customerId: string | null;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  total: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"orderId":true},"params":[{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":47,"b":55}]}],"statement":"SELECT *\nFROM \"ShopifyOrder\"\nWHERE \"orderId\" = :orderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyOrder"
 * WHERE "orderId" = :orderId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  orderIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  customerId: string | null;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  total: string;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"orderIds":true},"params":[{"name":"orderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":48,"b":57}]}],"statement":"SELECT *\nFROM \"ShopifyOrder\"\nWHERE \"orderId\" IN :orderIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyOrder"
 * WHERE "orderId" IN :orderIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId?: string | null | void;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  total: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"orderId":true,"shop":true,"orderType":true,"name":true,"customerId":true,"total":true,"outstanding":true,"fullyPaid":true},"params":[{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":127}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":135},{"a":264,"b":269}]},{"name":"orderType","required":true,"transform":{"type":"scalar"},"locs":[{"a":138,"b":148},{"a":293,"b":303}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":151,"b":156},{"a":327,"b":332}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":159,"b":169},{"a":356,"b":366}]},{"name":"total","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":178},{"a":390,"b":396}]},{"name":"outstanding","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":193},{"a":420,"b":432}]},{"name":"fullyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":206},{"a":455,"b":465}]}],"statement":"INSERT INTO \"ShopifyOrder\" (\"orderId\", shop, \"orderType\", name, \"customerId\", total, outstanding, \"fullyPaid\")\nVALUES (:orderId!, :shop!, :orderType!, :name!, :customerId, :total!, :outstanding!, :fullyPaid!)\nON CONFLICT (\"orderId\") DO UPDATE\n  SET shop         = :shop!,\n      \"orderType\"  = :orderType!,\n      name         = :name!,\n      \"customerId\" = :customerId,\n      total        = :total!,\n      outstanding  = :outstanding!,\n      \"fullyPaid\" = :fullyPaid!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyOrder" ("orderId", shop, "orderType", name, "customerId", total, outstanding, "fullyPaid")
 * VALUES (:orderId!, :shop!, :orderType!, :name!, :customerId, :total!, :outstanding!, :fullyPaid!)
 * ON CONFLICT ("orderId") DO UPDATE
 *   SET shop         = :shop!,
 *       "orderType"  = :orderType!,
 *       name         = :name!,
 *       "customerId" = :customerId,
 *       total        = :total!,
 *       outstanding  = :outstanding!,
 *       "fullyPaid" = :fullyPaid!
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetLineItems' parameters type */
export interface IGetLineItemsParams {
  orderId: string;
}

/** 'GetLineItems' return type */
export interface IGetLineItemsResult {
  createdAt: Date;
  discountedUnitPrice: string;
  lineItemId: string;
  orderId: string;
  productVariantId: string | null;
  quantity: number;
  title: string;
  totalTax: string;
  unfulfilledQuantity: number;
  unitPrice: string;
  updatedAt: Date;
}

/** 'GetLineItems' query type */
export interface IGetLineItemsQuery {
  params: IGetLineItemsParams;
  result: IGetLineItemsResult;
}

const getLineItemsIR: any = {"usedParamSet":{"orderId":true},"params":[{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":63}]}],"statement":"SELECT *\nFROM \"ShopifyOrderLineItem\"\nWHERE \"orderId\" = :orderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyOrderLineItem"
 * WHERE "orderId" = :orderId!
 * ```
 */
export const getLineItems = new PreparedQuery<IGetLineItemsParams,IGetLineItemsResult>(getLineItemsIR);


/** 'GetLineItemsByIds' parameters type */
export interface IGetLineItemsByIdsParams {
  lineItemIds: readonly (string)[];
}

/** 'GetLineItemsByIds' return type */
export interface IGetLineItemsByIdsResult {
  createdAt: Date;
  discountedUnitPrice: string;
  lineItemId: string;
  orderId: string;
  productVariantId: string | null;
  quantity: number;
  title: string;
  totalTax: string;
  unfulfilledQuantity: number;
  unitPrice: string;
  updatedAt: Date;
}

/** 'GetLineItemsByIds' query type */
export interface IGetLineItemsByIdsQuery {
  params: IGetLineItemsByIdsParams;
  result: IGetLineItemsByIdsResult;
}

const getLineItemsByIdsIR: any = {"usedParamSet":{"lineItemIds":true},"params":[{"name":"lineItemIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":59,"b":71}]}],"statement":"SELECT *\nFROM \"ShopifyOrderLineItem\"\nWHERE \"lineItemId\" IN :lineItemIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyOrderLineItem"
 * WHERE "lineItemId" IN :lineItemIds!
 * ```
 */
export const getLineItemsByIds = new PreparedQuery<IGetLineItemsByIdsParams,IGetLineItemsByIdsResult>(getLineItemsByIdsIR);


/** 'UpsertLineItem' parameters type */
export interface IUpsertLineItemParams {
  discountedUnitPrice: string;
  lineItemId: string;
  orderId: string;
  productVariantId?: string | null | void;
  quantity: number;
  title: string;
  totalTax: string;
  unfulfilledQuantity: number;
  unitPrice: string;
}

/** 'UpsertLineItem' return type */
export type IUpsertLineItemResult = void;

/** 'UpsertLineItem' query type */
export interface IUpsertLineItemQuery {
  params: IUpsertLineItemParams;
  result: IUpsertLineItemResult;
}

const upsertLineItemIR: any = {"usedParamSet":{"lineItemId":true,"orderId":true,"productVariantId":true,"quantity":true,"unitPrice":true,"unfulfilledQuantity":true,"title":true,"totalTax":true,"discountedUnitPrice":true},"params":[{"name":"lineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":226}]},{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":229,"b":237},{"a":426,"b":434}]},{"name":"productVariantId","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":256},{"a":467,"b":483}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":259,"b":268},{"a":516,"b":525}]},{"name":"unitPrice","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":281},{"a":558,"b":568}]},{"name":"unfulfilledQuantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":304},{"a":601,"b":621}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":307,"b":313},{"a":654,"b":660}]},{"name":"totalTax","required":true,"transform":{"type":"scalar"},"locs":[{"a":316,"b":325},{"a":693,"b":702}]},{"name":"discountedUnitPrice","required":true,"transform":{"type":"scalar"},"locs":[{"a":336,"b":356},{"a":735,"b":755}]}],"statement":"INSERT INTO \"ShopifyOrderLineItem\" (\"lineItemId\", \"orderId\", \"productVariantId\", quantity, \"unitPrice\",\n                                    \"unfulfilledQuantity\", \"title\", \"totalTax\", \"discountedUnitPrice\")\nVALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!, :totalTax!,\n        :discountedUnitPrice!)\nON CONFLICT (\"lineItemId\") DO UPDATE\n  SET \"orderId\"             = :orderId!,\n      \"productVariantId\"    = :productVariantId,\n      quantity              = :quantity!,\n      \"unitPrice\"           = :unitPrice!,\n      \"unfulfilledQuantity\" = :unfulfilledQuantity!,\n      \"title\"               = :title!,\n      \"totalTax\"            = :totalTax!,\n      \"discountedUnitPrice\" = :discountedUnitPrice!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyOrderLineItem" ("lineItemId", "orderId", "productVariantId", quantity, "unitPrice",
 *                                     "unfulfilledQuantity", "title", "totalTax", "discountedUnitPrice")
 * VALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!, :totalTax!,
 *         :discountedUnitPrice!)
 * ON CONFLICT ("lineItemId") DO UPDATE
 *   SET "orderId"             = :orderId!,
 *       "productVariantId"    = :productVariantId,
 *       quantity              = :quantity!,
 *       "unitPrice"           = :unitPrice!,
 *       "unfulfilledQuantity" = :unfulfilledQuantity!,
 *       "title"               = :title!,
 *       "totalTax"            = :totalTax!,
 *       "discountedUnitPrice" = :discountedUnitPrice!
 * ```
 */
export const upsertLineItem = new PreparedQuery<IUpsertLineItemParams,IUpsertLineItemResult>(upsertLineItemIR);


/** 'RemoveLineItemsByIds' parameters type */
export interface IRemoveLineItemsByIdsParams {
  lineItemIds: readonly (string)[];
}

/** 'RemoveLineItemsByIds' return type */
export type IRemoveLineItemsByIdsResult = void;

/** 'RemoveLineItemsByIds' query type */
export interface IRemoveLineItemsByIdsQuery {
  params: IRemoveLineItemsByIdsParams;
  result: IRemoveLineItemsByIdsResult;
}

const removeLineItemsByIdsIR: any = {"usedParamSet":{"lineItemIds":true},"params":[{"name":"lineItemIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":57,"b":69}]}],"statement":"DELETE\nFROM \"ShopifyOrderLineItem\"\nWHERE \"lineItemId\" IN :lineItemIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ShopifyOrderLineItem"
 * WHERE "lineItemId" IN :lineItemIds!
 * ```
 */
export const removeLineItemsByIds = new PreparedQuery<IRemoveLineItemsByIdsParams,IRemoveLineItemsByIdsResult>(removeLineItemsByIdsIR);


/** 'GetRelatedWorkOrdersByShopifyOrderId' parameters type */
export interface IGetRelatedWorkOrdersByShopifyOrderIdParams {
  orderId: string;
}

/** 'GetRelatedWorkOrdersByShopifyOrderId' return type */
export interface IGetRelatedWorkOrdersByShopifyOrderIdResult {
  id: number;
  name: string;
}

/** 'GetRelatedWorkOrdersByShopifyOrderId' query type */
export interface IGetRelatedWorkOrdersByShopifyOrderIdQuery {
  params: IGetRelatedWorkOrdersByShopifyOrderIdParams;
  result: IGetRelatedWorkOrdersByShopifyOrderIdResult;
}

const getRelatedWorkOrdersByShopifyOrderIdIR: any = {"usedParamSet":{"orderId":true},"params":[{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":956,"b":964}]}],"statement":"SELECT DISTINCT \"WorkOrder\".\"id\", \"WorkOrder\".name\nFROM \"ShopifyOrder\"\n       INNER JOIN \"ShopifyOrderLineItem\" ON \"ShopifyOrder\".\"orderId\" = \"ShopifyOrderLineItem\".\"orderId\"\n       LEFT JOIN \"WorkOrderItem\"\n                 ON \"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderItem\".\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\"\n                 ON \"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderHourlyLabourCharge\".\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\"\n                 ON \"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderFixedPriceLabourCharge\".\"shopifyOrderLineItemId\"\n       INNER JOIN \"WorkOrder\" ON (\"WorkOrderItem\".\"workOrderId\" = \"WorkOrder\".\"id\" OR\n                                  \"WorkOrderHourlyLabourCharge\".\"workOrderId\" = \"WorkOrder\".\"id\" OR\n                                  \"WorkOrderFixedPriceLabourCharge\".\"workOrderId\" = \"WorkOrder\".\"id\")\nWHERE \"ShopifyOrder\".\"orderId\" = :orderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT "WorkOrder"."id", "WorkOrder".name
 * FROM "ShopifyOrder"
 *        INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
 *        LEFT JOIN "WorkOrderItem"
 *                  ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderItem"."shopifyOrderLineItemId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge"
 *                  ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderHourlyLabourCharge"."shopifyOrderLineItemId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge"
 *                  ON "ShopifyOrderLineItem"."lineItemId" = "WorkOrderFixedPriceLabourCharge"."shopifyOrderLineItemId"
 *        INNER JOIN "WorkOrder" ON ("WorkOrderItem"."workOrderId" = "WorkOrder"."id" OR
 *                                   "WorkOrderHourlyLabourCharge"."workOrderId" = "WorkOrder"."id" OR
 *                                   "WorkOrderFixedPriceLabourCharge"."workOrderId" = "WorkOrder"."id")
 * WHERE "ShopifyOrder"."orderId" = :orderId!
 * ```
 */
export const getRelatedWorkOrdersByShopifyOrderId = new PreparedQuery<IGetRelatedWorkOrdersByShopifyOrderIdParams,IGetRelatedWorkOrdersByShopifyOrderIdResult>(getRelatedWorkOrdersByShopifyOrderIdIR);


/** 'GetLinkedOrdersByWorkOrderId' parameters type */
export interface IGetLinkedOrdersByWorkOrderIdParams {
  workOrderId: number;
}

/** 'GetLinkedOrdersByWorkOrderId' return type */
export interface IGetLinkedOrdersByWorkOrderIdResult {
  createdAt: Date;
  customerId: string | null;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  total: string;
  updatedAt: Date;
}

/** 'GetLinkedOrdersByWorkOrderId' query type */
export interface IGetLinkedOrdersByWorkOrderIdQuery {
  params: IGetLinkedOrdersByWorkOrderIdParams;
  result: IGetLinkedOrdersByWorkOrderIdResult;
}

const getLinkedOrdersByWorkOrderIdIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":575,"b":587}]}],"statement":"SELECT DISTINCT so.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"WorkOrderItem\" woi ON wo.id = woi.\"workOrderId\"\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\" hlc ON wo.id = hlc.\"workOrderId\"\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\" fplc ON wo.id = fplc.\"workOrderId\"\n       INNER JOIN \"ShopifyOrderLineItem\" soli ON (\n  woi.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR hlc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n    OR fplc.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n  )\n       INNER JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\nWHERE wo.id = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT so.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "WorkOrderItem" woi ON wo.id = woi."workOrderId"
 *        LEFT JOIN "WorkOrderHourlyLabourCharge" hlc ON wo.id = hlc."workOrderId"
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge" fplc ON wo.id = fplc."workOrderId"
 *        INNER JOIN "ShopifyOrderLineItem" soli ON (
 *   woi."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR hlc."shopifyOrderLineItemId" = soli."lineItemId"
 *     OR fplc."shopifyOrderLineItemId" = soli."lineItemId"
 *   )
 *        INNER JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 * WHERE wo.id = :workOrderId!
 * ```
 */
export const getLinkedOrdersByWorkOrderId = new PreparedQuery<IGetLinkedOrdersByWorkOrderIdParams,IGetLinkedOrdersByWorkOrderIdResult>(getLinkedOrdersByWorkOrderIdIR);


/** 'GetLinkedOrdersByPurchaseOrderId' parameters type */
export interface IGetLinkedOrdersByPurchaseOrderIdParams {
  purchaseOrderId: number;
}

/** 'GetLinkedOrdersByPurchaseOrderId' return type */
export interface IGetLinkedOrdersByPurchaseOrderIdResult {
  createdAt: Date;
  customerId: string | null;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  total: string;
  updatedAt: Date;
}

/** 'GetLinkedOrdersByPurchaseOrderId' query type */
export interface IGetLinkedOrdersByPurchaseOrderIdQuery {
  params: IGetLinkedOrdersByPurchaseOrderIdParams;
  result: IGetLinkedOrdersByPurchaseOrderIdResult;
}

const getLinkedOrdersByPurchaseOrderIdIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":357,"b":373}]}],"statement":"SELECT DISTINCT \"ShopifyOrder\".*\nFROM \"ShopifyOrder\"\n       INNER JOIN \"ShopifyOrderLineItem\" ON \"ShopifyOrder\".\"orderId\" = \"ShopifyOrderLineItem\".\"orderId\"\n       INNER JOIN \"PurchaseOrderLineItem\"\n                  ON \"ShopifyOrderLineItem\".\"lineItemId\" = \"PurchaseOrderLineItem\".\"shopifyOrderLineItemId\"\nWHERE \"PurchaseOrderLineItem\".\"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT "ShopifyOrder".*
 * FROM "ShopifyOrder"
 *        INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
 *        INNER JOIN "PurchaseOrderLineItem"
 *                   ON "ShopifyOrderLineItem"."lineItemId" = "PurchaseOrderLineItem"."shopifyOrderLineItemId"
 * WHERE "PurchaseOrderLineItem"."purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getLinkedOrdersByPurchaseOrderId = new PreparedQuery<IGetLinkedOrdersByPurchaseOrderIdParams,IGetLinkedOrdersByPurchaseOrderIdResult>(getLinkedOrdersByPurchaseOrderIdIR);


/** 'DeleteOrders' parameters type */
export interface IDeleteOrdersParams {
  orderIds: readonly (string)[];
}

/** 'DeleteOrders' return type */
export type IDeleteOrdersResult = void;

/** 'DeleteOrders' query type */
export interface IDeleteOrdersQuery {
  params: IDeleteOrdersParams;
  result: IDeleteOrdersResult;
}

const deleteOrdersIR: any = {"usedParamSet":{"orderIds":true},"params":[{"name":"orderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":46,"b":55}]}],"statement":"DELETE\nFROM \"ShopifyOrder\"\nWHERE \"orderId\" IN :orderIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ShopifyOrder"
 * WHERE "orderId" IN :orderIds!
 * ```
 */
export const deleteOrders = new PreparedQuery<IDeleteOrdersParams,IDeleteOrdersResult>(deleteOrdersIR);


/** 'DeleteLineItemsByOrderIds' parameters type */
export interface IDeleteLineItemsByOrderIdsParams {
  orderIds: readonly (string)[];
}

/** 'DeleteLineItemsByOrderIds' return type */
export type IDeleteLineItemsByOrderIdsResult = void;

/** 'DeleteLineItemsByOrderIds' query type */
export interface IDeleteLineItemsByOrderIdsQuery {
  params: IDeleteLineItemsByOrderIdsParams;
  result: IDeleteLineItemsByOrderIdsResult;
}

const deleteLineItemsByOrderIdsIR: any = {"usedParamSet":{"orderIds":true},"params":[{"name":"orderIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":54,"b":63}]}],"statement":"DELETE\nFROM \"ShopifyOrderLineItem\"\nWHERE \"orderId\" IN :orderIds!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ShopifyOrderLineItem"
 * WHERE "orderId" IN :orderIds!
 * ```
 */
export const deleteLineItemsByOrderIds = new PreparedQuery<IDeleteLineItemsByOrderIdsParams,IDeleteLineItemsByOrderIdsResult>(deleteLineItemsByOrderIdsIR);



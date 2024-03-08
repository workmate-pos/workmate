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
  shop: string;
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
  shop: string;
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
  shop: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"orderId":true,"shop":true,"orderType":true,"name":true,"fullyPaid":true,"customerId":true},"params":[{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":99,"b":107}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115},{"a":219,"b":224}]},{"name":"orderType","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":128},{"a":247,"b":257}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":136},{"a":280,"b":285}]},{"name":"fullyPaid","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":149},{"a":308,"b":318}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":162}]}],"statement":"INSERT INTO \"ShopifyOrder\" (\"orderId\", shop, \"orderType\", name, \"fullyPaid\", \"customerId\")\nVALUES (:orderId!, :shop!, :orderType!, :name!, :fullyPaid!, :customerId)\nON CONFLICT (\"orderId\") DO UPDATE\n  SET shop        = :shop!,\n      \"orderType\" = :orderType!,\n      name        = :name!,\n      \"fullyPaid\" = :fullyPaid!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyOrder" ("orderId", shop, "orderType", name, "fullyPaid", "customerId")
 * VALUES (:orderId!, :shop!, :orderType!, :name!, :fullyPaid!, :customerId)
 * ON CONFLICT ("orderId") DO UPDATE
 *   SET shop        = :shop!,
 *       "orderType" = :orderType!,
 *       name        = :name!,
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
  lineItemId: string;
  orderId: string;
  productVariantId: string | null;
  quantity: number;
  title: string;
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


/** 'UpsertLineItem' parameters type */
export interface IUpsertLineItemParams {
  lineItemId: string;
  orderId: string;
  productVariantId?: string | null | void;
  quantity: number;
  title: string;
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

const upsertLineItemIR: any = {"usedParamSet":{"lineItemId":true,"orderId":true,"productVariantId":true,"quantity":true,"unitPrice":true,"unfulfilledQuantity":true,"title":true},"params":[{"name":"lineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":191}]},{"name":"orderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":202},{"a":348,"b":356}]},{"name":"productVariantId","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":221},{"a":389,"b":405}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":224,"b":233},{"a":438,"b":447}]},{"name":"unitPrice","required":true,"transform":{"type":"scalar"},"locs":[{"a":236,"b":246},{"a":480,"b":490}]},{"name":"unfulfilledQuantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":249,"b":269},{"a":523,"b":543}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":272,"b":278},{"a":576,"b":582}]}],"statement":"INSERT INTO \"ShopifyOrderLineItem\" (\"lineItemId\", \"orderId\", \"productVariantId\", quantity, \"unitPrice\",\n                                    \"unfulfilledQuantity\", \"title\")\nVALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!)\nON CONFLICT (\"lineItemId\") DO UPDATE\n  SET \"orderId\"             = :orderId!,\n      \"productVariantId\"    = :productVariantId,\n      quantity              = :quantity!,\n      \"unitPrice\"           = :unitPrice!,\n      \"unfulfilledQuantity\" = :unfulfilledQuantity!,\n      \"title\"               = :title!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ShopifyOrderLineItem" ("lineItemId", "orderId", "productVariantId", quantity, "unitPrice",
 *                                     "unfulfilledQuantity", "title")
 * VALUES (:lineItemId!, :orderId!, :productVariantId, :quantity!, :unitPrice!, :unfulfilledQuantity!, :title!)
 * ON CONFLICT ("lineItemId") DO UPDATE
 *   SET "orderId"             = :orderId!,
 *       "productVariantId"    = :productVariantId,
 *       quantity              = :quantity!,
 *       "unitPrice"           = :unitPrice!,
 *       "unfulfilledQuantity" = :unfulfilledQuantity!,
 *       "title"               = :title!
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
  shop: string;
  updatedAt: Date;
}

/** 'GetLinkedOrdersByWorkOrderId' query type */
export interface IGetLinkedOrdersByWorkOrderIdQuery {
  params: IGetLinkedOrdersByWorkOrderIdParams;
  result: IGetLinkedOrdersByWorkOrderIdResult;
}

const getLinkedOrdersByWorkOrderIdIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":346,"b":358},{"a":593,"b":605},{"a":870,"b":882}]}],"statement":"SELECT DISTINCT \"ShopifyOrder\".*\nFROM \"ShopifyOrder\"\n       INNER JOIN \"ShopifyOrderLineItem\" ON \"ShopifyOrder\".\"orderId\" = \"ShopifyOrderLineItem\".\"orderId\"\n       LEFT JOIN \"WorkOrderItem\" ON (\"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderItem\".\"shopifyOrderLineItemId\" AND\n                                     \"WorkOrderItem\".\"workOrderId\" = :workOrderId!)\n       LEFT JOIN \"WorkOrderHourlyLabourCharge\"\n                 ON (\"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderHourlyLabourCharge\".\"shopifyOrderLineItemId\" AND\n                     \"WorkOrderHourlyLabourCharge\".\"workOrderId\" = :workOrderId!)\n       LEFT JOIN \"WorkOrderFixedPriceLabourCharge\"\n                 ON (\n                   \"ShopifyOrderLineItem\".\"lineItemId\" = \"WorkOrderFixedPriceLabourCharge\".\"shopifyOrderLineItemId\" AND\n                   \"WorkOrderFixedPriceLabourCharge\".\"workOrderId\" = :workOrderId!)\nWHERE \"WorkOrderItem\".\"uuid\" IS NOT NULL\n   OR \"WorkOrderHourlyLabourCharge\".\"uuid\" IS NOT NULL\n   OR \"WorkOrderFixedPriceLabourCharge\".\"uuid\" IS NOT NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT "ShopifyOrder".*
 * FROM "ShopifyOrder"
 *        INNER JOIN "ShopifyOrderLineItem" ON "ShopifyOrder"."orderId" = "ShopifyOrderLineItem"."orderId"
 *        LEFT JOIN "WorkOrderItem" ON ("ShopifyOrderLineItem"."lineItemId" = "WorkOrderItem"."shopifyOrderLineItemId" AND
 *                                      "WorkOrderItem"."workOrderId" = :workOrderId!)
 *        LEFT JOIN "WorkOrderHourlyLabourCharge"
 *                  ON ("ShopifyOrderLineItem"."lineItemId" = "WorkOrderHourlyLabourCharge"."shopifyOrderLineItemId" AND
 *                      "WorkOrderHourlyLabourCharge"."workOrderId" = :workOrderId!)
 *        LEFT JOIN "WorkOrderFixedPriceLabourCharge"
 *                  ON (
 *                    "ShopifyOrderLineItem"."lineItemId" = "WorkOrderFixedPriceLabourCharge"."shopifyOrderLineItemId" AND
 *                    "WorkOrderFixedPriceLabourCharge"."workOrderId" = :workOrderId!)
 * WHERE "WorkOrderItem"."uuid" IS NOT NULL
 *    OR "WorkOrderHourlyLabourCharge"."uuid" IS NOT NULL
 *    OR "WorkOrderFixedPriceLabourCharge"."uuid" IS NOT NULL
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
  shop: string;
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



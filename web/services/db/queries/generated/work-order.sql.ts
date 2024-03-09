/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  derivedFromOrderId?: string | null | void;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"derivedFromOrderId":true,"note":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":129}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":140}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":154}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":157,"b":175}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":183}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"derivedFromOrderId\", note)\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status               = EXCLUDED.status,\n                                           \"dueDate\"            = EXCLUDED.\"dueDate\",\n                                           \"customerId\"         = EXCLUDED.\"customerId\",\n                                           \"derivedFromOrderId\" = EXCLUDED.\"derivedFromOrderId\",\n                                           note                 = EXCLUDED.note\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", note)
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :note!)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
 *                                            "dueDate"            = EXCLUDED."dueDate",
 *                                            "customerId"         = EXCLUDED."customerId",
 *                                            "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
 *                                            note                 = EXCLUDED.note
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  employeeIds?: stringArray | null | void;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  shop: string;
  status?: string | null | void;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  note: string;
  shop: string;
  status: string;
  updatedAt: Date;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"query":true,"employeeIds":true,"customerId":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":148,"b":154}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":208},{"a":246,"b":251},{"a":297,"b":302},{"a":340,"b":345},{"a":383,"b":388}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":560,"b":571},{"a":578,"b":589},{"a":766,"b":777},{"a":784,"b":795}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":839,"b":849}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":895,"b":901}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":910,"b":916}]}],"statement":"SELECT wo.*\nFROM \"WorkOrder\" wo\n       LEFT JOIN \"Customer\" c ON wo.\"customerId\" = c.\"customerId\"\nWHERE wo.shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND (\n  wo.status ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR c.phone ILIKE COALESCE(:query, '%')\n    OR c.email ILIKE COALESCE(:query, '%')\n  )\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderHourlyLabourCharge\" hl\n              WHERE hl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND (EXISTS(SELECT *\n              FROM \"WorkOrderFixedPriceLabourCharge\" fpl\n              WHERE fpl.\"workOrderId\" = wo.id\n                AND \"employeeId\" = ANY (:employeeIds)) OR :employeeIds IS NULL)\n  AND wo.\"customerId\" = COALESCE(:customerId, wo.\"customerId\")\nORDER BY wo.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT wo.*
 * FROM "WorkOrder" wo
 *        LEFT JOIN "Customer" c ON wo."customerId" = c."customerId"
 * WHERE wo.shop = :shop!
 *   AND wo.status = COALESCE(:status, wo.status)
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
  name: string;
  rate: string;
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
  createdAt: Date;
  employeeId: string | null;
  name: string;
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

const upsertItemIR: any = {"usedParamSet":{"uuid":true,"workOrderId":true,"shopifyOrderLineItemId":true,"quantity":true,"productVariantId":true},"params":[{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":134}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":159}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":171}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":191}]}],"statement":"INSERT INTO \"WorkOrderItem\" (uuid, \"workOrderId\", \"shopifyOrderLineItemId\", quantity, \"productVariantId\")\nVALUES (:uuid!, :workOrderId!, :shopifyOrderLineItemId, :quantity!, :productVariantId!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE SET \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n                quantity                 = EXCLUDED.quantity,\n                \"productVariantId\"       = EXCLUDED.\"productVariantId\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderItem" (uuid, "workOrderId", "shopifyOrderLineItemId", quantity, "productVariantId")
 * VALUES (:uuid!, :workOrderId!, :shopifyOrderLineItemId, :quantity!, :productVariantId!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *                 quantity                 = EXCLUDED.quantity,
 *                 "productVariantId"       = EXCLUDED."productVariantId"
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



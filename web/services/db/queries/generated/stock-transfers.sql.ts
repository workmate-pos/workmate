/** Types generated for queries found in "services/db/queries/stock-transfers.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type StockTransferLineItemStatus = 'IN_TRANSIT' | 'PENDING' | 'RECEIVED' | 'REJECTED';

export type NumberOrString = number | string;

/** 'Get' parameters type */
export interface IGetParams {
  name: string;
  shop: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  fromLocationId: string;
  id: number;
  name: string;
  note: string;
  shop: string;
  toLocationId: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"shop":true,"name":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":50}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":72}]}],"statement":"SELECT *\nFROM \"StockTransfer\"\nWHERE \"shop\" = :shop!\n  AND \"name\" = :name!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "StockTransfer"
 * WHERE "shop" = :shop!
 *   AND "name" = :name!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  fromLocationId: string;
  name: string;
  note: string;
  shop: string;
  toLocationId: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  createdAt: Date;
  fromLocationId: string;
  id: number;
  name: string;
  note: string;
  shop: string;
  toLocationId: string;
  updatedAt: Date;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"fromLocationId":true,"toLocationId":true,"note":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":89,"b":94}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":102}]},{"name":"fromLocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":120}]},{"name":"toLocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":123,"b":136}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":144}]}],"statement":"INSERT INTO \"StockTransfer\" (shop, name, \"fromLocationId\", \"toLocationId\", note)\nVALUES (:shop!, :name!, :fromLocationId!, :toLocationId!, :note!)\nON CONFLICT (\"shop\", \"name\")\n  DO UPDATE\n  SET \"fromLocationId\" = EXCLUDED.\"fromLocationId\",\n      \"toLocationId\"   = EXCLUDED.\"toLocationId\",\n      note             = EXCLUDED.note\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "StockTransfer" (shop, name, "fromLocationId", "toLocationId", note)
 * VALUES (:shop!, :name!, :fromLocationId!, :toLocationId!, :note!)
 * ON CONFLICT ("shop", "name")
 *   DO UPDATE
 *   SET "fromLocationId" = EXCLUDED."fromLocationId",
 *       "toLocationId"   = EXCLUDED."toLocationId",
 *       note             = EXCLUDED.note
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
  fromLocationId?: string | null | void;
  limit: NumberOrString;
  offset: NumberOrString;
  query?: string | null | void;
  shop: string;
  status?: StockTransferLineItemStatus | null | void;
  toLocationId?: string | null | void;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  createdAt: Date;
  fromLocationId: string;
  id: number;
  name: string;
  note: string;
  shop: string;
  toLocationId: string;
  updatedAt: Date;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"fromLocationId":true,"toLocationId":true,"query":true,"status":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":50}]},{"name":"fromLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":100}]},{"name":"toLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":165}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":215}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":388,"b":394}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":440,"b":446}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":455,"b":462}]}],"statement":"SELECT *\nFROM \"StockTransfer\"\nWHERE \"shop\" = :shop!\n  AND \"fromLocationId\" = COALESCE(:fromLocationId, \"fromLocationId\")\n  AND \"toLocationId\" = COALESCE(:toLocationId, \"toLocationId\")\n  AND name ILIKE COALESCE(:query, '%')\n  AND EXISTS (SELECT 1\n              FROM \"StockTransferLineItem\"\n              WHERE \"stockTransferId\" = \"StockTransfer\".id\n                AND \"status\" = COALESCE(:status, \"status\"))\nORDER BY \"createdAt\" DESC\nLIMIT :limit! OFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "StockTransfer"
 * WHERE "shop" = :shop!
 *   AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
 *   AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
 *   AND name ILIKE COALESCE(:query, '%')
 *   AND EXISTS (SELECT 1
 *               FROM "StockTransferLineItem"
 *               WHERE "stockTransferId" = "StockTransfer".id
 *                 AND "status" = COALESCE(:status, "status"))
 * ORDER BY "createdAt" DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);


/** 'GetCount' parameters type */
export interface IGetCountParams {
  fromLocationId?: string | null | void;
  query?: string | null | void;
  shop: string;
  status?: StockTransferLineItemStatus | null | void;
  toLocationId?: string | null | void;
}

/** 'GetCount' return type */
export interface IGetCountResult {
  count: number | null;
}

/** 'GetCount' query type */
export interface IGetCountQuery {
  params: IGetCountParams;
  result: IGetCountResult;
}

const getCountIR: any = {"usedParamSet":{"shop":true,"fromLocationId":true,"toLocationId":true,"query":true,"status":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":79}]},{"name":"fromLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":129}]},{"name":"toLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":194}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":239,"b":244}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":423}]}],"statement":"SELECT COUNT(*) :: INTEGER as \"count\"\nFROM \"StockTransfer\"\nWHERE \"shop\" = :shop!\n  AND \"fromLocationId\" = COALESCE(:fromLocationId, \"fromLocationId\")\n  AND \"toLocationId\" = COALESCE(:toLocationId, \"toLocationId\")\n  AND name ILIKE COALESCE(:query, '%')\n  AND EXISTS (SELECT 1\n              FROM \"StockTransferLineItem\"\n              WHERE \"stockTransferId\" = \"StockTransfer\".id\n                AND \"status\" = COALESCE(:status, \"status\"))"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) :: INTEGER as "count"
 * FROM "StockTransfer"
 * WHERE "shop" = :shop!
 *   AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
 *   AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
 *   AND name ILIKE COALESCE(:query, '%')
 *   AND EXISTS (SELECT 1
 *               FROM "StockTransferLineItem"
 *               WHERE "stockTransferId" = "StockTransfer".id
 *                 AND "status" = COALESCE(:status, "status"))
 * ```
 */
export const getCount = new PreparedQuery<IGetCountParams,IGetCountResult>(getCountIR);


/** 'UpsertLineItems' parameters type */
export interface IUpsertLineItemsParams {
  lineItems: readonly ({
    uuid: string,
    stockTransferId: number,
    inventoryItemId: string,
    productTitle: string,
    productVariantTitle: string,
    status: StockTransferLineItemStatus,
    quantity: number
  })[];
}

/** 'UpsertLineItems' return type */
export type IUpsertLineItemsResult = void;

/** 'UpsertLineItems' query type */
export interface IUpsertLineItemsQuery {
  params: IUpsertLineItemsParams;
  result: IUpsertLineItemsResult;
}

const upsertLineItemsIR: any = {"usedParamSet":{"lineItems":true},"params":[{"name":"lineItems","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"uuid","required":true},{"name":"stockTransferId","required":true},{"name":"inventoryItemId","required":true},{"name":"productTitle","required":true},{"name":"productVariantTitle","required":true},{"name":"status","required":true},{"name":"quantity","required":true}]},"locs":[{"a":265,"b":274}]}],"statement":"INSERT INTO \"StockTransferLineItem\" (uuid, \"stockTransferId\", \"inventoryItemId\", \"productTitle\", \"productVariantTitle\",\n                                     status, quantity)\nVALUES (gen_random_uuid(), 0, '', '', '', 'PENDING' :: \"StockTransferLineItemStatus\", 0), :lineItems\nOFFSET 1\nON CONFLICT (\"stockTransferId\", uuid)\nDO UPDATE\nSET \"inventoryItemId\" = EXCLUDED.\"inventoryItemId\",\n      \"productTitle\"   = EXCLUDED.\"productTitle\",\n      \"productVariantTitle\" = EXCLUDED.\"productVariantTitle\",\n      status            = EXCLUDED.status,\n      quantity          = EXCLUDED.quantity"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "StockTransferLineItem" (uuid, "stockTransferId", "inventoryItemId", "productTitle", "productVariantTitle",
 *                                      status, quantity)
 * VALUES (gen_random_uuid(), 0, '', '', '', 'PENDING' :: "StockTransferLineItemStatus", 0), :lineItems
 * OFFSET 1
 * ON CONFLICT ("stockTransferId", uuid)
 * DO UPDATE
 * SET "inventoryItemId" = EXCLUDED."inventoryItemId",
 *       "productTitle"   = EXCLUDED."productTitle",
 *       "productVariantTitle" = EXCLUDED."productVariantTitle",
 *       status            = EXCLUDED.status,
 *       quantity          = EXCLUDED.quantity
 * ```
 */
export const upsertLineItems = new PreparedQuery<IUpsertLineItemsParams,IUpsertLineItemsResult>(upsertLineItemsIR);


/** 'RemoveLineItems' parameters type */
export interface IRemoveLineItemsParams {
  stockTransferId: number;
}

/** 'RemoveLineItems' return type */
export type IRemoveLineItemsResult = void;

/** 'RemoveLineItems' query type */
export interface IRemoveLineItemsQuery {
  params: IRemoveLineItemsParams;
  result: IRemoveLineItemsResult;
}

const removeLineItemsIR: any = {"usedParamSet":{"stockTransferId":true},"params":[{"name":"stockTransferId","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":78}]}],"statement":"DELETE\nFROM \"StockTransferLineItem\"\nWHERE \"stockTransferId\" = :stockTransferId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "StockTransferLineItem"
 * WHERE "stockTransferId" = :stockTransferId!
 * ```
 */
export const removeLineItems = new PreparedQuery<IRemoveLineItemsParams,IRemoveLineItemsResult>(removeLineItemsIR);


/** 'GetLineItems' parameters type */
export interface IGetLineItemsParams {
  stockTransferId: number;
}

/** 'GetLineItems' return type */
export interface IGetLineItemsResult {
  createdAt: Date;
  inventoryItemId: string;
  productTitle: string;
  productVariantTitle: string;
  quantity: number;
  status: StockTransferLineItemStatus;
  stockTransferId: number;
  updatedAt: Date;
  uuid: string;
}

/** 'GetLineItems' query type */
export interface IGetLineItemsQuery {
  params: IGetLineItemsParams;
  result: IGetLineItemsResult;
}

const getLineItemsIR: any = {"usedParamSet":{"stockTransferId":true},"params":[{"name":"stockTransferId","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":80}]}],"statement":"SELECT *\nFROM \"StockTransferLineItem\"\nWHERE \"stockTransferId\" = :stockTransferId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "StockTransferLineItem"
 * WHERE "stockTransferId" = :stockTransferId!
 * ```
 */
export const getLineItems = new PreparedQuery<IGetLineItemsParams,IGetLineItemsResult>(getLineItemsIR);



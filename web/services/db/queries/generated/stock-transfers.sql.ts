/** Types generated for queries found in "services/db/queries/stock-transfers.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type StockTransferLineItemStatus = 'IN_TRANSIT' | 'PENDING' | 'RECEIVED' | 'REJECTED';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'GetPage' parameters type */
export interface IGetPageParams {
  fromLocationId?: string | null | void;
  limit: NumberOrString;
  locationIds?: stringArray | null | void;
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

const getPageIR: any = {"usedParamSet":{"shop":true,"fromLocationId":true,"toLocationId":true,"query":true,"locationIds":true,"status":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":50}]},{"name":"fromLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":100}]},{"name":"toLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":153,"b":165}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":210,"b":215}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":262,"b":273},{"a":340,"b":351}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":544,"b":550}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":596,"b":602}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":611,"b":618}]}],"statement":"SELECT *\nFROM \"StockTransfer\"\nWHERE \"shop\" = :shop!\n  AND \"fromLocationId\" = COALESCE(:fromLocationId, \"fromLocationId\")\n  AND \"toLocationId\" = COALESCE(:toLocationId, \"toLocationId\")\n  AND name ILIKE COALESCE(:query, '%')\n  AND \"fromLocationId\" = ANY (COALESCE(:locationIds, ARRAY [\"fromLocationId\"]))\n  AND \"toLocationId\" = ANY (COALESCE(:locationIds, ARRAY [\"toLocationId\"]))\n  AND EXISTS (SELECT 1\n              FROM \"StockTransferLineItem\"\n              WHERE \"stockTransferId\" = \"StockTransfer\".id\n                AND \"status\" = COALESCE(:status, \"status\"))\nORDER BY \"createdAt\" DESC\nLIMIT :limit! OFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "StockTransfer"
 * WHERE "shop" = :shop!
 *   AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
 *   AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
 *   AND name ILIKE COALESCE(:query, '%')
 *   AND "fromLocationId" = ANY (COALESCE(:locationIds, ARRAY ["fromLocationId"]))
 *   AND "toLocationId" = ANY (COALESCE(:locationIds, ARRAY ["toLocationId"]))
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
  locationIds?: stringArray | null | void;
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

const getCountIR: any = {"usedParamSet":{"shop":true,"fromLocationId":true,"toLocationId":true,"query":true,"locationIds":true,"status":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":79}]},{"name":"fromLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":115,"b":129}]},{"name":"toLocationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":182,"b":194}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":239,"b":244}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":291,"b":302},{"a":369,"b":380}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":581,"b":587}]}],"statement":"SELECT COUNT(*) :: INTEGER as \"count\"\nFROM \"StockTransfer\"\nWHERE \"shop\" = :shop!\n  AND \"fromLocationId\" = COALESCE(:fromLocationId, \"fromLocationId\")\n  AND \"toLocationId\" = COALESCE(:toLocationId, \"toLocationId\")\n  AND name ILIKE COALESCE(:query, '%')\n  AND \"fromLocationId\" = ANY (COALESCE(:locationIds, ARRAY [\"fromLocationId\"]))\n  AND \"toLocationId\" = ANY (COALESCE(:locationIds, ARRAY [\"toLocationId\"]))\n    AND EXISTS (SELECT 1\n                FROM \"StockTransferLineItem\"\n                WHERE \"stockTransferId\" = \"StockTransfer\".id\n                  AND \"status\" = COALESCE(:status, \"status\"))"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) :: INTEGER as "count"
 * FROM "StockTransfer"
 * WHERE "shop" = :shop!
 *   AND "fromLocationId" = COALESCE(:fromLocationId, "fromLocationId")
 *   AND "toLocationId" = COALESCE(:toLocationId, "toLocationId")
 *   AND name ILIKE COALESCE(:query, '%')
 *   AND "fromLocationId" = ANY (COALESCE(:locationIds, ARRAY ["fromLocationId"]))
 *   AND "toLocationId" = ANY (COALESCE(:locationIds, ARRAY ["toLocationId"]))
 *     AND EXISTS (SELECT 1
 *                 FROM "StockTransferLineItem"
 *                 WHERE "stockTransferId" = "StockTransfer".id
 *                   AND "status" = COALESCE(:status, "status"))
 * ```
 */
export const getCount = new PreparedQuery<IGetCountParams,IGetCountResult>(getCountIR);



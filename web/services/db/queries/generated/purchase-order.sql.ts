/** Types generated for queries found in "services/db/queries/purchase-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PurchaseOrderStatus = 'CANCELLED' | 'CLOSED' | 'OPEN' | 'RECEIVED';

export type NumberOrString = number | string;

/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  shop: string;
  status?: PurchaseOrderStatus | null | void;
}

/** 'GetPage' return type */
export interface IGetPageResult {
  createdAt: Date;
  customerId: string | null;
  customerName: string | null;
  id: number;
  locationId: string | null;
  locationName: string | null;
  name: string;
  note: string | null;
  salesOrderId: string | null;
  shop: string;
  status: PurchaseOrderStatus;
  vendorCustomerId: string | null;
  vendorName: string | null;
  workOrderId: number | null;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":265}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":298}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":343,"b":353}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":404,"b":409},{"a":445,"b":450},{"a":494,"b":499},{"a":545,"b":550},{"a":596,"b":601},{"a":647,"b":652},{"a":689,"b":694},{"a":730,"b":735},{"a":774,"b":779},{"a":818,"b":823},{"a":859,"b":864}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":902,"b":908}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":917,"b":923}]}],"statement":"SELECT DISTINCT po.*\nFROM \"PurchaseOrder\" po\nLEFT JOIN \"PurchaseOrderProduct\" pop ON po.id = pop.\"purchaseOrderId\"\nLEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\nLEFT JOIN \"WorkOrder\" wo ON po.\"workOrderId\" = wo.id\nWHERE po.shop = :shop!\nAND po.status = COALESCE(:status, po.status)\nAND po.\"customerId\" = COALESCE(:customerId, po.\"customerId\")\nAND (\n  po.name ILIKE COALESCE(:query, '%')\n  OR po.note ILIKE COALESCE(:query, '%')\n  OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n  OR po.\"customerName\" ILIKE COALESCE(:query, '%')\n  OR po.\"locationName\" ILIKE COALESCE(:query, '%')\n  OR po.\"salesOrderId\" ILIKE COALESCE(:query, '%')\n  OR pop.name ILIKE COALESCE(:query, '%')\n  OR pop.sku ILIKE COALESCE(:query, '%')\n  OR pop.handle ILIKE COALESCE(:query, '%')\n  OR pocf.value ILIKE COALESCE(:query, '%')\n  OR wo.name ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit!\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.*
 * FROM "PurchaseOrder" po
 * LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
 * LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
 * LEFT JOIN "WorkOrder" wo ON po."workOrderId" = wo.id
 * WHERE po.shop = :shop!
 * AND po.status = COALESCE(:status, po.status)
 * AND po."customerId" = COALESCE(:customerId, po."customerId")
 * AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *   OR po.note ILIKE COALESCE(:query, '%')
 *   OR po."vendorName" ILIKE COALESCE(:query, '%')
 *   OR po."customerName" ILIKE COALESCE(:query, '%')
 *   OR po."locationName" ILIKE COALESCE(:query, '%')
 *   OR po."salesOrderId" ILIKE COALESCE(:query, '%')
 *   OR pop.name ILIKE COALESCE(:query, '%')
 *   OR pop.sku ILIKE COALESCE(:query, '%')
 *   OR pop.handle ILIKE COALESCE(:query, '%')
 *   OR pocf.value ILIKE COALESCE(:query, '%')
 *   OR wo.name ILIKE COALESCE(:query, '%')
 *   )
 * ORDER BY po.id DESC
 * LIMIT :limit!
 * OFFSET :offset
 * ```
 */
export const getPage = new PreparedQuery<IGetPageParams,IGetPageResult>(getPageIR);



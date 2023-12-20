/** Types generated for queries found in "services/db/queries/work-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'GetNextIdForShop' parameters type */
export interface IGetNextIdForShopParams {
  shopSequenceName: string;
}

/** 'GetNextIdForShop' return type */
export interface IGetNextIdForShopResult {
  id: number;
}

/** 'GetNextIdForShop' query type */
export interface IGetNextIdForShopQuery {
  params: IGetNextIdForShopParams;
  result: IGetNextIdForShopResult;
}

const getNextIdForShopIR: any = {"usedParamSet":{"shopSequenceName":true},"params":[{"name":"shopSequenceName","required":true,"transform":{"type":"scalar"},"locs":[{"a":28,"b":45}]}],"statement":"SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS \"id!\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT NEXTVAL(FORMAT('%I', :shopSequenceName! :: TEXT)) :: INTEGER AS "id!"
 * ```
 */
export const getNextIdForShop = new PreparedQuery<IGetNextIdForShopParams,IGetNextIdForShopResult>(getNextIdForShopIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId: string;
  derivedFromOrderId?: string | null | void;
  draftOrderId?: string | null | void;
  dueDate: DateOrString;
  name: string;
  orderId?: string | null | void;
  shop: string;
  status: string;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  draftOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  orderId: string | null;
  shop: string;
  status: string;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"dueDate":true,"customerId":true,"derivedFromOrderId":true,"orderId":true,"draftOrderId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":157}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":165}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":175}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":186}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":189,"b":200}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":203,"b":221}]},{"name":"orderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":224,"b":231}]},{"name":"draftOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":242,"b":254}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, status, \"dueDate\", \"customerId\", \"derivedFromOrderId\", \"orderId\",\n                         \"draftOrderId\")\nVALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :orderId,\n        :draftOrderId)\nON CONFLICT (\"shop\", \"name\") DO UPDATE SET status               = EXCLUDED.status,\n                                           \"dueDate\"            = EXCLUDED.\"dueDate\",\n                                           \"customerId\"         = EXCLUDED.\"customerId\",\n                                           \"derivedFromOrderId\" = EXCLUDED.\"derivedFromOrderId\",\n                                           \"orderId\"            = EXCLUDED.\"orderId\",\n                                           \"draftOrderId\"       = EXCLUDED.\"draftOrderId\"\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, status, "dueDate", "customerId", "derivedFromOrderId", "orderId",
 *                          "draftOrderId")
 * VALUES (:shop!, :name!, :status!, :dueDate!, :customerId!, :derivedFromOrderId, :orderId,
 *         :draftOrderId)
 * ON CONFLICT ("shop", "name") DO UPDATE SET status               = EXCLUDED.status,
 *                                            "dueDate"            = EXCLUDED."dueDate",
 *                                            "customerId"         = EXCLUDED."customerId",
 *                                            "derivedFromOrderId" = EXCLUDED."derivedFromOrderId",
 *                                            "orderId"            = EXCLUDED."orderId",
 *                                            "draftOrderId"       = EXCLUDED."draftOrderId"
 * RETURNING *
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'UpdateOrderIds' parameters type */
export interface IUpdateOrderIdsParams {
  draftOrderId?: string | null | void;
  id: number;
  orderId?: string | null | void;
}

/** 'UpdateOrderIds' return type */
export type IUpdateOrderIdsResult = void;

/** 'UpdateOrderIds' query type */
export interface IUpdateOrderIdsQuery {
  params: IUpdateOrderIdsParams;
  result: IUpdateOrderIdsResult;
}

const updateOrderIdsIR: any = {"usedParamSet":{"orderId":true,"draftOrderId":true,"id":true},"params":[{"name":"orderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":49,"b":56}]},{"name":"draftOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":101,"b":113}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":146}]}],"statement":"UPDATE \"WorkOrder\"\nSET \"orderId\"      = COALESCE(:orderId, \"orderId\"),\n    \"draftOrderId\" = COALESCE(:draftOrderId, \"draftOrderId\")\nWHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrder"
 * SET "orderId"      = COALESCE(:orderId, "orderId"),
 *     "draftOrderId" = COALESCE(:draftOrderId, "draftOrderId")
 * WHERE id = :id!
 * ```
 */
export const updateOrderIds = new PreparedQuery<IUpdateOrderIdsParams,IUpdateOrderIdsResult>(updateOrderIdsIR);


/** 'GetPage' parameters type */
export interface IGetPageParams {
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
  draftOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  orderId: string | null;
  shop: string;
  status: string;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"query":true,"employeeIds":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":42,"b":47}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":76,"b":82}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":136},{"a":172,"b":177}]},{"name":"employeeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":299,"b":310},{"a":318,"b":329}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":366,"b":372}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":381,"b":387}]}],"statement":"SELECT *\nFROM \"WorkOrder\" wo\nWHERE shop = :shop!\n  AND wo.status = COALESCE(:status, wo.status)\n  AND (\n  wo.status ILIKE COALESCE(:query, '%') OR\n  wo.name ILIKE COALESCE(:query, '%')\n  )\nAND (EXISTS(\n  SELECT *\n  FROM \"EmployeeAssignment\" ea\n  WHERE \"workOrderId\" = wo.id\n  AND \"employeeId\" = ANY(:employeeIds)\n) OR :employeeIds IS NULL)\nORDER BY wo.id DESC\nLIMIT :limit!\nOFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder" wo
 * WHERE shop = :shop!
 *   AND wo.status = COALESCE(:status, wo.status)
 *   AND (
 *   wo.status ILIKE COALESCE(:query, '%') OR
 *   wo.name ILIKE COALESCE(:query, '%')
 *   )
 * AND (EXISTS(
 *   SELECT *
 *   FROM "EmployeeAssignment" ea
 *   WHERE "workOrderId" = wo.id
 *   AND "employeeId" = ANY(:employeeIds)
 * ) OR :employeeIds IS NULL)
 * ORDER BY wo.id DESC
 * LIMIT :limit!
 * OFFSET :offset
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
  draftOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  orderId: string | null;
  shop: string;
  status: string;
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


/** 'GetByDraftOrderIdOrOrderId' parameters type */
export interface IGetByDraftOrderIdOrOrderIdParams {
  id: string;
}

/** 'GetByDraftOrderIdOrOrderId' return type */
export interface IGetByDraftOrderIdOrOrderIdResult {
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  draftOrderId: string | null;
  dueDate: Date;
  id: number;
  name: string;
  orderId: string | null;
  shop: string;
  status: string;
}

/** 'GetByDraftOrderIdOrOrderId' query type */
export interface IGetByDraftOrderIdOrOrderIdQuery {
  params: IGetByDraftOrderIdOrOrderIdParams;
  result: IGetByDraftOrderIdOrOrderIdResult;
}

const getByDraftOrderIdOrOrderIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":47},{"a":69,"b":72}]}],"statement":"SELECT *\nFROM \"WorkOrder\"\nWHERE \"orderId\" = :id!\nOR \"draftOrderId\" = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrder"
 * WHERE "orderId" = :id!
 * OR "draftOrderId" = :id!
 * ```
 */
export const getByDraftOrderIdOrOrderId = new PreparedQuery<IGetByDraftOrderIdOrOrderIdParams,IGetByDraftOrderIdOrOrderIdResult>(getByDraftOrderIdOrOrderIdIR);



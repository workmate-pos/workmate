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
  shipFrom: string | null;
  shipTo: string | null;
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

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":281,"b":286}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":315,"b":321}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":378}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":431,"b":436},{"a":474,"b":479},{"a":525,"b":530},{"a":578,"b":583},{"a":631,"b":636},{"a":684,"b":689},{"a":731,"b":736},{"a":780,"b":785},{"a":824,"b":829},{"a":867,"b":872},{"a":913,"b":918},{"a":959,"b":964},{"a":1002,"b":1007}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1045,"b":1051}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1060,"b":1066}]}],"statement":"SELECT DISTINCT po.*\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderProduct\" pop ON po.id = pop.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\n       LEFT JOIN \"WorkOrder\" wo ON po.\"workOrderId\" = wo.id\nWHERE po.shop = :shop!\n  AND po.status = COALESCE(:status, po.status)\n  AND po.\"customerId\" = COALESCE(:customerId, po.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR po.\"customerName\" ILIKE COALESCE(:query, '%')\n    OR po.\"locationName\" ILIKE COALESCE(:query, '%')\n    OR po.\"salesOrderId\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR pop.name ILIKE COALESCE(:query, '%')\n    OR pop.sku ILIKE COALESCE(:query, '%')\n    OR pop.handle ILIKE COALESCE(:query, '%')\n    OR pocf.value ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.*
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
 *        LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
 *        LEFT JOIN "WorkOrder" wo ON po."workOrderId" = wo.id
 * WHERE po.shop = :shop!
 *   AND po.status = COALESCE(:status, po.status)
 *   AND po."customerId" = COALESCE(:customerId, po."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR po."vendorName" ILIKE COALESCE(:query, '%')
 *     OR po."customerName" ILIKE COALESCE(:query, '%')
 *     OR po."locationName" ILIKE COALESCE(:query, '%')
 *     OR po."salesOrderId" ILIKE COALESCE(:query, '%')
 *     OR po."shipTo" ILIKE COALESCE(:query, '%')
 *     OR po."shipFrom" ILIKE COALESCE(:query, '%')
 *     OR pop.name ILIKE COALESCE(:query, '%')
 *     OR pop.sku ILIKE COALESCE(:query, '%')
 *     OR pop.handle ILIKE COALESCE(:query, '%')
 *     OR pocf.value ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *   )
 * ORDER BY po.id DESC
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
  customerId: string | null;
  customerName: string | null;
  id: number;
  locationId: string | null;
  locationName: string | null;
  name: string;
  note: string | null;
  salesOrderId: string | null;
  shipFrom: string | null;
  shipTo: string | null;
  shop: string;
  status: PurchaseOrderStatus;
  vendorCustomerId: string | null;
  vendorName: string | null;
  workOrderId: number | null;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"id":true,"shop":true,"name":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":50,"b":52}]},{"name":"shop","required":false,"transform":{"type":"scalar"},"locs":[{"a":81,"b":85}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":116,"b":120}]}],"statement":"SELECT *\nFROM \"PurchaseOrder\"\nWHERE id = COALESCE(:id, id)\n  AND shop = COALESCE(:shop, shop)\n  AND name = COALESCE(:name, name)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrder"
 * WHERE id = COALESCE(:id, id)
 *   AND shop = COALESCE(:shop, shop)
 *   AND name = COALESCE(:name, name)
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  customerId?: string | null | void;
  customerName?: string | null | void;
  locationId?: string | null | void;
  locationName?: string | null | void;
  name: string;
  note?: string | null | void;
  salesOrderId?: string | null | void;
  shipFrom?: string | null | void;
  shipTo?: string | null | void;
  shop: string;
  status: PurchaseOrderStatus;
  vendorCustomerId?: string | null | void;
  vendorName?: string | null | void;
  workOrderId?: number | null | void;
}

/** 'Upsert' return type */
export interface IUpsertResult {
  id: number;
}

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"salesOrderId":true,"workOrderId":true,"locationId":true,"customerId":true,"vendorCustomerId":true,"note":true,"vendorName":true,"customerName":true,"locationName":true,"shipFrom":true,"shipTo":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":268,"b":273}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":276,"b":281}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":291},{"a":508,"b":515}]},{"name":"salesOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":294,"b":306},{"a":545,"b":557}]},{"name":"workOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":309,"b":320},{"a":587,"b":598}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":323,"b":333},{"a":628,"b":638}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":346},{"a":668,"b":678}]},{"name":"vendorCustomerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":349,"b":365},{"a":708,"b":724}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":372},{"a":754,"b":758}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":383,"b":393},{"a":788,"b":798}]},{"name":"customerName","required":false,"transform":{"type":"scalar"},"locs":[{"a":396,"b":408},{"a":828,"b":840}]},{"name":"locationName","required":false,"transform":{"type":"scalar"},"locs":[{"a":411,"b":423},{"a":870,"b":882}]},{"name":"shipFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":426,"b":434},{"a":912,"b":920}]},{"name":"shipTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":437,"b":443},{"a":950,"b":956}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, name, status, \"salesOrderId\", \"workOrderId\", \"locationId\", \"customerId\",\n                             \"vendorCustomerId\", note, \"vendorName\", \"customerName\", \"locationName\", \"shipFrom\",\n                             \"shipTo\")\nVALUES (:shop!, :name!, :status!, :salesOrderId, :workOrderId, :locationId, :customerId, :vendorCustomerId, :note,\n        :vendorName, :customerName, :locationName, :shipFrom, :shipTo)\nON CONFLICT (shop, name) DO UPDATE\n  SET status             = :status!,\n      \"salesOrderId\"     = :salesOrderId,\n      \"workOrderId\"      = :workOrderId,\n      \"locationId\"       = :locationId,\n      \"customerId\"       = :customerId,\n      \"vendorCustomerId\" = :vendorCustomerId,\n      note               = :note,\n      \"vendorName\"       = :vendorName,\n      \"customerName\"     = :customerName,\n      \"locationName\"     = :locationName,\n      \"shipFrom\"         = :shipFrom,\n      \"shipTo\"           = :shipTo\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, name, status, "salesOrderId", "workOrderId", "locationId", "customerId",
 *                              "vendorCustomerId", note, "vendorName", "customerName", "locationName", "shipFrom",
 *                              "shipTo")
 * VALUES (:shop!, :name!, :status!, :salesOrderId, :workOrderId, :locationId, :customerId, :vendorCustomerId, :note,
 *         :vendorName, :customerName, :locationName, :shipFrom, :shipTo)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET status             = :status!,
 *       "salesOrderId"     = :salesOrderId,
 *       "workOrderId"      = :workOrderId,
 *       "locationId"       = :locationId,
 *       "customerId"       = :customerId,
 *       "vendorCustomerId" = :vendorCustomerId,
 *       note               = :note,
 *       "vendorName"       = :vendorName,
 *       "customerName"     = :customerName,
 *       "locationName"     = :locationName,
 *       "shipFrom"         = :shipFrom,
 *       "shipTo"           = :shipTo
 * RETURNING id
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetProducts' parameters type */
export interface IGetProductsParams {
  purchaseOrderId: number;
}

/** 'GetProducts' return type */
export interface IGetProductsResult {
  handle: string | null;
  id: number;
  name: string | null;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  sku: string | null;
}

/** 'GetProducts' query type */
export interface IGetProductsQuery {
  params: IGetProductsParams;
  result: IGetProductsResult;
}

const getProductsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":79}]}],"statement":"SELECT *\nFROM \"PurchaseOrderProduct\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderProduct"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getProducts = new PreparedQuery<IGetProductsParams,IGetProductsResult>(getProductsIR);


/** 'GetCustomFields' parameters type */
export interface IGetCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'GetCustomFields' return type */
export interface IGetCustomFieldsResult {
  id: number;
  key: string;
  purchaseOrderId: number;
  value: string;
}

/** 'GetCustomFields' query type */
export interface IGetCustomFieldsQuery {
  params: IGetCustomFieldsParams;
  result: IGetCustomFieldsResult;
}

const getCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":83}]}],"statement":"SELECT *\nFROM \"PurchaseOrderCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getCustomFields = new PreparedQuery<IGetCustomFieldsParams,IGetCustomFieldsResult>(getCustomFieldsIR);


/** 'RemoveProducts' parameters type */
export interface IRemoveProductsParams {
  purchaseOrderId: number;
}

/** 'RemoveProducts' return type */
export type IRemoveProductsResult = void;

/** 'RemoveProducts' query type */
export interface IRemoveProductsQuery {
  params: IRemoveProductsParams;
  result: IRemoveProductsResult;
}

const removeProductsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":77}]}],"statement":"DELETE FROM \"PurchaseOrderProduct\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "PurchaseOrderProduct"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeProducts = new PreparedQuery<IRemoveProductsParams,IRemoveProductsResult>(removeProductsIR);


/** 'RemoveCustomFields' parameters type */
export interface IRemoveCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'RemoveCustomFields' return type */
export type IRemoveCustomFieldsResult = void;

/** 'RemoveCustomFields' query type */
export interface IRemoveCustomFieldsQuery {
  params: IRemoveCustomFieldsParams;
  result: IRemoveCustomFieldsResult;
}

const removeCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":81}]}],"statement":"DELETE FROM \"PurchaseOrderCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM "PurchaseOrderCustomField"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeCustomFields = new PreparedQuery<IRemoveCustomFieldsParams,IRemoveCustomFieldsResult>(removeCustomFieldsIR);


/** 'InsertProduct' parameters type */
export interface IInsertProductParams {
  handle?: string | null | void;
  name?: string | null | void;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  sku?: string | null | void;
}

/** 'InsertProduct' return type */
export type IInsertProductResult = void;

/** 'InsertProduct' query type */
export interface IInsertProductQuery {
  params: IInsertProductParams;
  result: IInsertProductResult;
}

const insertProductIR: any = {"usedParamSet":{"purchaseOrderId":true,"productVariantId":true,"quantity":true,"sku":true,"name":true,"handle":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":128}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":148}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":151,"b":160}]},{"name":"sku","required":false,"transform":{"type":"scalar"},"locs":[{"a":163,"b":166}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":169,"b":173}]},{"name":"handle","required":false,"transform":{"type":"scalar"},"locs":[{"a":176,"b":182}]}],"statement":"INSERT INTO \"PurchaseOrderProduct\" (\"purchaseOrderId\", \"productVariantId\", quantity, sku, name, handle)\nVALUES (:purchaseOrderId!, :productVariantId!, :quantity!, :sku, :name, :handle)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderProduct" ("purchaseOrderId", "productVariantId", quantity, sku, name, handle)
 * VALUES (:purchaseOrderId!, :productVariantId!, :quantity!, :sku, :name, :handle)
 * ```
 */
export const insertProduct = new PreparedQuery<IInsertProductParams,IInsertProductResult>(insertProductIR);


/** 'InsertCustomField' parameters type */
export interface IInsertCustomFieldParams {
  key: string;
  purchaseOrderId: number;
  value: string;
}

/** 'InsertCustomField' return type */
export type IInsertCustomFieldResult = void;

/** 'InsertCustomField' query type */
export interface IInsertCustomFieldQuery {
  params: IInsertCustomFieldParams;
  result: IInsertCustomFieldResult;
}

const insertCustomFieldIR: any = {"usedParamSet":{"purchaseOrderId":true,"key":true,"value":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":79,"b":95}]},{"name":"key","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":102}]},{"name":"value","required":true,"transform":{"type":"scalar"},"locs":[{"a":105,"b":111}]}],"statement":"INSERT INTO \"PurchaseOrderCustomField\" (\"purchaseOrderId\", key, value)\nVALUES (:purchaseOrderId!, :key!, :value!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
 * VALUES (:purchaseOrderId!, :key!, :value!)
 * ```
 */
export const insertCustomField = new PreparedQuery<IInsertCustomFieldParams,IInsertCustomFieldResult>(insertCustomFieldIR);



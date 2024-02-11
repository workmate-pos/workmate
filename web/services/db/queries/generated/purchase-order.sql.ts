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
  id: number;
  name: string;
}

/** 'GetPage' query type */
export interface IGetPageQuery {
  params: IGetPageParams;
  result: IGetPageResult;
}

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":231,"b":236}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":265,"b":271}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":337,"b":347}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":400,"b":405},{"a":443,"b":448},{"a":494,"b":499},{"a":547,"b":552},{"a":600,"b":605},{"a":653,"b":658},{"a":700,"b":705},{"a":749,"b":754},{"a":803,"b":808},{"a":847,"b":852},{"a":890,"b":895},{"a":936,"b":941},{"a":982,"b":987}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1025,"b":1031}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1040,"b":1046}]}],"statement":"SELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderProduct\" pop ON po.id = pop.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\nWHERE po.shop = :shop!\n  AND po.status = COALESCE(:status, po.status)\n  AND po.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, po.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR po.\"customerName\" ILIKE COALESCE(:query, '%')\n    OR po.\"locationName\" ILIKE COALESCE(:query, '%')\n    OR po.\"salesOrderId\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR po.\"workOrderName\" ILIKE COALESCE(:query, '%')\n    OR pop.name ILIKE COALESCE(:query, '%')\n    OR pop.sku ILIKE COALESCE(:query, '%')\n    OR pop.handle ILIKE COALESCE(:query, '%')\n    OR pocf.value ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.id, po.name
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
 *        LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
 * WHERE po.shop = :shop!
 *   AND po.status = COALESCE(:status, po.status)
 *   AND po."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, po."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR po."vendorName" ILIKE COALESCE(:query, '%')
 *     OR po."customerName" ILIKE COALESCE(:query, '%')
 *     OR po."locationName" ILIKE COALESCE(:query, '%')
 *     OR po."salesOrderId" ILIKE COALESCE(:query, '%')
 *     OR po."shipTo" ILIKE COALESCE(:query, '%')
 *     OR po."shipFrom" ILIKE COALESCE(:query, '%')
 *     OR po."workOrderName" ILIKE COALESCE(:query, '%')
 *     OR pop.name ILIKE COALESCE(:query, '%')
 *     OR pop.sku ILIKE COALESCE(:query, '%')
 *     OR pop.handle ILIKE COALESCE(:query, '%')
 *     OR pocf.value ILIKE COALESCE(:query, '%')
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
  workOrderName: string | null;
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
  workOrderName?: string | null | void;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"salesOrderId":true,"workOrderName":true,"locationId":true,"customerId":true,"vendorCustomerId":true,"note":true,"vendorName":true,"customerName":true,"locationName":true,"shipFrom":true,"shipTo":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":270,"b":275}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":278,"b":283}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":286,"b":293},{"a":512,"b":519}]},{"name":"salesOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":296,"b":308},{"a":549,"b":561}]},{"name":"workOrderName","required":false,"transform":{"type":"scalar"},"locs":[{"a":311,"b":324},{"a":591,"b":604}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":337},{"a":634,"b":644}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":340,"b":350},{"a":674,"b":684}]},{"name":"vendorCustomerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":353,"b":369},{"a":714,"b":730}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":372,"b":376},{"a":760,"b":764}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":387,"b":397},{"a":794,"b":804}]},{"name":"customerName","required":false,"transform":{"type":"scalar"},"locs":[{"a":400,"b":412},{"a":834,"b":846}]},{"name":"locationName","required":false,"transform":{"type":"scalar"},"locs":[{"a":415,"b":427},{"a":876,"b":888}]},{"name":"shipFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":430,"b":438},{"a":918,"b":926}]},{"name":"shipTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":441,"b":447},{"a":956,"b":962}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, name, status, \"salesOrderId\", \"workOrderName\", \"locationId\", \"customerId\",\n                             \"vendorCustomerId\", note, \"vendorName\", \"customerName\", \"locationName\", \"shipFrom\",\n                             \"shipTo\")\nVALUES (:shop!, :name!, :status!, :salesOrderId, :workOrderName, :locationId, :customerId, :vendorCustomerId, :note,\n        :vendorName, :customerName, :locationName, :shipFrom, :shipTo)\nON CONFLICT (shop, name) DO UPDATE\n  SET status             = :status!,\n      \"salesOrderId\"     = :salesOrderId,\n      \"workOrderName\"    = :workOrderName,\n      \"locationId\"       = :locationId,\n      \"customerId\"       = :customerId,\n      \"vendorCustomerId\" = :vendorCustomerId,\n      note               = :note,\n      \"vendorName\"       = :vendorName,\n      \"customerName\"     = :customerName,\n      \"locationName\"     = :locationName,\n      \"shipFrom\"         = :shipFrom,\n      \"shipTo\"           = :shipTo\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, name, status, "salesOrderId", "workOrderName", "locationId", "customerId",
 *                              "vendorCustomerId", note, "vendorName", "customerName", "locationName", "shipFrom",
 *                              "shipTo")
 * VALUES (:shop!, :name!, :status!, :salesOrderId, :workOrderName, :locationId, :customerId, :vendorCustomerId, :note,
 *         :vendorName, :customerName, :locationName, :shipFrom, :shipTo)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET status             = :status!,
 *       "salesOrderId"     = :salesOrderId,
 *       "workOrderName"    = :workOrderName,
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

const removeProductsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":77}]}],"statement":"DELETE\nFROM \"PurchaseOrderProduct\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderProduct"
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

const removeCustomFieldsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":81}]}],"statement":"DELETE\nFROM \"PurchaseOrderCustomField\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderCustomField"
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



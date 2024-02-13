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

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":321,"b":326}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":355,"b":361}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":427,"b":437}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":490,"b":495},{"a":533,"b":538},{"a":584,"b":589},{"a":637,"b":642},{"a":690,"b":695},{"a":740,"b":745},{"a":787,"b":792},{"a":836,"b":841},{"a":890,"b":895},{"a":934,"b":939},{"a":977,"b":982},{"a":1023,"b":1028},{"a":1069,"b":1074},{"a":1124,"b":1129}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1167,"b":1173}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1182,"b":1188}]}],"statement":"SELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderProduct\" pop ON po.id = pop.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\nWHERE po.shop = :shop!\n  AND po.status = COALESCE(:status, po.status)\n  AND po.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, po.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR po.\"customerName\" ILIKE COALESCE(:query, '%')\n    OR po.\"locationName\" ILIKE COALESCE(:query, '%')\n    OR po.\"orderName\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR po.\"workOrderName\" ILIKE COALESCE(:query, '%')\n    OR pop.name ILIKE COALESCE(:query, '%')\n    OR pop.sku ILIKE COALESCE(:query, '%')\n    OR pop.handle ILIKE COALESCE(:query, '%')\n    OR pocf.value ILIKE COALESCE(:query, '%')\n    OR poea.\"employeeName\" ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.id, po.name
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderProduct" pop ON po.id = pop."purchaseOrderId"
 *        LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
 *        LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
 * WHERE po.shop = :shop!
 *   AND po.status = COALESCE(:status, po.status)
 *   AND po."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, po."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR po."vendorName" ILIKE COALESCE(:query, '%')
 *     OR po."customerName" ILIKE COALESCE(:query, '%')
 *     OR po."locationName" ILIKE COALESCE(:query, '%')
 *     OR po."orderName" ILIKE COALESCE(:query, '%')
 *     OR po."shipTo" ILIKE COALESCE(:query, '%')
 *     OR po."shipFrom" ILIKE COALESCE(:query, '%')
 *     OR po."workOrderName" ILIKE COALESCE(:query, '%')
 *     OR pop.name ILIKE COALESCE(:query, '%')
 *     OR pop.sku ILIKE COALESCE(:query, '%')
 *     OR pop.handle ILIKE COALESCE(:query, '%')
 *     OR pocf.value ILIKE COALESCE(:query, '%')
 *     OR poea."employeeName" ILIKE COALESCE(:query, '%')
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
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  locationName: string | null;
  name: string;
  note: string | null;
  orderId: string | null;
  orderName: string | null;
  paid: string | null;
  shipFrom: string | null;
  shipping: string | null;
  shipTo: string | null;
  shop: string;
  status: PurchaseOrderStatus;
  subtotal: string | null;
  tax: string | null;
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
  deposited?: string | null | void;
  discount?: string | null | void;
  locationId?: string | null | void;
  locationName?: string | null | void;
  name: string;
  note?: string | null | void;
  orderId?: string | null | void;
  orderName?: string | null | void;
  paid?: string | null | void;
  shipFrom?: string | null | void;
  shipping?: string | null | void;
  shipTo?: string | null | void;
  shop: string;
  status: PurchaseOrderStatus;
  subtotal?: string | null | void;
  tax?: string | null | void;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"locationId":true,"customerId":true,"vendorCustomerId":true,"note":true,"vendorName":true,"customerName":true,"locationName":true,"shipFrom":true,"shipTo":true,"workOrderName":true,"orderId":true,"orderName":true,"subtotal":true,"discount":true,"tax":true,"shipping":true,"deposited":true,"paid":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":342,"b":347}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":350,"b":355}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":358,"b":365},{"a":656,"b":663}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":378},{"a":692,"b":702}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":381,"b":391},{"a":731,"b":741}]},{"name":"vendorCustomerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":394,"b":410},{"a":770,"b":786}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":413,"b":417},{"a":815,"b":819}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":420,"b":430},{"a":848,"b":858}]},{"name":"customerName","required":false,"transform":{"type":"scalar"},"locs":[{"a":433,"b":445},{"a":887,"b":899}]},{"name":"locationName","required":false,"transform":{"type":"scalar"},"locs":[{"a":456,"b":468},{"a":928,"b":940}]},{"name":"shipFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":471,"b":479},{"a":969,"b":977}]},{"name":"shipTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":482,"b":488},{"a":1006,"b":1012}]},{"name":"workOrderName","required":false,"transform":{"type":"scalar"},"locs":[{"a":491,"b":504},{"a":1041,"b":1054}]},{"name":"orderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":507,"b":514},{"a":1083,"b":1090}]},{"name":"orderName","required":false,"transform":{"type":"scalar"},"locs":[{"a":517,"b":526},{"a":1119,"b":1128}]},{"name":"subtotal","required":false,"transform":{"type":"scalar"},"locs":[{"a":529,"b":537},{"a":1157,"b":1165}]},{"name":"discount","required":false,"transform":{"type":"scalar"},"locs":[{"a":540,"b":548},{"a":1194,"b":1202}]},{"name":"tax","required":false,"transform":{"type":"scalar"},"locs":[{"a":551,"b":554},{"a":1231,"b":1234}]},{"name":"shipping","required":false,"transform":{"type":"scalar"},"locs":[{"a":557,"b":565},{"a":1263,"b":1271}]},{"name":"deposited","required":false,"transform":{"type":"scalar"},"locs":[{"a":576,"b":585},{"a":1300,"b":1309}]},{"name":"paid","required":false,"transform":{"type":"scalar"},"locs":[{"a":588,"b":592},{"a":1338,"b":1342}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, name, status, \"locationId\", \"customerId\", \"vendorCustomerId\", note, \"vendorName\",\n                             \"customerName\", \"locationName\", \"shipFrom\", \"shipTo\", \"workOrderName\", \"orderId\",\n                             \"orderName\", \"subtotal\", \"discount\", \"tax\", \"shipping\", \"deposited\", \"paid\")\nVALUES (:shop!, :name!, :status!, :locationId, :customerId, :vendorCustomerId, :note, :vendorName, :customerName,\n        :locationName, :shipFrom, :shipTo, :workOrderName, :orderId, :orderName, :subtotal, :discount, :tax, :shipping,\n        :deposited, :paid)\nON CONFLICT (shop, name) DO UPDATE\n  SET status            = :status!,\n      \"locationId\"      = :locationId,\n      \"customerId\"      = :customerId,\n      \"vendorCustomerId\"= :vendorCustomerId,\n      note              = :note,\n      \"vendorName\"      = :vendorName,\n      \"customerName\"    = :customerName,\n      \"locationName\"    = :locationName,\n      \"shipFrom\"        = :shipFrom,\n      \"shipTo\"          = :shipTo,\n      \"workOrderName\"   = :workOrderName,\n      \"orderId\"         = :orderId,\n      \"orderName\"       = :orderName,\n      subtotal          = :subtotal,\n      discount          = :discount,\n      tax               = :tax,\n      shipping          = :shipping,\n      deposited         = :deposited,\n      paid              = :paid\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, name, status, "locationId", "customerId", "vendorCustomerId", note, "vendorName",
 *                              "customerName", "locationName", "shipFrom", "shipTo", "workOrderName", "orderId",
 *                              "orderName", "subtotal", "discount", "tax", "shipping", "deposited", "paid")
 * VALUES (:shop!, :name!, :status!, :locationId, :customerId, :vendorCustomerId, :note, :vendorName, :customerName,
 *         :locationName, :shipFrom, :shipTo, :workOrderName, :orderId, :orderName, :subtotal, :discount, :tax, :shipping,
 *         :deposited, :paid)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET status            = :status!,
 *       "locationId"      = :locationId,
 *       "customerId"      = :customerId,
 *       "vendorCustomerId"= :vendorCustomerId,
 *       note              = :note,
 *       "vendorName"      = :vendorName,
 *       "customerName"    = :customerName,
 *       "locationName"    = :locationName,
 *       "shipFrom"        = :shipFrom,
 *       "shipTo"          = :shipTo,
 *       "workOrderName"   = :workOrderName,
 *       "orderId"         = :orderId,
 *       "orderName"       = :orderName,
 *       subtotal          = :subtotal,
 *       discount          = :discount,
 *       tax               = :tax,
 *       shipping          = :shipping,
 *       deposited         = :deposited,
 *       paid              = :paid
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


/** 'GetAssignedEmployees' parameters type */
export interface IGetAssignedEmployeesParams {
  purchaseOrderId: number;
}

/** 'GetAssignedEmployees' return type */
export interface IGetAssignedEmployeesResult {
  employeeId: string;
  employeeName: string | null;
  id: number;
  purchaseOrderId: number;
}

/** 'GetAssignedEmployees' query type */
export interface IGetAssignedEmployeesQuery {
  params: IGetAssignedEmployeesParams;
  result: IGetAssignedEmployeesResult;
}

const getAssignedEmployeesIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":74,"b":90}]}],"statement":"SELECT *\nFROM \"PurchaseOrderEmployeeAssignment\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderEmployeeAssignment"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getAssignedEmployees = new PreparedQuery<IGetAssignedEmployeesParams,IGetAssignedEmployeesResult>(getAssignedEmployeesIR);


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


/** 'RemoveAssignedEmployees' parameters type */
export interface IRemoveAssignedEmployeesParams {
  purchaseOrderId: number;
}

/** 'RemoveAssignedEmployees' return type */
export type IRemoveAssignedEmployeesResult = void;

/** 'RemoveAssignedEmployees' query type */
export interface IRemoveAssignedEmployeesQuery {
  params: IRemoveAssignedEmployeesParams;
  result: IRemoveAssignedEmployeesResult;
}

const removeAssignedEmployeesIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":88}]}],"statement":"DELETE\nFROM \"PurchaseOrderEmployeeAssignment\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderEmployeeAssignment"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeAssignedEmployees = new PreparedQuery<IRemoveAssignedEmployeesParams,IRemoveAssignedEmployeesResult>(removeAssignedEmployeesIR);


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


/** 'InsertAssignedEmployee' parameters type */
export interface IInsertAssignedEmployeeParams {
  employeeId: string;
  employeeName?: string | null | void;
  purchaseOrderId: number;
}

/** 'InsertAssignedEmployee' return type */
export type IInsertAssignedEmployeeResult = void;

/** 'InsertAssignedEmployee' query type */
export interface IInsertAssignedEmployeeQuery {
  params: IInsertAssignedEmployeeParams;
  result: IInsertAssignedEmployeeResult;
}

const insertAssignedEmployeeIR: any = {"usedParamSet":{"purchaseOrderId":true,"employeeId":true,"employeeName":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":104,"b":120}]},{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":123,"b":134}]},{"name":"employeeName","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":149}]}],"statement":"INSERT INTO \"PurchaseOrderEmployeeAssignment\" (\"purchaseOrderId\", \"employeeId\", \"employeeName\")\nVALUES (:purchaseOrderId!, :employeeId!, :employeeName)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId", "employeeName")
 * VALUES (:purchaseOrderId!, :employeeId!, :employeeName)
 * ```
 */
export const insertAssignedEmployee = new PreparedQuery<IInsertAssignedEmployeeParams,IInsertAssignedEmployeeResult>(insertAssignedEmployeeIR);



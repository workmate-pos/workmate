/** Types generated for queries found in "services/db/queries/purchase-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type PurchaseOrderStatus = 'CANCELLED' | 'CLOSED' | 'OPEN' | 'RECEIVED';

export type NumberOrString = number | string;

export type stringArray = (string)[];

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

const upsertIR: any = {"usedParamSet":{"shop":true,"name":true,"status":true,"locationId":true,"customerId":true,"vendorCustomerId":true,"note":true,"vendorName":true,"customerName":true,"locationName":true,"shipFrom":true,"shipTo":true,"workOrderName":true,"orderId":true,"orderName":true,"discount":true,"tax":true,"shipping":true,"deposited":true,"paid":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":330,"b":335}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":338,"b":343}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":346,"b":353},{"a":633,"b":640}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":366},{"a":669,"b":679}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":369,"b":379},{"a":708,"b":718}]},{"name":"vendorCustomerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":382,"b":398},{"a":747,"b":763}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":401,"b":405},{"a":792,"b":796}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":408,"b":418},{"a":825,"b":835}]},{"name":"customerName","required":false,"transform":{"type":"scalar"},"locs":[{"a":421,"b":433},{"a":864,"b":876}]},{"name":"locationName","required":false,"transform":{"type":"scalar"},"locs":[{"a":444,"b":456},{"a":905,"b":917}]},{"name":"shipFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":459,"b":467},{"a":946,"b":954}]},{"name":"shipTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":470,"b":476},{"a":983,"b":989}]},{"name":"workOrderName","required":false,"transform":{"type":"scalar"},"locs":[{"a":479,"b":492},{"a":1018,"b":1031}]},{"name":"orderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":495,"b":502},{"a":1060,"b":1067}]},{"name":"orderName","required":false,"transform":{"type":"scalar"},"locs":[{"a":505,"b":514},{"a":1096,"b":1105}]},{"name":"discount","required":false,"transform":{"type":"scalar"},"locs":[{"a":517,"b":525},{"a":1134,"b":1142}]},{"name":"tax","required":false,"transform":{"type":"scalar"},"locs":[{"a":528,"b":531},{"a":1171,"b":1174}]},{"name":"shipping","required":false,"transform":{"type":"scalar"},"locs":[{"a":534,"b":542},{"a":1203,"b":1211}]},{"name":"deposited","required":false,"transform":{"type":"scalar"},"locs":[{"a":553,"b":562},{"a":1240,"b":1249}]},{"name":"paid","required":false,"transform":{"type":"scalar"},"locs":[{"a":565,"b":569},{"a":1278,"b":1282}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, name, status, \"locationId\", \"customerId\", \"vendorCustomerId\", note, \"vendorName\",\n                             \"customerName\", \"locationName\", \"shipFrom\", \"shipTo\", \"workOrderName\", \"orderId\",\n                             \"orderName\", \"discount\", \"tax\", \"shipping\", \"deposited\", \"paid\")\nVALUES (:shop!, :name!, :status!, :locationId, :customerId, :vendorCustomerId, :note, :vendorName, :customerName,\n        :locationName, :shipFrom, :shipTo, :workOrderName, :orderId, :orderName, :discount, :tax, :shipping,\n        :deposited, :paid)\nON CONFLICT (shop, name) DO UPDATE\n  SET status            = :status!,\n      \"locationId\"      = :locationId,\n      \"customerId\"      = :customerId,\n      \"vendorCustomerId\"= :vendorCustomerId,\n      note              = :note,\n      \"vendorName\"      = :vendorName,\n      \"customerName\"    = :customerName,\n      \"locationName\"    = :locationName,\n      \"shipFrom\"        = :shipFrom,\n      \"shipTo\"          = :shipTo,\n      \"workOrderName\"   = :workOrderName,\n      \"orderId\"         = :orderId,\n      \"orderName\"       = :orderName,\n      discount          = :discount,\n      tax               = :tax,\n      shipping          = :shipping,\n      deposited         = :deposited,\n      paid              = :paid\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, name, status, "locationId", "customerId", "vendorCustomerId", note, "vendorName",
 *                              "customerName", "locationName", "shipFrom", "shipTo", "workOrderName", "orderId",
 *                              "orderName", "discount", "tax", "shipping", "deposited", "paid")
 * VALUES (:shop!, :name!, :status!, :locationId, :customerId, :vendorCustomerId, :note, :vendorName, :customerName,
 *         :locationName, :shipFrom, :shipTo, :workOrderName, :orderId, :orderName, :discount, :tax, :shipping,
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
  availableQuantity: number;
  handle: string | null;
  id: number;
  inventoryItemId: string;
  name: string | null;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  sku: string | null;
  unitCost: string;
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
  availableQuantity: number;
  handle?: string | null | void;
  inventoryItemId: string;
  name?: string | null | void;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  sku?: string | null | void;
  unitCost: string;
}

/** 'InsertProduct' return type */
export type IInsertProductResult = void;

/** 'InsertProduct' query type */
export interface IInsertProductQuery {
  params: IInsertProductParams;
  result: IInsertProductResult;
}

const insertProductIR: any = {"usedParamSet":{"purchaseOrderId":true,"productVariantId":true,"inventoryItemId":true,"quantity":true,"availableQuantity":true,"sku":true,"name":true,"handle":true,"unitCost":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":236,"b":252}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":255,"b":272}]},{"name":"inventoryItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":275,"b":291}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":294,"b":303}]},{"name":"availableQuantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":306,"b":324}]},{"name":"sku","required":false,"transform":{"type":"scalar"},"locs":[{"a":327,"b":330}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":333,"b":337}]},{"name":"handle","required":false,"transform":{"type":"scalar"},"locs":[{"a":348,"b":354}]},{"name":"unitCost","required":true,"transform":{"type":"scalar"},"locs":[{"a":357,"b":366}]}],"statement":"INSERT INTO \"PurchaseOrderProduct\" (\"purchaseOrderId\", \"productVariantId\", \"inventoryItemId\", quantity,\n                                    \"availableQuantity\", sku, name,\n                                    handle, \"unitCost\")\nVALUES (:purchaseOrderId!, :productVariantId!, :inventoryItemId!, :quantity!, :availableQuantity!, :sku, :name,\n        :handle, :unitCost!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderProduct" ("purchaseOrderId", "productVariantId", "inventoryItemId", quantity,
 *                                     "availableQuantity", sku, name,
 *                                     handle, "unitCost")
 * VALUES (:purchaseOrderId!, :productVariantId!, :inventoryItemId!, :quantity!, :availableQuantity!, :sku, :name,
 *         :handle, :unitCost!)
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


/** 'GetCustomFieldsPresets' parameters type */
export interface IGetCustomFieldsPresetsParams {
  shop: string;
}

/** 'GetCustomFieldsPresets' return type */
export interface IGetCustomFieldsPresetsResult {
  id: number;
  keys: stringArray | null;
  name: string;
  shop: string;
}

/** 'GetCustomFieldsPresets' query type */
export interface IGetCustomFieldsPresetsQuery {
  params: IGetCustomFieldsPresetsParams;
  result: IGetCustomFieldsPresetsResult;
}

const getCustomFieldsPresetsIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":66}]}],"statement":"SELECT *\nFROM \"PurchaseOrderCustomFieldsPreset\"\nWHERE shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderCustomFieldsPreset"
 * WHERE shop = :shop!
 * ```
 */
export const getCustomFieldsPresets = new PreparedQuery<IGetCustomFieldsPresetsParams,IGetCustomFieldsPresetsResult>(getCustomFieldsPresetsIR);


/** 'UpsertCustomFieldsPreset' parameters type */
export interface IUpsertCustomFieldsPresetParams {
  keys: stringArray;
  name: string;
  shop: string;
}

/** 'UpsertCustomFieldsPreset' return type */
export type IUpsertCustomFieldsPresetResult = void;

/** 'UpsertCustomFieldsPreset' query type */
export interface IUpsertCustomFieldsPresetQuery {
  params: IUpsertCustomFieldsPresetParams;
  result: IUpsertCustomFieldsPresetResult;
}

const upsertCustomFieldsPresetIR: any = {"usedParamSet":{"shop":true,"name":true,"keys":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":78}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":81,"b":86}]},{"name":"keys","required":true,"transform":{"type":"scalar"},"locs":[{"a":89,"b":94},{"a":145,"b":150}]}],"statement":"INSERT INTO \"PurchaseOrderCustomFieldsPreset\" (shop, name, keys)\nVALUES (:shop!, :name!, :keys!)\nON CONFLICT (shop, name) DO UPDATE\n  SET keys = :keys!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderCustomFieldsPreset" (shop, name, keys)
 * VALUES (:shop!, :name!, :keys!)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET keys = :keys!
 * ```
 */
export const upsertCustomFieldsPreset = new PreparedQuery<IUpsertCustomFieldsPresetParams,IUpsertCustomFieldsPresetResult>(upsertCustomFieldsPresetIR);


/** 'RemoveCustomFieldsPreset' parameters type */
export interface IRemoveCustomFieldsPresetParams {
  name: string;
  shop: string;
}

/** 'RemoveCustomFieldsPreset' return type */
export type IRemoveCustomFieldsPresetResult = void;

/** 'RemoveCustomFieldsPreset' query type */
export interface IRemoveCustomFieldsPresetQuery {
  params: IRemoveCustomFieldsPresetParams;
  result: IRemoveCustomFieldsPresetResult;
}

const removeCustomFieldsPresetIR: any = {"usedParamSet":{"shop":true,"name":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":64}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":79,"b":84}]}],"statement":"DELETE\nFROM \"PurchaseOrderCustomFieldsPreset\"\nWHERE shop = :shop!\n  AND name = :name!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderCustomFieldsPreset"
 * WHERE shop = :shop!
 *   AND name = :name!
 * ```
 */
export const removeCustomFieldsPreset = new PreparedQuery<IRemoveCustomFieldsPresetParams,IRemoveCustomFieldsPresetResult>(removeCustomFieldsPresetIR);


/** 'GetProductVariantCostsForShop' parameters type */
export interface IGetProductVariantCostsForShopParams {
  productVariantId: string;
  shop: string;
}

/** 'GetProductVariantCostsForShop' return type */
export interface IGetProductVariantCostsForShopResult {
  quantity: number;
  unitCost: string;
}

/** 'GetProductVariantCostsForShop' query type */
export interface IGetProductVariantCostsForShopQuery {
  params: IGetProductVariantCostsForShopParams;
  result: IGetProductVariantCostsForShopResult;
}

const getProductVariantCostsForShopIR: any = {"usedParamSet":{"shop":true,"productVariantId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":138}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":184}]}],"statement":"SELECT \"unitCost\", \"quantity\"\nFROM \"PurchaseOrderProduct\"\nINNER JOIN \"PurchaseOrder\" po ON \"purchaseOrderId\" = po.id\nWHERE po.shop = :shop!\n  AND \"productVariantId\" = :productVariantId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT "unitCost", "quantity"
 * FROM "PurchaseOrderProduct"
 * INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
 * WHERE po.shop = :shop!
 *   AND "productVariantId" = :productVariantId!
 * ```
 */
export const getProductVariantCostsForShop = new PreparedQuery<IGetProductVariantCostsForShopParams,IGetProductVariantCostsForShopResult>(getProductVariantCostsForShopIR);



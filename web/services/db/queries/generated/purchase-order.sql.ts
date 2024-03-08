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

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":900,"b":905}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":934,"b":940}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1006,"b":1016}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1069,"b":1074},{"a":1112,"b":1117},{"a":1168,"b":1173},{"a":1226,"b":1231},{"a":1268,"b":1273},{"a":1311,"b":1316},{"a":1358,"b":1363},{"a":1407,"b":1412},{"a":1450,"b":1455},{"a":1492,"b":1497},{"a":1538,"b":1543},{"a":1583,"b":1588},{"a":1629,"b":1634},{"a":1671,"b":1676}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1714,"b":1720}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1729,"b":1735}]}],"statement":"SELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON po.id = poli.\"purchaseOrderId\"\n       LEFT JOIN \"ProductVariant\" pv ON poli.\"productVariantId\" = pv.\"productVariantId\"\n       LEFT JOIN \"Product\" p ON pv.\"productId\" = p.\"productId\"\n       LEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\n       LEFT JOIN \"Employee\" e ON poea.\"employeeId\" = e.\"staffMemberId\"\n       LEFT JOIN \"Customer\" vendor ON po.\"vendorCustomerId\" = vendor.\"customerId\"\n       LEFT JOIN \"Customer\" customer ON po.\"customerId\" = customer.\"customerId\"\n       LEFT JOIN \"Location\" l ON po.\"locationId\" = l.\"locationId\"\n       LEFT JOIN \"ShopifyOrder\" so ON po.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"WorkOrder\" wo ON po.\"workOrderId\" = wo.id\nWHERE po.shop = :shop!\n  AND po.status = COALESCE(:status, po.status)\n  AND po.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, po.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR vendor.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR customer.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR l.name ILIKE COALESCE(:query, '%')\n    OR so.name ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR pv.sku ILIKE COALESCE(:query, '%')\n    OR pv.\"title\" ILIKE COALESCE(:query, '%')\n    OR p.\"title\" ILIKE COALESCE(:query, '%')\n    OR pocf.value ILIKE COALESCE(:query, '%')\n    OR e.name ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT po.id, po.name
 * FROM "PurchaseOrder" po
 *        LEFT JOIN "PurchaseOrderLineItem" poli ON po.id = poli."purchaseOrderId"
 *        LEFT JOIN "ProductVariant" pv ON poli."productVariantId" = pv."productVariantId"
 *        LEFT JOIN "Product" p ON pv."productId" = p."productId"
 *        LEFT JOIN "PurchaseOrderCustomField" pocf ON po.id = pocf."purchaseOrderId"
 *        LEFT JOIN "PurchaseOrderEmployeeAssignment" poea ON po.id = poea."purchaseOrderId"
 *        LEFT JOIN "Employee" e ON poea."employeeId" = e."staffMemberId"
 *        LEFT JOIN "Customer" vendor ON po."vendorCustomerId" = vendor."customerId"
 *        LEFT JOIN "Customer" customer ON po."customerId" = customer."customerId"
 *        LEFT JOIN "Location" l ON po."locationId" = l."locationId"
 *        LEFT JOIN "ShopifyOrder" so ON po."orderId" = so."orderId"
 *        LEFT JOIN "WorkOrder" wo ON po."workOrderId" = wo.id
 * WHERE po.shop = :shop!
 *   AND po.status = COALESCE(:status, po.status)
 *   AND po."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, po."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR vendor."displayName" ILIKE COALESCE(:query, '%')
 *     OR customer."displayName" ILIKE COALESCE(:query, '%')
 *     OR l.name ILIKE COALESCE(:query, '%')
 *     OR so.name ILIKE COALESCE(:query, '%')
 *     OR po."shipTo" ILIKE COALESCE(:query, '%')
 *     OR po."shipFrom" ILIKE COALESCE(:query, '%')
 *     OR wo.name ILIKE COALESCE(:query, '%')
 *     OR pv.sku ILIKE COALESCE(:query, '%')
 *     OR pv."title" ILIKE COALESCE(:query, '%')
 *     OR p."title" ILIKE COALESCE(:query, '%')
 *     OR pocf.value ILIKE COALESCE(:query, '%')
 *     OR e.name ILIKE COALESCE(:query, '%')
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
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  orderId: string | null;
  paid: string | null;
  shipFrom: string | null;
  shipping: string | null;
  shipTo: string | null;
  shop: string;
  status: PurchaseOrderStatus;
  tax: string | null;
  updatedAt: Date;
  vendorCustomerId: string | null;
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
  deposited?: string | null | void;
  discount?: string | null | void;
  locationId?: string | null | void;
  name: string;
  note?: string | null | void;
  orderId?: string | null | void;
  paid?: string | null | void;
  shipFrom?: string | null | void;
  shipping?: string | null | void;
  shipTo?: string | null | void;
  shop: string;
  status: PurchaseOrderStatus;
  tax?: string | null | void;
  vendorCustomerId?: string | null | void;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"shipFrom":true,"shipTo":true,"locationId":true,"customerId":true,"vendorCustomerId":true,"note":true,"orderId":true,"discount":true,"tax":true,"shipping":true,"deposited":true,"paid":true,"name":true,"status":true,"workOrderId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":235}]},{"name":"shipFrom","required":false,"transform":{"type":"scalar"},"locs":[{"a":238,"b":246},{"a":469,"b":477}]},{"name":"shipTo","required":false,"transform":{"type":"scalar"},"locs":[{"a":249,"b":255},{"a":507,"b":513}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":258,"b":268},{"a":543,"b":553}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":271,"b":281},{"a":583,"b":593}]},{"name":"vendorCustomerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":284,"b":300},{"a":623,"b":639}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":303,"b":307},{"a":669,"b":673}]},{"name":"orderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":310,"b":317},{"a":703,"b":710}]},{"name":"discount","required":false,"transform":{"type":"scalar"},"locs":[{"a":320,"b":328},{"a":740,"b":748}]},{"name":"tax","required":false,"transform":{"type":"scalar"},"locs":[{"a":331,"b":334},{"a":778,"b":781}]},{"name":"shipping","required":false,"transform":{"type":"scalar"},"locs":[{"a":345,"b":353},{"a":811,"b":819}]},{"name":"deposited","required":false,"transform":{"type":"scalar"},"locs":[{"a":356,"b":365},{"a":849,"b":858}]},{"name":"paid","required":false,"transform":{"type":"scalar"},"locs":[{"a":368,"b":372},{"a":888,"b":892}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":375,"b":380}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":383,"b":390},{"a":922,"b":929}]},{"name":"workOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":393,"b":404},{"a":959,"b":970}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, \"shipFrom\", \"shipTo\", \"locationId\", \"customerId\", \"vendorCustomerId\", note,\n                             \"orderId\", discount, tax, shipping, deposited, paid, name, status, \"workOrderId\")\nVALUES (:shop!, :shipFrom, :shipTo, :locationId, :customerId, :vendorCustomerId, :note, :orderId, :discount, :tax,\n        :shipping, :deposited, :paid, :name!, :status!, :workOrderId)\nON CONFLICT (shop, name) DO UPDATE\n  SET \"shipFrom\"         = :shipFrom,\n      \"shipTo\"           = :shipTo,\n      \"locationId\"       = :locationId,\n      \"customerId\"       = :customerId,\n      \"vendorCustomerId\" = :vendorCustomerId,\n      note               = :note,\n      \"orderId\"          = :orderId,\n      discount           = :discount,\n      tax                = :tax,\n      shipping           = :shipping,\n      deposited          = :deposited,\n      paid               = :paid,\n      status             = :status!,\n      \"workOrderId\"      = :workOrderId\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, "shipFrom", "shipTo", "locationId", "customerId", "vendorCustomerId", note,
 *                              "orderId", discount, tax, shipping, deposited, paid, name, status, "workOrderId")
 * VALUES (:shop!, :shipFrom, :shipTo, :locationId, :customerId, :vendorCustomerId, :note, :orderId, :discount, :tax,
 *         :shipping, :deposited, :paid, :name!, :status!, :workOrderId)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET "shipFrom"         = :shipFrom,
 *       "shipTo"           = :shipTo,
 *       "locationId"       = :locationId,
 *       "customerId"       = :customerId,
 *       "vendorCustomerId" = :vendorCustomerId,
 *       note               = :note,
 *       "orderId"          = :orderId,
 *       discount           = :discount,
 *       tax                = :tax,
 *       shipping           = :shipping,
 *       deposited          = :deposited,
 *       paid               = :paid,
 *       status             = :status!,
 *       "workOrderId"      = :workOrderId
 * RETURNING id
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'GetLineItems' parameters type */
export interface IGetLineItemsParams {
  purchaseOrderId: number;
}

/** 'GetLineItems' return type */
export interface IGetLineItemsResult {
  availableQuantity: number;
  createdAt: Date;
  id: number;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
}

/** 'GetLineItems' query type */
export interface IGetLineItemsQuery {
  params: IGetLineItemsParams;
  result: IGetLineItemsResult;
}

const getLineItemsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":80}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getLineItems = new PreparedQuery<IGetLineItemsParams,IGetLineItemsResult>(getLineItemsIR);


/** 'GetCustomFields' parameters type */
export interface IGetCustomFieldsParams {
  purchaseOrderId: number;
}

/** 'GetCustomFields' return type */
export interface IGetCustomFieldsResult {
  createdAt: Date;
  id: number;
  key: string;
  purchaseOrderId: number;
  updatedAt: Date;
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
  createdAt: Date;
  employeeId: string;
  id: number;
  purchaseOrderId: number;
  updatedAt: Date;
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


/** 'RemoveLineItems' parameters type */
export interface IRemoveLineItemsParams {
  purchaseOrderId: number;
}

/** 'RemoveLineItems' return type */
export type IRemoveLineItemsResult = void;

/** 'RemoveLineItems' query type */
export interface IRemoveLineItemsQuery {
  params: IRemoveLineItemsParams;
  result: IRemoveLineItemsResult;
}

const removeLineItemsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":78}]}],"statement":"DELETE\nFROM \"PurchaseOrderLineItem\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderLineItem"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const removeLineItems = new PreparedQuery<IRemoveLineItemsParams,IRemoveLineItemsResult>(removeLineItemsIR);


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


/** 'InsertLineItem' parameters type */
export interface IInsertLineItemParams {
  availableQuantity: number;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId?: string | null | void;
  unitCost: string;
}

/** 'InsertLineItem' return type */
export type IInsertLineItemResult = void;

/** 'InsertLineItem' query type */
export interface IInsertLineItemQuery {
  params: IInsertLineItemParams;
  result: IInsertLineItemResult;
}

const insertLineItemIR: any = {"usedParamSet":{"purchaseOrderId":true,"productVariantId":true,"shopifyOrderLineItemId":true,"quantity":true,"availableQuantity":true,"unitCost":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":190,"b":206}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":209,"b":226}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":229,"b":251}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":254,"b":263}]},{"name":"availableQuantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":266,"b":284}]},{"name":"unitCost","required":true,"transform":{"type":"scalar"},"locs":[{"a":295,"b":304}]}],"statement":"INSERT INTO \"PurchaseOrderLineItem\" (\"purchaseOrderId\", \"productVariantId\", \"shopifyOrderLineItemId\", quantity,\n                                     \"availableQuantity\", \"unitCost\")\nVALUES (:purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,\n        :unitCost!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderLineItem" ("purchaseOrderId", "productVariantId", "shopifyOrderLineItemId", quantity,
 *                                      "availableQuantity", "unitCost")
 * VALUES (:purchaseOrderId!, :productVariantId!, :shopifyOrderLineItemId, :quantity!, :availableQuantity!,
 *         :unitCost!)
 * ```
 */
export const insertLineItem = new PreparedQuery<IInsertLineItemParams,IInsertLineItemResult>(insertLineItemIR);


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
  purchaseOrderId: number;
}

/** 'InsertAssignedEmployee' return type */
export type IInsertAssignedEmployeeResult = void;

/** 'InsertAssignedEmployee' query type */
export interface IInsertAssignedEmployeeQuery {
  params: IInsertAssignedEmployeeParams;
  result: IInsertAssignedEmployeeResult;
}

const insertAssignedEmployeeIR: any = {"usedParamSet":{"purchaseOrderId":true,"employeeId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":104}]},{"name":"employeeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":118}]}],"statement":"INSERT INTO \"PurchaseOrderEmployeeAssignment\" (\"purchaseOrderId\", \"employeeId\")\nVALUES (:purchaseOrderId!, :employeeId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId")
 * VALUES (:purchaseOrderId!, :employeeId!)
 * ```
 */
export const insertAssignedEmployee = new PreparedQuery<IInsertAssignedEmployeeParams,IInsertAssignedEmployeeResult>(insertAssignedEmployeeIR);


/** 'GetCustomFieldsPresets' parameters type */
export interface IGetCustomFieldsPresetsParams {
  shop: string;
}

/** 'GetCustomFieldsPresets' return type */
export interface IGetCustomFieldsPresetsResult {
  createdAt: Date;
  id: number;
  keys: stringArray | null;
  name: string;
  shop: string;
  updatedAt: Date;
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

const getProductVariantCostsForShopIR: any = {"usedParamSet":{"shop":true,"productVariantId":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":146}]},{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":192}]}],"statement":"SELECT \"unitCost\", \"quantity\"\nFROM \"PurchaseOrderLineItem\"\n       INNER JOIN \"PurchaseOrder\" po ON \"purchaseOrderId\" = po.id\nWHERE po.shop = :shop!\n  AND \"productVariantId\" = :productVariantId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT "unitCost", "quantity"
 * FROM "PurchaseOrderLineItem"
 *        INNER JOIN "PurchaseOrder" po ON "purchaseOrderId" = po.id
 * WHERE po.shop = :shop!
 *   AND "productVariantId" = :productVariantId!
 * ```
 */
export const getProductVariantCostsForShop = new PreparedQuery<IGetProductVariantCostsForShopParams,IGetProductVariantCostsForShopResult>(getProductVariantCostsForShopIR);



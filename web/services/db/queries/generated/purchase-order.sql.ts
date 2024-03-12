/** Types generated for queries found in "services/db/queries/purchase-order.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetPage' parameters type */
export interface IGetPageParams {
  customerId?: string | null | void;
  limit: NumberOrString;
  offset?: NumberOrString | null | void;
  query?: string | null | void;
  shop: string;
  status?: string | null | void;
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

const getPageIR: any = {"usedParamSet":{"shop":true,"status":true,"customerId":true,"query":true,"limit":true,"offset":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":996,"b":1001}]},{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":1030,"b":1036}]},{"name":"customerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1101,"b":1111}]},{"name":"query","required":false,"transform":{"type":"scalar"},"locs":[{"a":1163,"b":1168},{"a":1206,"b":1211},{"a":1257,"b":1262},{"a":1308,"b":1313},{"a":1350,"b":1355},{"a":1393,"b":1398},{"a":1440,"b":1445},{"a":1489,"b":1494},{"a":1532,"b":1537},{"a":1574,"b":1579},{"a":1620,"b":1625},{"a":1665,"b":1670},{"a":1711,"b":1716},{"a":1753,"b":1758}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1796,"b":1802}]},{"name":"offset","required":false,"transform":{"type":"scalar"},"locs":[{"a":1811,"b":1817}]}],"statement":"SELECT DISTINCT po.id, po.name\nFROM \"PurchaseOrder\" po\n       LEFT JOIN \"PurchaseOrderLineItem\" poli ON po.id = poli.\"purchaseOrderId\"\n       LEFT JOIN \"ProductVariant\" pv ON poli.\"productVariantId\" = pv.\"productVariantId\"\n       LEFT JOIN \"Product\" p ON pv.\"productId\" = p.\"productId\"\n       LEFT JOIN \"PurchaseOrderCustomField\" pocf ON po.id = pocf.\"purchaseOrderId\"\n       LEFT JOIN \"PurchaseOrderEmployeeAssignment\" poea ON po.id = poea.\"purchaseOrderId\"\n       LEFT JOIN \"Employee\" e ON poea.\"employeeId\" = e.\"staffMemberId\"\n       LEFT JOIN \"Location\" l ON po.\"locationId\" = l.\"locationId\"\n       LEFT JOIN \"ShopifyOrderLineItem\" soli ON poli.\"shopifyOrderLineItemId\" = soli.\"lineItemId\"\n       LEFT JOIN \"ShopifyOrder\" so ON soli.\"orderId\" = so.\"orderId\"\n       LEFT JOIN \"Customer\" c ON so.\"customerId\" = c.\"customerId\"\n       LEFT JOIN \"WorkOrderItem\" woi ON soli.\"lineItemId\" = woi.\"shopifyOrderLineItemId\"\n       LEFT JOIN \"WorkOrder\" wo ON woi.\"workOrderId\" = wo.\"id\"\nWHERE po.shop = :shop!\n  AND po.status = COALESCE(:status, po.status)\n  AND c.\"customerId\" IS NOT DISTINCT FROM COALESCE(:customerId, c.\"customerId\")\n  AND (\n  po.name ILIKE COALESCE(:query, '%')\n    OR po.note ILIKE COALESCE(:query, '%')\n    OR po.\"vendorName\" ILIKE COALESCE(:query, '%')\n    OR c.\"displayName\" ILIKE COALESCE(:query, '%')\n    OR l.name ILIKE COALESCE(:query, '%')\n    OR so.name ILIKE COALESCE(:query, '%')\n    OR po.\"shipTo\" ILIKE COALESCE(:query, '%')\n    OR po.\"shipFrom\" ILIKE COALESCE(:query, '%')\n    OR wo.name ILIKE COALESCE(:query, '%')\n    OR pv.sku ILIKE COALESCE(:query, '%')\n    OR pv.\"title\" ILIKE COALESCE(:query, '%')\n    OR p.\"title\" ILIKE COALESCE(:query, '%')\n    OR pocf.value ILIKE COALESCE(:query, '%')\n    OR e.name ILIKE COALESCE(:query, '%')\n  )\nORDER BY po.id DESC\nLIMIT :limit! OFFSET :offset"};

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
 *        LEFT JOIN "Location" l ON po."locationId" = l."locationId"
 *        LEFT JOIN "ShopifyOrderLineItem" soli ON poli."shopifyOrderLineItemId" = soli."lineItemId"
 *        LEFT JOIN "ShopifyOrder" so ON soli."orderId" = so."orderId"
 *        LEFT JOIN "Customer" c ON so."customerId" = c."customerId"
 *        LEFT JOIN "WorkOrderItem" woi ON soli."lineItemId" = woi."shopifyOrderLineItemId"
 *        LEFT JOIN "WorkOrder" wo ON woi."workOrderId" = wo."id"
 * WHERE po.shop = :shop!
 *   AND po.status = COALESCE(:status, po.status)
 *   AND c."customerId" IS NOT DISTINCT FROM COALESCE(:customerId, c."customerId")
 *   AND (
 *   po.name ILIKE COALESCE(:query, '%')
 *     OR po.note ILIKE COALESCE(:query, '%')
 *     OR po."vendorName" ILIKE COALESCE(:query, '%')
 *     OR c."displayName" ILIKE COALESCE(:query, '%')
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
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  paid: string | null;
  shipFrom: string;
  shipping: string | null;
  shipTo: string;
  shop: string;
  status: string;
  tax: string | null;
  updatedAt: Date;
  vendorName: string | null;
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
  deposited?: string | null | void;
  discount?: string | null | void;
  locationId?: string | null | void;
  name: string;
  note: string;
  paid?: string | null | void;
  shipFrom: string;
  shipping?: string | null | void;
  shipTo: string;
  shop: string;
  status: string;
  tax?: string | null | void;
  vendorName?: string | null | void;
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

const upsertIR: any = {"usedParamSet":{"shop":true,"locationId":true,"discount":true,"tax":true,"shipping":true,"deposited":true,"paid":true,"name":true,"status":true,"shipFrom":true,"shipTo":true,"note":true,"vendorName":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":184,"b":189}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":192,"b":202},{"a":439,"b":449}]},{"name":"discount","required":false,"transform":{"type":"scalar"},"locs":[{"a":205,"b":213},{"a":501,"b":509}]},{"name":"tax","required":false,"transform":{"type":"scalar"},"locs":[{"a":216,"b":219},{"a":533,"b":536}]},{"name":"shipping","required":false,"transform":{"type":"scalar"},"locs":[{"a":222,"b":230},{"a":560,"b":568}]},{"name":"deposited","required":false,"transform":{"type":"scalar"},"locs":[{"a":233,"b":242},{"a":592,"b":601}]},{"name":"paid","required":false,"transform":{"type":"scalar"},"locs":[{"a":245,"b":249},{"a":625,"b":629}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":257}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":267},{"a":653,"b":660}]},{"name":"shipFrom","required":true,"transform":{"type":"scalar"},"locs":[{"a":270,"b":279},{"a":377,"b":385}]},{"name":"shipTo","required":true,"transform":{"type":"scalar"},"locs":[{"a":282,"b":289},{"a":409,"b":415}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":300,"b":305},{"a":473,"b":477}]},{"name":"vendorName","required":false,"transform":{"type":"scalar"},"locs":[{"a":308,"b":318},{"a":684,"b":694}]}],"statement":"INSERT INTO \"PurchaseOrder\" (shop, \"locationId\", discount, tax, shipping, deposited, paid, name, status, \"shipFrom\",\n                             \"shipTo\", note, \"vendorName\")\nVALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,\n        :note!, :vendorName)\nON CONFLICT (shop, name) DO UPDATE\n  SET \"shipFrom\"   = :shipFrom,\n      \"shipTo\"     = :shipTo,\n      \"locationId\" = :locationId,\n      note         = :note,\n      discount     = :discount,\n      tax          = :tax,\n      shipping     = :shipping,\n      deposited    = :deposited,\n      paid         = :paid,\n      status       = :status!,\n      \"vendorName\" = :vendorName\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "PurchaseOrder" (shop, "locationId", discount, tax, shipping, deposited, paid, name, status, "shipFrom",
 *                              "shipTo", note, "vendorName")
 * VALUES (:shop!, :locationId, :discount, :tax, :shipping, :deposited, :paid, :name!, :status!, :shipFrom!, :shipTo!,
 *         :note!, :vendorName)
 * ON CONFLICT (shop, name) DO UPDATE
 *   SET "shipFrom"   = :shipFrom,
 *       "shipTo"     = :shipTo,
 *       "locationId" = :locationId,
 *       note         = :note,
 *       discount     = :discount,
 *       tax          = :tax,
 *       shipping     = :shipping,
 *       deposited    = :deposited,
 *       paid         = :paid,
 *       status       = :status!,
 *       "vendorName" = :vendorName
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


/** 'UpdateLineItem' parameters type */
export interface IUpdateLineItemParams {
  id: number;
  shopifyOrderLineItemId?: string | null | void;
}

/** 'UpdateLineItem' return type */
export type IUpdateLineItemResult = void;

/** 'UpdateLineItem' query type */
export interface IUpdateLineItemQuery {
  params: IUpdateLineItemParams;
  result: IUpdateLineItemResult;
}

const updateLineItemIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"id":true},"params":[{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":62,"b":84}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":100}]}],"statement":"UPDATE \"PurchaseOrderLineItem\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId\nWHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "PurchaseOrderLineItem"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId
 * WHERE id = :id!
 * ```
 */
export const updateLineItem = new PreparedQuery<IUpdateLineItemParams,IUpdateLineItemResult>(updateLineItemIR);


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


/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' parameters type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams {
  shopifyOrderLineItemId: string;
}

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' return type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult {
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

/** 'GetPurchaseOrderLineItemsByShopifyOrderLineItemId' query type */
export interface IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdQuery {
  params: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams;
  result: IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult;
}

const getPurchaseOrderLineItemsByShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":94}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * ```
 */
export const getPurchaseOrderLineItemsByShopifyOrderLineItemId = new PreparedQuery<IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdParams,IGetPurchaseOrderLineItemsByShopifyOrderLineItemIdResult>(getPurchaseOrderLineItemsByShopifyOrderLineItemIdIR);



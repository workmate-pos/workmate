/** Types generated for queries found in "services/db/queries/work-order-so-li-migration.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export type DateOrString = Date | string;

/** 'GetAllOld' parameters type */
export type IGetAllOldParams = void;

/** 'GetAllOld' return type */
export interface IGetAllOldResult {
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

/** 'GetAllOld' query type */
export interface IGetAllOldQuery {
  params: IGetAllOldParams;
  result: IGetAllOldResult;
}

const getAllOldIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"OldWorkOrder\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "OldWorkOrder"
 * ```
 */
export const getAllOld = new PreparedQuery<IGetAllOldParams,IGetAllOldResult>(getAllOldIR);


/** 'GetOldHourlyLabours' parameters type */
export interface IGetOldHourlyLaboursParams {
  workOrderId: number;
}

/** 'GetOldHourlyLabours' return type */
export interface IGetOldHourlyLaboursResult {
  employeeId: string | null;
  hours: string;
  id: number;
  lineItemUuid: string | null;
  name: string;
  productVariantId: string | null;
  rate: string;
  workOrderId: number;
}

/** 'GetOldHourlyLabours' query type */
export interface IGetOldHourlyLaboursQuery {
  params: IGetOldHourlyLaboursParams;
  result: IGetOldHourlyLaboursResult;
}

const getOldHourlyLaboursIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":66}]}],"statement":"SELECT *\nFROM \"OldHourlyLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "OldHourlyLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getOldHourlyLabours = new PreparedQuery<IGetOldHourlyLaboursParams,IGetOldHourlyLaboursResult>(getOldHourlyLaboursIR);


/** 'GetOldFixedPriceLabours' parameters type */
export interface IGetOldFixedPriceLaboursParams {
  workOrderId: number;
}

/** 'GetOldFixedPriceLabours' return type */
export interface IGetOldFixedPriceLaboursResult {
  amount: string;
  employeeId: string | null;
  id: number;
  lineItemUuid: string | null;
  name: string;
  productVariantId: string | null;
  workOrderId: number;
}

/** 'GetOldFixedPriceLabours' query type */
export interface IGetOldFixedPriceLaboursQuery {
  params: IGetOldFixedPriceLaboursParams;
  result: IGetOldFixedPriceLaboursResult;
}

const getOldFixedPriceLaboursIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":70}]}],"statement":"SELECT *\nFROM \"OldFixedPriceLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "OldFixedPriceLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getOldFixedPriceLabours = new PreparedQuery<IGetOldFixedPriceLaboursParams,IGetOldFixedPriceLaboursResult>(getOldFixedPriceLaboursIR);


/** 'RemoveOldWorkOrder' parameters type */
export interface IRemoveOldWorkOrderParams {
  workOrderId: number;
}

/** 'RemoveOldWorkOrder' return type */
export type IRemoveOldWorkOrderResult = void;

/** 'RemoveOldWorkOrder' query type */
export interface IRemoveOldWorkOrderQuery {
  params: IRemoveOldWorkOrderParams;
  result: IRemoveOldWorkOrderResult;
}

const removeOldWorkOrderIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":38,"b":50}]}],"statement":"DELETE\nFROM \"OldWorkOrder\"\nWHERE id = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldWorkOrder"
 * WHERE id = :workOrderId!
 * ```
 */
export const removeOldWorkOrder = new PreparedQuery<IRemoveOldWorkOrderParams,IRemoveOldWorkOrderResult>(removeOldWorkOrderIR);


/** 'RemoveOldHourlyLabour' parameters type */
export interface IRemoveOldHourlyLabourParams {
  workOrderId: number;
}

/** 'RemoveOldHourlyLabour' return type */
export type IRemoveOldHourlyLabourResult = void;

/** 'RemoveOldHourlyLabour' query type */
export interface IRemoveOldHourlyLabourQuery {
  params: IRemoveOldHourlyLabourParams;
  result: IRemoveOldHourlyLabourResult;
}

const removeOldHourlyLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":52,"b":64}]}],"statement":"DELETE\nFROM \"OldHourlyLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldHourlyLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const removeOldHourlyLabour = new PreparedQuery<IRemoveOldHourlyLabourParams,IRemoveOldHourlyLabourResult>(removeOldHourlyLabourIR);


/** 'RemoveOldFixedPriceLabour' parameters type */
export interface IRemoveOldFixedPriceLabourParams {
  workOrderId: number;
}

/** 'RemoveOldFixedPriceLabour' return type */
export type IRemoveOldFixedPriceLabourResult = void;

/** 'RemoveOldFixedPriceLabour' query type */
export interface IRemoveOldFixedPriceLabourQuery {
  params: IRemoveOldFixedPriceLabourParams;
  result: IRemoveOldFixedPriceLabourResult;
}

const removeOldFixedPriceLabourIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":56,"b":68}]}],"statement":"DELETE\nFROM \"OldFixedPriceLabour\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldFixedPriceLabour"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const removeOldFixedPriceLabour = new PreparedQuery<IRemoveOldFixedPriceLabourParams,IRemoveOldFixedPriceLabourResult>(removeOldFixedPriceLabourIR);


/** 'CreateNewWorkOrder' parameters type */
export interface ICreateNewWorkOrderParams {
  customerId: string;
  derivedFromOrderId?: string | null | void;
  dueDate: DateOrString;
  name: string;
  note: string;
  shop: string;
  status: string;
}

/** 'CreateNewWorkOrder' return type */
export interface ICreateNewWorkOrderResult {
  companyContactId: string | null;
  companyId: string | null;
  companyLocationId: string | null;
  createdAt: Date;
  customerId: string;
  derivedFromOrderId: string | null;
  discountAmount: string | null;
  discountType: DiscountType | null;
  dueDate: Date;
  id: number;
  internalNote: string;
  name: string;
  note: string;
  paymentFixedDueDate: Date | null;
  paymentTermsTemplateId: string | null;
  shop: string;
  status: string;
  updatedAt: Date;
}

/** 'CreateNewWorkOrder' query type */
export interface ICreateNewWorkOrderQuery {
  params: ICreateNewWorkOrderParams;
  result: ICreateNewWorkOrderResult;
}

const createNewWorkOrderIR: any = {"usedParamSet":{"shop":true,"name":true,"customerId":true,"derivedFromOrderId":true,"dueDate":true,"note":true,"status":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":156,"b":161}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":164,"b":169}]},{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":183}]},{"name":"derivedFromOrderId","required":false,"transform":{"type":"scalar"},"locs":[{"a":186,"b":204}]},{"name":"dueDate","required":true,"transform":{"type":"scalar"},"locs":[{"a":207,"b":215}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":223}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":233}]}],"statement":"INSERT INTO \"WorkOrder\" (shop, name, \"customerId\", \"derivedFromOrderId\", \"dueDate\", note, status, \"discountAmount\", \"discountType\", \"internalNote\")\nVALUES (:shop!, :name!, :customerId!, :derivedFromOrderId, :dueDate!, :note!, :status!, NULL, NULL, '')\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrder" (shop, name, "customerId", "derivedFromOrderId", "dueDate", note, status, "discountAmount", "discountType", "internalNote")
 * VALUES (:shop!, :name!, :customerId!, :derivedFromOrderId, :dueDate!, :note!, :status!, NULL, NULL, '')
 * RETURNING *
 * ```
 */
export const createNewWorkOrder = new PreparedQuery<ICreateNewWorkOrderParams,ICreateNewWorkOrderResult>(createNewWorkOrderIR);


/** 'CreateNewWorkOrderItem' parameters type */
export interface ICreateNewWorkOrderItemParams {
  absorbCharges: boolean;
  productVariantId?: string | null | void;
  quantity: number;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
}

/** 'CreateNewWorkOrderItem' return type */
export interface ICreateNewWorkOrderItemResult {
  absorbCharges: boolean;
  createdAt: Date;
  productVariantId: string;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  updatedAt: Date;
  uuid: string;
  workOrderId: number;
}

/** 'CreateNewWorkOrderItem' query type */
export interface ICreateNewWorkOrderItemQuery {
  params: ICreateNewWorkOrderItemParams;
  result: ICreateNewWorkOrderItemResult;
}

const createNewWorkOrderItemIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true,"shopifyOrderLineItemId":true,"productVariantId":true,"absorbCharges":true,"quantity":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":143}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":146,"b":151}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":176}]},{"name":"productVariantId","required":false,"transform":{"type":"scalar"},"locs":[{"a":179,"b":195}]},{"name":"absorbCharges","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":212}]},{"name":"quantity","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":224}]}],"statement":"INSERT INTO \"WorkOrderItem\" (\"workOrderId\", uuid, \"shopifyOrderLineItemId\", \"productVariantId\", \"absorbCharges\", quantity)\nVALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :productVariantId, :absorbCharges!, :quantity!)\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", "productVariantId", "absorbCharges", quantity)
 * VALUES (:workOrderId!, :uuid!, :shopifyOrderLineItemId, :productVariantId, :absorbCharges!, :quantity!)
 * RETURNING *
 * ```
 */
export const createNewWorkOrderItem = new PreparedQuery<ICreateNewWorkOrderItemParams,ICreateNewWorkOrderItemResult>(createNewWorkOrderItemIR);


/** 'CreateNewWorkOrderHourlyLabourCharge' parameters type */
export interface ICreateNewWorkOrderHourlyLabourChargeParams {
  employeeId?: string | null | void;
  hours?: string | null | void;
  name?: string | null | void;
  rate?: string | null | void;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'CreateNewWorkOrderHourlyLabourCharge' return type */
export type ICreateNewWorkOrderHourlyLabourChargeResult = void;

/** 'CreateNewWorkOrderHourlyLabourCharge' query type */
export interface ICreateNewWorkOrderHourlyLabourChargeQuery {
  params: ICreateNewWorkOrderHourlyLabourChargeParams;
  result: ICreateNewWorkOrderHourlyLabourChargeResult;
}

const createNewWorkOrderHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"employeeId":true,"name":true,"rate":true,"hours":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":209}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":217}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":220,"b":237}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":240,"b":262}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":265,"b":275}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":278,"b":282}]},{"name":"rate","required":false,"transform":{"type":"scalar"},"locs":[{"a":285,"b":289}]},{"name":"hours","required":false,"transform":{"type":"scalar"},"locs":[{"a":292,"b":297}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", uuid, \"workOrderItemUuid\", \"shopifyOrderLineItemId\", \"employeeId\", name, rate, hours, \"hoursLocked\", \"rateLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :rate, :hours, FALSE, FALSE, FALSE)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", uuid, "workOrderItemUuid", "shopifyOrderLineItemId", "employeeId", name, rate, hours, "hoursLocked", "rateLocked", "removeLocked")
 * VALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :rate, :hours, FALSE, FALSE, FALSE)
 * ```
 */
export const createNewWorkOrderHourlyLabourCharge = new PreparedQuery<ICreateNewWorkOrderHourlyLabourChargeParams,ICreateNewWorkOrderHourlyLabourChargeResult>(createNewWorkOrderHourlyLabourChargeIR);


/** 'CreateNewWorkOrderFixedPriceLabourCharge' parameters type */
export interface ICreateNewWorkOrderFixedPriceLabourChargeParams {
  amount?: string | null | void;
  employeeId?: string | null | void;
  name?: string | null | void;
  shopifyOrderLineItemId?: string | null | void;
  uuid: string;
  workOrderId: number;
  workOrderItemUuid?: string | null | void;
}

/** 'CreateNewWorkOrderFixedPriceLabourCharge' return type */
export type ICreateNewWorkOrderFixedPriceLabourChargeResult = void;

/** 'CreateNewWorkOrderFixedPriceLabourCharge' query type */
export interface ICreateNewWorkOrderFixedPriceLabourChargeQuery {
  params: ICreateNewWorkOrderFixedPriceLabourChargeParams;
  result: ICreateNewWorkOrderFixedPriceLabourChargeResult;
}

const createNewWorkOrderFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true,"workOrderItemUuid":true,"shopifyOrderLineItemId":true,"employeeId":true,"name":true,"amount":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":195}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":203}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":206,"b":223}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":226,"b":248}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":251,"b":261}]},{"name":"name","required":false,"transform":{"type":"scalar"},"locs":[{"a":264,"b":268}]},{"name":"amount","required":false,"transform":{"type":"scalar"},"locs":[{"a":271,"b":277}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", uuid, \"workOrderItemUuid\", \"shopifyOrderLineItemId\", \"employeeId\", name, amount, \"amountLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :amount, FALSE, FALSE)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", uuid, "workOrderItemUuid", "shopifyOrderLineItemId", "employeeId", name, amount, "amountLocked", "removeLocked")
 * VALUES (:workOrderId!, :uuid!, :workOrderItemUuid, :shopifyOrderLineItemId, :employeeId, :name, :amount, FALSE, FALSE)
 * ```
 */
export const createNewWorkOrderFixedPriceLabourCharge = new PreparedQuery<ICreateNewWorkOrderFixedPriceLabourChargeParams,ICreateNewWorkOrderFixedPriceLabourChargeResult>(createNewWorkOrderFixedPriceLabourChargeIR);


/** 'GetProductVariants' parameters type */
export type IGetProductVariantsParams = void;

/** 'GetProductVariants' return type */
export interface IGetProductVariantsResult {
  createdAt: Date;
  deletedAt: Date | null;
  inventoryItemId: string;
  productId: string;
  productVariantId: string;
  sku: string | null;
  title: string;
  updatedAt: Date;
}

/** 'GetProductVariants' query type */
export interface IGetProductVariantsQuery {
  params: IGetProductVariantsParams;
  result: IGetProductVariantsResult;
}

const getProductVariantsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"ProductVariant\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ProductVariant"
 * ```
 */
export const getProductVariants = new PreparedQuery<IGetProductVariantsParams,IGetProductVariantsResult>(getProductVariantsIR);


/** 'GetPurchaseOrders' parameters type */
export type IGetPurchaseOrdersParams = void;

/** 'GetPurchaseOrders' return type */
export interface IGetPurchaseOrdersResult {
  createdAt: Date;
  deposited: string | null;
  discount: string | null;
  id: number;
  locationId: string | null;
  name: string;
  note: string;
  paid: string | null;
  placedDate: Date | null;
  shipFrom: string;
  shipping: string | null;
  shipTo: string;
  shop: string;
  status: string;
  tax: string | null;
  updatedAt: Date;
  vendorName: string | null;
}

/** 'GetPurchaseOrders' query type */
export interface IGetPurchaseOrdersQuery {
  params: IGetPurchaseOrdersParams;
  result: IGetPurchaseOrdersResult;
}

const getPurchaseOrdersIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"PurchaseOrder\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrder"
 * ```
 */
export const getPurchaseOrders = new PreparedQuery<IGetPurchaseOrdersParams,IGetPurchaseOrdersResult>(getPurchaseOrdersIR);


/** 'GetPurchaseOrderLineItems' parameters type */
export interface IGetPurchaseOrderLineItemsParams {
  purchaseOrderId: number;
}

/** 'GetPurchaseOrderLineItems' return type */
export interface IGetPurchaseOrderLineItemsResult {
  availableQuantity: number;
  createdAt: Date;
  productVariantId: string;
  purchaseOrderId: number;
  quantity: number;
  shopifyOrderLineItemId: string | null;
  unitCost: string;
  updatedAt: Date;
  uuid: string;
}

/** 'GetPurchaseOrderLineItems' query type */
export interface IGetPurchaseOrderLineItemsQuery {
  params: IGetPurchaseOrderLineItemsParams;
  result: IGetPurchaseOrderLineItemsResult;
}

const getPurchaseOrderLineItemsIR: any = {"usedParamSet":{"purchaseOrderId":true},"params":[{"name":"purchaseOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":80}]}],"statement":"SELECT *\nFROM \"PurchaseOrderLineItem\"\nWHERE \"purchaseOrderId\" = :purchaseOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "PurchaseOrderLineItem"
 * WHERE "purchaseOrderId" = :purchaseOrderId!
 * ```
 */
export const getPurchaseOrderLineItems = new PreparedQuery<IGetPurchaseOrderLineItemsParams,IGetPurchaseOrderLineItemsResult>(getPurchaseOrderLineItemsIR);


/** 'RemovePlaceholderProduct' parameters type */
export type IRemovePlaceholderProductParams = void;

/** 'RemovePlaceholderProduct' return type */
export type IRemovePlaceholderProductResult = void;

/** 'RemovePlaceholderProduct' query type */
export interface IRemovePlaceholderProductQuery {
  params: IRemovePlaceholderProductParams;
  result: IRemovePlaceholderProductResult;
}

const removePlaceholderProductIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE\nFROM \"Product\"\nWHERE \"productId\" = 'gid://shopify/Product/placeholder'"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "Product"
 * WHERE "productId" = 'gid://shopify/Product/placeholder'
 * ```
 */
export const removePlaceholderProduct = new PreparedQuery<IRemovePlaceholderProductParams,IRemovePlaceholderProductResult>(removePlaceholderProductIR);


/** 'RemovePlaceholderProductVariants' parameters type */
export type IRemovePlaceholderProductVariantsParams = void;

/** 'RemovePlaceholderProductVariants' return type */
export type IRemovePlaceholderProductVariantsResult = void;

/** 'RemovePlaceholderProductVariants' query type */
export interface IRemovePlaceholderProductVariantsQuery {
  params: IRemovePlaceholderProductVariantsParams;
  result: IRemovePlaceholderProductVariantsResult;
}

const removePlaceholderProductVariantsIR: any = {"usedParamSet":{},"params":[],"statement":"DELETE\nFROM \"ProductVariant\"\nWHERE \"productId\" = 'gid://shopify/Product/placeholder'"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "ProductVariant"
 * WHERE "productId" = 'gid://shopify/Product/placeholder'
 * ```
 */
export const removePlaceholderProductVariants = new PreparedQuery<IRemovePlaceholderProductVariantsParams,IRemovePlaceholderProductVariantsResult>(removePlaceholderProductVariantsIR);


/** 'RemoveShopPurchaseOrderLineItems' parameters type */
export interface IRemoveShopPurchaseOrderLineItemsParams {
  shop: string;
}

/** 'RemoveShopPurchaseOrderLineItems' return type */
export type IRemoveShopPurchaseOrderLineItemsResult = void;

/** 'RemoveShopPurchaseOrderLineItems' query type */
export interface IRemoveShopPurchaseOrderLineItemsQuery {
  params: IRemoveShopPurchaseOrderLineItemsParams;
  result: IRemoveShopPurchaseOrderLineItemsResult;
}

const removeShopPurchaseOrderLineItemsIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":123,"b":128}]}],"statement":"DELETE\nFROM \"PurchaseOrderLineItem\" poli\nUSING \"PurchaseOrder\" po\nWHERE poli.\"purchaseOrderId\" = po.\"id\"\n  AND po.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderLineItem" poli
 * USING "PurchaseOrder" po
 * WHERE poli."purchaseOrderId" = po."id"
 *   AND po."shop" = :shop!
 * ```
 */
export const removeShopPurchaseOrderLineItems = new PreparedQuery<IRemoveShopPurchaseOrderLineItemsParams,IRemoveShopPurchaseOrderLineItemsResult>(removeShopPurchaseOrderLineItemsIR);


/** 'RemovePurchaseOrderEmployeeAssignments' parameters type */
export interface IRemovePurchaseOrderEmployeeAssignmentsParams {
  shop: string;
}

/** 'RemovePurchaseOrderEmployeeAssignments' return type */
export type IRemovePurchaseOrderEmployeeAssignmentsResult = void;

/** 'RemovePurchaseOrderEmployeeAssignments' query type */
export interface IRemovePurchaseOrderEmployeeAssignmentsQuery {
  params: IRemovePurchaseOrderEmployeeAssignmentsParams;
  result: IRemovePurchaseOrderEmployeeAssignmentsResult;
}

const removePurchaseOrderEmployeeAssignmentsIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":138}]}],"statement":"DELETE\nFROM \"PurchaseOrderEmployeeAssignment\" poea\nUSING \"PurchaseOrder\" po\nWHERE poea.\"purchaseOrderId\" = po.\"id\"\n  AND po.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderEmployeeAssignment" poea
 * USING "PurchaseOrder" po
 * WHERE poea."purchaseOrderId" = po."id"
 *   AND po."shop" = :shop!
 * ```
 */
export const removePurchaseOrderEmployeeAssignments = new PreparedQuery<IRemovePurchaseOrderEmployeeAssignmentsParams,IRemovePurchaseOrderEmployeeAssignmentsResult>(removePurchaseOrderEmployeeAssignmentsIR);


/** 'RemoveShopPurchaseOrderCustomFields' parameters type */
export interface IRemoveShopPurchaseOrderCustomFieldsParams {
  shop: string;
}

/** 'RemoveShopPurchaseOrderCustomFields' return type */
export type IRemoveShopPurchaseOrderCustomFieldsResult = void;

/** 'RemoveShopPurchaseOrderCustomFields' query type */
export interface IRemoveShopPurchaseOrderCustomFieldsQuery {
  params: IRemoveShopPurchaseOrderCustomFieldsParams;
  result: IRemoveShopPurchaseOrderCustomFieldsResult;
}

const removeShopPurchaseOrderCustomFieldsIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":133}]}],"statement":"DELETE\nFROM \"PurchaseOrderCustomField\" polcf\nUSING \"PurchaseOrder\" po\nWHERE polcf.\"purchaseOrderId\" = po.\"id\"\n  AND po.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrderCustomField" polcf
 * USING "PurchaseOrder" po
 * WHERE polcf."purchaseOrderId" = po."id"
 *   AND po."shop" = :shop!
 * ```
 */
export const removeShopPurchaseOrderCustomFields = new PreparedQuery<IRemoveShopPurchaseOrderCustomFieldsParams,IRemoveShopPurchaseOrderCustomFieldsResult>(removeShopPurchaseOrderCustomFieldsIR);


/** 'RemoveShopPurchaseOrders' parameters type */
export interface IRemoveShopPurchaseOrdersParams {
  shop: string;
}

/** 'RemoveShopPurchaseOrders' return type */
export type IRemoveShopPurchaseOrdersResult = void;

/** 'RemoveShopPurchaseOrders' query type */
export interface IRemoveShopPurchaseOrdersQuery {
  params: IRemoveShopPurchaseOrdersParams;
  result: IRemoveShopPurchaseOrdersResult;
}

const removeShopPurchaseOrdersIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":43,"b":48}]}],"statement":"DELETE\nFROM \"PurchaseOrder\"\nWHERE \"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "PurchaseOrder"
 * WHERE "shop" = :shop!
 * ```
 */
export const removeShopPurchaseOrders = new PreparedQuery<IRemoveShopPurchaseOrdersParams,IRemoveShopPurchaseOrdersResult>(removeShopPurchaseOrdersIR);


/** 'RemoveShopOldHourlyLabour' parameters type */
export interface IRemoveShopOldHourlyLabourParams {
  shop: string;
}

/** 'RemoveShopOldHourlyLabour' return type */
export type IRemoveShopOldHourlyLabourResult = void;

/** 'RemoveShopOldHourlyLabour' query type */
export interface IRemoveShopOldHourlyLabourQuery {
  params: IRemoveShopOldHourlyLabourParams;
  result: IRemoveShopOldHourlyLabourResult;
}

const removeShopOldHourlyLabourIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":114,"b":119}]}],"statement":"DELETE\nFROM \"OldHourlyLabour\" wohlc\nUSING \"OldWorkOrder\" wo\nWHERE wohlc.\"workOrderId\" = wo.\"id\"\n  AND wo.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldHourlyLabour" wohlc
 * USING "OldWorkOrder" wo
 * WHERE wohlc."workOrderId" = wo."id"
 *   AND wo."shop" = :shop!
 * ```
 */
export const removeShopOldHourlyLabour = new PreparedQuery<IRemoveShopOldHourlyLabourParams,IRemoveShopOldHourlyLabourResult>(removeShopOldHourlyLabourIR);


/** 'RemoveShopOldFixedPriceLabour' parameters type */
export interface IRemoveShopOldFixedPriceLabourParams {
  shop: string;
}

/** 'RemoveShopOldFixedPriceLabour' return type */
export type IRemoveShopOldFixedPriceLabourResult = void;

/** 'RemoveShopOldFixedPriceLabour' query type */
export interface IRemoveShopOldFixedPriceLabourQuery {
  params: IRemoveShopOldFixedPriceLabourParams;
  result: IRemoveShopOldFixedPriceLabourResult;
}

const removeShopOldFixedPriceLabourIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":123}]}],"statement":"DELETE\nFROM \"OldFixedPriceLabour\" woflc\nUSING \"OldWorkOrder\" wo\nWHERE woflc.\"workOrderId\" = wo.\"id\"\n  AND wo.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldFixedPriceLabour" woflc
 * USING "OldWorkOrder" wo
 * WHERE woflc."workOrderId" = wo."id"
 *   AND wo."shop" = :shop!
 * ```
 */
export const removeShopOldFixedPriceLabour = new PreparedQuery<IRemoveShopOldFixedPriceLabourParams,IRemoveShopOldFixedPriceLabourResult>(removeShopOldFixedPriceLabourIR);


/** 'RemoveShopOldWorkOrders' parameters type */
export interface IRemoveShopOldWorkOrdersParams {
  shop: string;
}

/** 'RemoveShopOldWorkOrders' return type */
export type IRemoveShopOldWorkOrdersResult = void;

/** 'RemoveShopOldWorkOrders' query type */
export interface IRemoveShopOldWorkOrdersQuery {
  params: IRemoveShopOldWorkOrdersParams;
  result: IRemoveShopOldWorkOrdersResult;
}

const removeShopOldWorkOrdersIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":48,"b":53}]}],"statement":"DELETE\nFROM \"OldWorkOrder\" wo\nWHERE wo.\"shop\" = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "OldWorkOrder" wo
 * WHERE wo."shop" = :shop!
 * ```
 */
export const removeShopOldWorkOrders = new PreparedQuery<IRemoveShopOldWorkOrdersParams,IRemoveShopOldWorkOrdersResult>(removeShopOldWorkOrdersIR);


/** 'GetMutableServiceCollectionIdSettings' parameters type */
export type IGetMutableServiceCollectionIdSettingsParams = void;

/** 'GetMutableServiceCollectionIdSettings' return type */
export interface IGetMutableServiceCollectionIdSettingsResult {
  createdAt: Date;
  key: string;
  shop: string;
  updatedAt: Date;
  value: string;
}

/** 'GetMutableServiceCollectionIdSettings' query type */
export interface IGetMutableServiceCollectionIdSettingsQuery {
  params: IGetMutableServiceCollectionIdSettingsParams;
  result: IGetMutableServiceCollectionIdSettingsResult;
}

const getMutableServiceCollectionIdSettingsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"Settings\"\nWHERE key = 'mutableServiceCollectionId'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Settings"
 * WHERE key = 'mutableServiceCollectionId'
 * ```
 */
export const getMutableServiceCollectionIdSettings = new PreparedQuery<IGetMutableServiceCollectionIdSettingsParams,IGetMutableServiceCollectionIdSettingsResult>(getMutableServiceCollectionIdSettingsIR);


/** 'GetFixedServiceCollectionIdSettings' parameters type */
export type IGetFixedServiceCollectionIdSettingsParams = void;

/** 'GetFixedServiceCollectionIdSettings' return type */
export interface IGetFixedServiceCollectionIdSettingsResult {
  createdAt: Date;
  key: string;
  shop: string;
  updatedAt: Date;
  value: string;
}

/** 'GetFixedServiceCollectionIdSettings' query type */
export interface IGetFixedServiceCollectionIdSettingsQuery {
  params: IGetFixedServiceCollectionIdSettingsParams;
  result: IGetFixedServiceCollectionIdSettingsResult;
}

const getFixedServiceCollectionIdSettingsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"Settings\"\nWHERE key = 'fixedServiceCollectionId'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Settings"
 * WHERE key = 'fixedServiceCollectionId'
 * ```
 */
export const getFixedServiceCollectionIdSettings = new PreparedQuery<IGetFixedServiceCollectionIdSettingsParams,IGetFixedServiceCollectionIdSettingsResult>(getFixedServiceCollectionIdSettingsIR);


/** 'DeleteShopMutableServiceCollectionIdSetting' parameters type */
export interface IDeleteShopMutableServiceCollectionIdSettingParams {
  shop: string;
}

/** 'DeleteShopMutableServiceCollectionIdSetting' return type */
export type IDeleteShopMutableServiceCollectionIdSettingResult = void;

/** 'DeleteShopMutableServiceCollectionIdSetting' query type */
export interface IDeleteShopMutableServiceCollectionIdSettingQuery {
  params: IDeleteShopMutableServiceCollectionIdSettingParams;
  result: IDeleteShopMutableServiceCollectionIdSettingResult;
}

const deleteShopMutableServiceCollectionIdSettingIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":80}]}],"statement":"DELETE\nFROM \"Settings\"\nWHERE key = 'mutableServiceCollectionId'\nAND shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "Settings"
 * WHERE key = 'mutableServiceCollectionId'
 * AND shop = :shop!
 * ```
 */
export const deleteShopMutableServiceCollectionIdSetting = new PreparedQuery<IDeleteShopMutableServiceCollectionIdSettingParams,IDeleteShopMutableServiceCollectionIdSettingResult>(deleteShopMutableServiceCollectionIdSettingIR);


/** 'DeleteShopFixedServiceCollectionIdSetting' parameters type */
export interface IDeleteShopFixedServiceCollectionIdSettingParams {
  shop: string;
}

/** 'DeleteShopFixedServiceCollectionIdSetting' return type */
export type IDeleteShopFixedServiceCollectionIdSettingResult = void;

/** 'DeleteShopFixedServiceCollectionIdSetting' query type */
export interface IDeleteShopFixedServiceCollectionIdSettingQuery {
  params: IDeleteShopFixedServiceCollectionIdSettingParams;
  result: IDeleteShopFixedServiceCollectionIdSettingResult;
}

const deleteShopFixedServiceCollectionIdSettingIR: any = {"usedParamSet":{"shop":true},"params":[{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":78}]}],"statement":"DELETE\nFROM \"Settings\"\nWHERE key = 'fixedServiceCollectionId'\nAND shop = :shop!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "Settings"
 * WHERE key = 'fixedServiceCollectionId'
 * AND shop = :shop!
 * ```
 */
export const deleteShopFixedServiceCollectionIdSetting = new PreparedQuery<IDeleteShopFixedServiceCollectionIdSettingParams,IDeleteShopFixedServiceCollectionIdSettingResult>(deleteShopFixedServiceCollectionIdSettingIR);



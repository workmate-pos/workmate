/** Types generated for queries found in "services/db/queries/work-order-charges.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** Query 'UpsertHourlyLabourCharge' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertHourlyLabourChargeResult = never;

/** Query 'UpsertHourlyLabourCharge' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertHourlyLabourChargeParams = never;

const upsertHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"rate":true,"hours":true,"workOrderItemUuid":true,"workOrderCustomItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true,"rateLocked":true,"hoursLocked":true,"removeLocked":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":310,"b":322}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":325,"b":335}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":338,"b":343}]},{"name":"rate","required":true,"transform":{"type":"scalar"},"locs":[{"a":346,"b":351}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":354,"b":360}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":380}]},{"name":"workOrderCustomItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":383,"b":406}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":439}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":442,"b":447}]},{"name":"rateLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":458,"b":469}]},{"name":"hoursLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":472,"b":484}]},{"name":"removeLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":487,"b":500}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                           \"workOrderCustomItemUuid\",\n                                           \"shopifyOrderLineItemId\", uuid, \"rateLocked\", \"hoursLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :workOrderCustomItemUuid,\n        :shopifyOrderLineItemId, :uuid!,\n        :rateLocked!, :hoursLocked!, :removeLocked!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"              = EXCLUDED.\"employeeId\",\n      name                      = EXCLUDED.name,\n      rate                      = EXCLUDED.rate,\n      hours                     = EXCLUDED.hours,\n      \"workOrderItemUuid\"       = EXCLUDED.\"workOrderItemUuid\",\n      \"workOrderCustomItemUuid\" = EXCLUDED.\"workOrderCustomItemUuid\",\n      \"shopifyOrderLineItemId\"  = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"rateLocked\"              = EXCLUDED.\"rateLocked\",\n      \"hoursLocked\"             = EXCLUDED.\"hoursLocked\",\n      \"removeLocked\"            = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                            "workOrderCustomItemUuid",
 *                                            "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
 * VALUES (:workOrderId!, :employeeId, :name!, :rate!, :hours!, :workOrderItemUuid, :workOrderCustomItemUuid,
 *         :shopifyOrderLineItemId, :uuid!,
 *         :rateLocked!, :hoursLocked!, :removeLocked!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"              = EXCLUDED."employeeId",
 *       name                      = EXCLUDED.name,
 *       rate                      = EXCLUDED.rate,
 *       hours                     = EXCLUDED.hours,
 *       "workOrderItemUuid"       = EXCLUDED."workOrderItemUuid",
 *       "workOrderCustomItemUuid" = EXCLUDED."workOrderCustomItemUuid",
 *       "shopifyOrderLineItemId"  = EXCLUDED."shopifyOrderLineItemId",
 *       "rateLocked"              = EXCLUDED."rateLocked",
 *       "hoursLocked"             = EXCLUDED."hoursLocked",
 *       "removeLocked"            = EXCLUDED."removeLocked"
 * ```
 */
export const upsertHourlyLabourCharge = new PreparedQuery<IUpsertHourlyLabourChargeParams,IUpsertHourlyLabourChargeResult>(upsertHourlyLabourChargeIR);


/** Query 'UpsertHourlyLabourCharges' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertHourlyLabourChargesResult = never;

/** Query 'UpsertHourlyLabourCharges' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertHourlyLabourChargesParams = never;

const upsertHourlyLabourChargesIR: any = {"usedParamSet":{"charges":true},"params":[{"name":"charges","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"employeeId","required":false},{"name":"name","required":true},{"name":"rate","required":true},{"name":"hours","required":true},{"name":"workOrderItemUuid","required":false},{"name":"workOrderCustomItemUuid","required":false},{"name":"shopifyOrderLineItemId","required":false},{"name":"uuid","required":true},{"name":"rateLocked","required":true},{"name":"hoursLocked","required":true},{"name":"removeLocked","required":true}]},"locs":[{"a":416,"b":423}]}],"statement":"INSERT INTO \"WorkOrderHourlyLabourCharge\" (\"workOrderId\", \"employeeId\", name, rate, hours, \"workOrderItemUuid\",\n                                           \"workOrderCustomItemUuid\",\n                                           \"shopifyOrderLineItemId\", uuid, \"rateLocked\", \"hoursLocked\", \"removeLocked\")\nVALUES (0, NULL, '', '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE, FALSE), :charges\nOFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\nDO UPDATE\nSET \"employeeId\" = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n      rate                     = EXCLUDED.rate,\n      hours                    = EXCLUDED.hours,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"workOrderCustomItemUuid\"      = EXCLUDED.\"workOrderCustomItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"rateLocked\"             = EXCLUDED.\"rateLocked\",\n      \"hoursLocked\"            = EXCLUDED.\"hoursLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderHourlyLabourCharge" ("workOrderId", "employeeId", name, rate, hours, "workOrderItemUuid",
 *                                            "workOrderCustomItemUuid",
 *                                            "shopifyOrderLineItemId", uuid, "rateLocked", "hoursLocked", "removeLocked")
 * VALUES (0, NULL, '', '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE, FALSE), :charges
 * OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 * DO UPDATE
 * SET "employeeId" = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *       rate                     = EXCLUDED.rate,
 *       hours                    = EXCLUDED.hours,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "workOrderCustomItemUuid"      = EXCLUDED."workOrderCustomItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "rateLocked"             = EXCLUDED."rateLocked",
 *       "hoursLocked"            = EXCLUDED."hoursLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertHourlyLabourCharges = new PreparedQuery<IUpsertHourlyLabourChargesParams,IUpsertHourlyLabourChargesResult>(upsertHourlyLabourChargesIR);


/** Query 'UpsertFixedPriceLabourCharge' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertFixedPriceLabourChargeResult = never;

/** Query 'UpsertFixedPriceLabourCharge' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertFixedPriceLabourChargeParams = never;

const upsertFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"employeeId":true,"name":true,"amount":true,"workOrderItemUuid":true,"workOrderCustomItemUuid":true,"shopifyOrderLineItemId":true,"uuid":true,"amountLocked":true,"removeLocked":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":304,"b":316}]},{"name":"employeeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":319,"b":329}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":332,"b":337}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":347}]},{"name":"workOrderItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":350,"b":367}]},{"name":"workOrderCustomItemUuid","required":false,"transform":{"type":"scalar"},"locs":[{"a":370,"b":393}]},{"name":"shopifyOrderLineItemId","required":false,"transform":{"type":"scalar"},"locs":[{"a":404,"b":426}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":429,"b":434}]},{"name":"amountLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":445,"b":458}]},{"name":"removeLocked","required":true,"transform":{"type":"scalar"},"locs":[{"a":461,"b":474}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                               \"workOrderCustomItemUuid\",\n                                               \"shopifyOrderLineItemId\", uuid, \"amountLocked\", \"removeLocked\")\nVALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :workOrderCustomItemUuid,\n        :shopifyOrderLineItemId, :uuid!,\n        :amountLocked!, :removeLocked!)\nON CONFLICT (\"workOrderId\", uuid)\n  DO UPDATE\n  SET \"employeeId\"              = EXCLUDED.\"employeeId\",\n      name                      = EXCLUDED.name,\n      amount                    = EXCLUDED.amount,\n      \"workOrderItemUuid\"       = EXCLUDED.\"workOrderItemUuid\",\n      \"workOrderCustomItemUuid\" = EXCLUDED.\"workOrderCustomItemUuid\",\n      \"shopifyOrderLineItemId\"  = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"amountLocked\"            = EXCLUDED.\"amountLocked\",\n      \"removeLocked\"            = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                                "workOrderCustomItemUuid",
 *                                                "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
 * VALUES (:workOrderId!, :employeeId, :name!, :amount!, :workOrderItemUuid, :workOrderCustomItemUuid,
 *         :shopifyOrderLineItemId, :uuid!,
 *         :amountLocked!, :removeLocked!)
 * ON CONFLICT ("workOrderId", uuid)
 *   DO UPDATE
 *   SET "employeeId"              = EXCLUDED."employeeId",
 *       name                      = EXCLUDED.name,
 *       amount                    = EXCLUDED.amount,
 *       "workOrderItemUuid"       = EXCLUDED."workOrderItemUuid",
 *       "workOrderCustomItemUuid" = EXCLUDED."workOrderCustomItemUuid",
 *       "shopifyOrderLineItemId"  = EXCLUDED."shopifyOrderLineItemId",
 *       "amountLocked"            = EXCLUDED."amountLocked",
 *       "removeLocked"            = EXCLUDED."removeLocked"
 * ```
 */
export const upsertFixedPriceLabourCharge = new PreparedQuery<IUpsertFixedPriceLabourChargeParams,IUpsertFixedPriceLabourChargeResult>(upsertFixedPriceLabourChargeIR);


/** Query 'UpsertFixedPriceLabourCharges' is invalid, so its result is assigned type 'never'.
 *  */
export type IUpsertFixedPriceLabourChargesResult = never;

/** Query 'UpsertFixedPriceLabourCharges' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IUpsertFixedPriceLabourChargesParams = never;

const upsertFixedPriceLabourChargesIR: any = {"usedParamSet":{"charges":true},"params":[{"name":"charges","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"workOrderId","required":true},{"name":"employeeId","required":false},{"name":"name","required":true},{"name":"amount","required":true},{"name":"workOrderItemUuid","required":false},{"name":"workOrderCustomItemUuid","required":false},{"name":"shopifyOrderLineItemId","required":false},{"name":"uuid","required":true},{"name":"amountLocked","required":true},{"name":"removeLocked","required":true}]},"locs":[{"a":399,"b":406}]}],"statement":"INSERT INTO \"WorkOrderFixedPriceLabourCharge\" (\"workOrderId\", \"employeeId\", name, amount, \"workOrderItemUuid\",\n                                               \"workOrderCustomItemUuid\",\n                                               \"shopifyOrderLineItemId\", uuid, \"amountLocked\", \"removeLocked\")\nVALUES (0, NULL, '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE), :charges\nOFFSET 1\nON CONFLICT (\"workOrderId\", uuid)\nDO UPDATE\nSET \"employeeId\" = EXCLUDED.\"employeeId\",\n      name                     = EXCLUDED.name,\n     amount                   = EXCLUDED.amount,\n      \"workOrderItemUuid\"      = EXCLUDED.\"workOrderItemUuid\",\n      \"workOrderCustomItemUuid\"      = EXCLUDED.\"workOrderCustomItemUuid\",\n      \"shopifyOrderLineItemId\" = EXCLUDED.\"shopifyOrderLineItemId\",\n      \"amountLocked\"           = EXCLUDED.\"amountLocked\",\n      \"removeLocked\"           = EXCLUDED.\"removeLocked\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "WorkOrderFixedPriceLabourCharge" ("workOrderId", "employeeId", name, amount, "workOrderItemUuid",
 *                                                "workOrderCustomItemUuid",
 *                                                "shopifyOrderLineItemId", uuid, "amountLocked", "removeLocked")
 * VALUES (0, NULL, '', '', gen_random_uuid(), gen_random_uuid(), NULL, gen_random_uuid(), FALSE, FALSE), :charges
 * OFFSET 1
 * ON CONFLICT ("workOrderId", uuid)
 * DO UPDATE
 * SET "employeeId" = EXCLUDED."employeeId",
 *       name                     = EXCLUDED.name,
 *      amount                   = EXCLUDED.amount,
 *       "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
 *       "workOrderCustomItemUuid"      = EXCLUDED."workOrderCustomItemUuid",
 *       "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
 *       "amountLocked"           = EXCLUDED."amountLocked",
 *       "removeLocked"           = EXCLUDED."removeLocked"
 * ```
 */
export const upsertFixedPriceLabourCharges = new PreparedQuery<IUpsertFixedPriceLabourChargesParams,IUpsertFixedPriceLabourChargesResult>(upsertFixedPriceLabourChargesIR);


/** Query 'RemoveHourlyLabourCharge' is invalid, so its result is assigned type 'never'.
 *  */
export type IRemoveHourlyLabourChargeResult = never;

/** Query 'RemoveHourlyLabourCharge' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IRemoveHourlyLabourChargeParams = never;

const removeHourlyLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":100,"b":105}]}],"statement":"DELETE\nFROM \"WorkOrderHourlyLabourCharge\" hl\nWHERE hl.\"workOrderId\" = :workOrderId!\n  AND hl.uuid = :uuid!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderHourlyLabourCharge" hl
 * WHERE hl."workOrderId" = :workOrderId!
 *   AND hl.uuid = :uuid!
 * ```
 */
export const removeHourlyLabourCharge = new PreparedQuery<IRemoveHourlyLabourChargeParams,IRemoveHourlyLabourChargeResult>(removeHourlyLabourChargeIR);


/** Query 'RemoveFixedPriceLabourCharge' is invalid, so its result is assigned type 'never'.
 *  */
export type IRemoveFixedPriceLabourChargeResult = never;

/** Query 'RemoveFixedPriceLabourCharge' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IRemoveFixedPriceLabourChargeParams = never;

const removeFixedPriceLabourChargeIR: any = {"usedParamSet":{"workOrderId":true,"uuid":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":88}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":112}]}],"statement":"DELETE\nFROM \"WorkOrderFixedPriceLabourCharge\" fpl\nWHERE fpl.\"workOrderId\" = :workOrderId!\n  AND fpl.uuid = :uuid!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE
 * FROM "WorkOrderFixedPriceLabourCharge" fpl
 * WHERE fpl."workOrderId" = :workOrderId!
 *   AND fpl.uuid = :uuid!
 * ```
 */
export const removeFixedPriceLabourCharge = new PreparedQuery<IRemoveFixedPriceLabourChargeParams,IRemoveFixedPriceLabourChargeResult>(removeFixedPriceLabourChargeIR);


/** Query 'GetHourlyLabourCharges' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetHourlyLabourChargesResult = never;

/** Query 'GetHourlyLabourCharges' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetHourlyLabourChargesParams = never;

const getHourlyLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":78}]}],"statement":"SELECT *\nFROM \"WorkOrderHourlyLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderHourlyLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getHourlyLabourCharges = new PreparedQuery<IGetHourlyLabourChargesParams,IGetHourlyLabourChargesResult>(getHourlyLabourChargesIR);


/** Query 'GetFixedPriceLabourCharges' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetFixedPriceLabourChargesResult = never;

/** Query 'GetFixedPriceLabourCharges' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetFixedPriceLabourChargesParams = never;

const getFixedPriceLabourChargesIR: any = {"usedParamSet":{"workOrderId":true},"params":[{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":70,"b":82}]}],"statement":"SELECT *\nFROM \"WorkOrderFixedPriceLabourCharge\"\nWHERE \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderFixedPriceLabourCharge"
 * WHERE "workOrderId" = :workOrderId!
 * ```
 */
export const getFixedPriceLabourCharges = new PreparedQuery<IGetFixedPriceLabourChargesParams,IGetFixedPriceLabourChargesResult>(getFixedPriceLabourChargesIR);


/** Query 'GetHourlyLabourChargesByUuids' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetHourlyLabourChargesByUuidsResult = never;

/** Query 'GetHourlyLabourChargesByUuids' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetHourlyLabourChargesByUuidsParams = never;

const getHourlyLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":58,"b":64}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":100}]}],"statement":"SELECT *\nFROM \"WorkOrderHourlyLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderHourlyLabourCharge"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getHourlyLabourChargesByUuids = new PreparedQuery<IGetHourlyLabourChargesByUuidsParams,IGetHourlyLabourChargesByUuidsResult>(getHourlyLabourChargesByUuidsIR);


/** Query 'GetFixedPriceLabourChargesByUuids' is invalid, so its result is assigned type 'never'.
 *  */
export type IGetFixedPriceLabourChargesByUuidsResult = never;

/** Query 'GetFixedPriceLabourChargesByUuids' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IGetFixedPriceLabourChargesByUuidsParams = never;

const getFixedPriceLabourChargesByUuidsIR: any = {"usedParamSet":{"uuids":true,"workOrderId":true},"params":[{"name":"uuids","required":true,"transform":{"type":"array_spread"},"locs":[{"a":62,"b":68}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":104}]}],"statement":"SELECT *\nFROM \"WorkOrderFixedPriceLabourCharge\"\nWHERE uuid IN :uuids!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "WorkOrderFixedPriceLabourCharge"
 * WHERE uuid IN :uuids!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const getFixedPriceLabourChargesByUuids = new PreparedQuery<IGetFixedPriceLabourChargesByUuidsParams,IGetFixedPriceLabourChargesByUuidsResult>(getFixedPriceLabourChargesByUuidsIR);


/** Query 'SetHourlyLabourChargeShopifyOrderLineItemId' is invalid, so its result is assigned type 'never'.
 *  */
export type ISetHourlyLabourChargeShopifyOrderLineItemIdResult = never;

/** Query 'SetHourlyLabourChargeShopifyOrderLineItemId' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISetHourlyLabourChargeShopifyOrderLineItemIdParams = never;

const setHourlyLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":91}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":111}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]}],"statement":"UPDATE \"WorkOrderHourlyLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderHourlyLabourCharge"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setHourlyLabourChargeShopifyOrderLineItemId = new PreparedQuery<ISetHourlyLabourChargeShopifyOrderLineItemIdParams,ISetHourlyLabourChargeShopifyOrderLineItemIdResult>(setHourlyLabourChargeShopifyOrderLineItemIdIR);


/** Query 'SetFixedPriceLabourChargeShopifyOrderLineItemId' is invalid, so its result is assigned type 'never'.
 *  */
export type ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult = never;

/** Query 'SetFixedPriceLabourChargeShopifyOrderLineItemId' is invalid, so its parameters are assigned type 'never'.
 *  */
export type ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams = never;

const setFixedPriceLabourChargeShopifyOrderLineItemIdIR: any = {"usedParamSet":{"shopifyOrderLineItemId":true,"uuid":true,"workOrderId":true},"params":[{"name":"shopifyOrderLineItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":95}]},{"name":"uuid","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115}]},{"name":"workOrderId","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":151}]}],"statement":"UPDATE \"WorkOrderFixedPriceLabourCharge\"\nSET \"shopifyOrderLineItemId\" = :shopifyOrderLineItemId!\nWHERE uuid = :uuid!\n  AND \"workOrderId\" = :workOrderId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "WorkOrderFixedPriceLabourCharge"
 * SET "shopifyOrderLineItemId" = :shopifyOrderLineItemId!
 * WHERE uuid = :uuid!
 *   AND "workOrderId" = :workOrderId!
 * ```
 */
export const setFixedPriceLabourChargeShopifyOrderLineItemId = new PreparedQuery<ISetFixedPriceLabourChargeShopifyOrderLineItemIdParams,ISetFixedPriceLabourChargeShopifyOrderLineItemIdResult>(setFixedPriceLabourChargeShopifyOrderLineItemIdIR);



import { MergeUnion } from '../../util/types.js';
import { sql, sqlOne } from '../db/sql-tag.js';
import { assertGidOrNull, assertMoneyOrNull } from '../../util/assertions.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { nest } from '../../util/db.js';
import { DateTime } from '../gql/queries/generated/schema.js';
import { UUID } from '@work-orders/common/util/uuid.js';

export type PurchaseOrder = NonNullable<Awaited<ReturnType<typeof getPurchaseOrder>>>;

export async function getPurchaseOrder(filters: MergeUnion<{ id: number } | { shop: string; name: string }>) {
  const [purchaseOrder] = await sql<{
    id: number;
    shop: string;
    locationId: string | null;
    discount: string | null;
    tax: string | null;
    shipping: string | null;
    deposited: string | null;
    paid: string | null;
    name: string;
    status: string;
    shipFrom: string;
    shipTo: string;
    note: string;
    vendorName: string | null;
    createdAt: Date;
    updatedAt: Date;
    placedDate: Date | null;
  }>`
    SELECT *
    FROM "PurchaseOrder"
    WHERE shop = COALESCE(${filters?.shop ?? null}, shop)
      AND name = COALESCE(${filters?.name ?? null}, name)
      AND id = COALESCE(${filters?.id ?? null}, id);`;

  if (!purchaseOrder) {
    return null;
  }

  return mapPurchaseOrder(purchaseOrder);
}

export async function getPurchaseOrdersByIds(purchaseOrderIds: number[]) {
  const purchaseOrders = await sql<{
    id: number;
    shop: string;
    locationId: string | null;
    discount: string | null;
    tax: string | null;
    shipping: string | null;
    deposited: string | null;
    paid: string | null;
    name: string;
    status: string;
    shipFrom: string;
    shipTo: string;
    note: string;
    vendorName: string | null;
    createdAt: Date;
    updatedAt: Date;
    placedDate: Date | null;
  }>`
    SELECT *
    FROM "PurchaseOrder"
    WHERE id = ANY (${purchaseOrderIds})`;

  return purchaseOrders.map(mapPurchaseOrder);
}

function mapPurchaseOrder(purchaseOrder: {
  id: number;
  shop: string;
  locationId: string | null;
  discount: string | null;
  tax: string | null;
  shipping: string | null;
  deposited: string | null;
  paid: string | null;
  name: string;
  status: string;
  shipFrom: string;
  shipTo: string;
  note: string;
  vendorName: string | null;
  createdAt: Date;
  updatedAt: Date;
  placedDate: Date | null;
}) {
  try {
    const { locationId, discount, tax, shipping, deposited, paid } = purchaseOrder;
    assertGidOrNull(locationId);
    assertMoneyOrNull(discount);
    assertMoneyOrNull(tax);
    assertMoneyOrNull(shipping);
    assertMoneyOrNull(deposited);
    assertMoneyOrNull(paid);

    return {
      ...purchaseOrder,
      locationId,
      discount,
      tax,
      shipping,
      deposited,
      paid,
    };
  } catch (error) {
    sentryErr(error, { purchaseOrder });
    throw new HttpError('Unable to parse purchase order', 500);
  }
}

export async function upsertPurchaseOrder({
  name,
  shop,
  status,
  vendorName,
  shipFrom,
  shipTo,
  note,
  shipping,
  deposited,
  discount,
  tax,
  placedDate,
  paid,
  locationId,
}: {
  shop: string;
  locationId: ID | null;
  discount: Money | null;
  tax: Money | null;
  shipping: Money | null;
  deposited: Money | null;
  paid: Money | null;
  name: string;
  status: string;
  shipFrom: string;
  shipTo: string;
  note: string;
  vendorName: string | null;
  placedDate: DateTime | null;
}) {
  const _locationId: string | null = locationId;
  const _discount: string | null = discount;
  const _tax: string | null = tax;
  const _shipping: string | null = shipping;
  const _deposited: string | null = deposited;
  const _paid: string | null = paid;
  const _placedDate: string | null = placedDate;

  return await sqlOne<{ id: number }>`
    INSERT INTO "PurchaseOrder" (shop, "locationId", discount, tax, shipping, deposited, paid, name, status, "shipFrom",
                                 "shipTo", note, "vendorName", "placedDate")
    VALUES (${shop},
            ${_locationId},
            ${_discount},
            ${_tax},
            ${_shipping},
            ${_deposited},
            ${_paid},
            ${name},
            ${status},
            ${shipFrom},
            ${shipTo},
            ${note},
            ${vendorName},
            ${_placedDate} :: timestamptz)
    ON CONFLICT (shop, name) DO UPDATE
      SET "locationId" = EXCLUDED."locationId",
          "discount"   = EXCLUDED."discount",
          "tax"        = EXCLUDED."tax",
          "shipping"   = EXCLUDED."shipping",
          "deposited"  = EXCLUDED."deposited",
          "paid"       = EXCLUDED."paid",
          "status"     = EXCLUDED."status",
          "shipFrom"   = EXCLUDED."shipFrom",
          "shipTo"     = EXCLUDED."shipTo",
          "note"       = EXCLUDED."note",
          "vendorName" = EXCLUDED."vendorName",
          "placedDate" = EXCLUDED."placedDate"
    RETURNING id;`;
}

export async function getPurchaseOrderLineItems(purchaseOrderId: number) {
  const lineItems = await sql<{
    purchaseOrderId: number;
    productVariantId: string;
    quantity: number;
    availableQuantity: number;
    unitCost: string;
    createdAt: Date;
    updatedAt: Date;
    uuid: UUID;
    specialOrderLineItemId: number | null;
    productVariantSerialId: number | null;
  }>`
    SELECT *
    FROM "PurchaseOrderLineItem"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;

  return lineItems.map(mapPurchaseOrderLineItem);
}

function mapPurchaseOrderLineItem<
  T extends {
    purchaseOrderId: number;
    productVariantId: string;
    quantity: number;
    availableQuantity: number;
    unitCost: string;
    createdAt: Date;
    updatedAt: Date;
    specialOrderLineItemId: number | null;
    uuid: UUID;
    productVariantSerialId: number | null;
  },
>(purchaseOrderLineItem: T) {
  const { productVariantId, unitCost } = purchaseOrderLineItem;

  try {
    assertGid(productVariantId);
    assertMoney(unitCost);

    return {
      ...purchaseOrderLineItem,
      productVariantId,
      unitCost,
    };
  } catch (error) {
    sentryErr(error, { purchaseOrderLineItem });
    throw new HttpError('Unable to parse purchase order line item', 500);
  }
}

export async function getPurchaseOrderCustomFields(purchaseOrderId: number) {
  return await sql<{
    id: number;
    purchaseOrderId: number;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "PurchaseOrderCustomField"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function insertPurchaseOrderCustomFields(purchaseOrderId: number, customFields: Record<string, string>) {
  await sql`
    INSERT INTO "PurchaseOrderCustomField" ("purchaseOrderId", key, value)
    SELECT ${purchaseOrderId}, *
    FROM UNNEST(${Object.keys(customFields)} :: text[], ${Object.values(customFields)} :: text[]);`;
}

export async function insertPurchaseOrderLineItemCustomFields(
  purchaseOrderId: number,
  lineItems: { uuid: UUID; customFields: Record<string, string> }[],
) {
  const flatCustomFields = lineItems.flatMap(({ uuid, customFields }) =>
    Object.entries(customFields).map(([key, value]) => ({ uuid, key, value })),
  );

  if (!isNonEmptyArray(flatCustomFields)) {
    return;
  }

  const { key, value, uuid } = nest(flatCustomFields);

  await sql`
    INSERT INTO "PurchaseOrderLineItemCustomField" ("purchaseOrderId", "purchaseOrderLineItemUuid", key, value)
    SELECT ${purchaseOrderId}, *
    FROM UNNEST(${uuid} :: uuid[], ${key} :: text[], ${value} :: text[]);`;
}

export async function removePurchaseOrderLineItemCustomFields(purchaseOrderId: number) {
  await sql`
    DELETE
    FROM "PurchaseOrderLineItemCustomField"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function getPurchaseOrderLineItemCustomFields(purchaseOrderId: number) {
  return await sql<{
    id: number;
    purchaseOrderId: number;
    purchaseOrderLineItemUuid: UUID;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "PurchaseOrderLineItemCustomField"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function getPurchaseOrderAssignedEmployees(purchaseOrderId: number) {
  const assignments = await sql<{
    id: number;
    purchaseOrderId: number;
    employeeId: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "PurchaseOrderEmployeeAssignment"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;

  return assignments.map(mapPurchaseOrderAssignedEmployee);
}

function mapPurchaseOrderAssignedEmployee(assignment: {
  id: number;
  purchaseOrderId: number;
  employeeId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { employeeId } = assignment;

  try {
    assertGid(employeeId);

    return {
      ...assignment,
      employeeId,
    };
  } catch (error) {
    sentryErr(error, { assignment });
    throw new HttpError('Unable to parse purchase order assignment', 500);
  }
}

export async function removePurchaseOrderLineItems(purchaseOrderId: number) {
  await sql`
    DELETE
    FROM "PurchaseOrderLineItem"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function removePurchaseOrderLineItemsByUuids(purchaseOrderId: number, uuids: string[]) {
  await sql`
    DELETE
    FROM "PurchaseOrderLineItem"
    WHERE "purchaseOrderId" = ${purchaseOrderId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function removePurchaseOrderCustomFields(purchaseOrderId: number) {
  await sql`
    DELETE
    FROM "PurchaseOrderCustomField"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function removePurchaseOrderAssignedEmployees(purchaseOrderId: number) {
  await sql`
    DELETE
    FROM "PurchaseOrderEmployeeAssignment"
    WHERE "purchaseOrderId" = ${purchaseOrderId};`;
}

export async function upsertPurchaseOrderLineItems(
  purchaseOrderId: number,
  lineItems: {
    productVariantId: ID;
    quantity: number;
    availableQuantity: number;
    unitCost: Money;
    uuid: UUID;
    specialOrderLineItemId: number | null;
    productVariantSerialId: number | null;
  }[],
) {
  if (!isNonEmptyArray(lineItems)) {
    return;
  }

  const {
    unitCost,
    quantity,
    availableQuantity,
    productVariantId,
    uuid,
    specialOrderLineItemId,
    productVariantSerialId,
  } = nest(lineItems);
  const _productVariantId: string[] = productVariantId;
  const _unitCost: string[] = unitCost;

  await sql`
    INSERT INTO "PurchaseOrderLineItem" ("purchaseOrderId", "productVariantId", quantity, "availableQuantity",
                                         "unitCost", uuid, "specialOrderLineItemId", "productVariantSerialId")
    SELECT ${purchaseOrderId}, *
    FROM UNNEST(
      ${_productVariantId} :: text[],
      ${quantity} :: int[],
      ${availableQuantity} :: int[],
      ${_unitCost} :: text[],
      ${uuid} :: uuid[],
      ${specialOrderLineItemId} :: int[],
      ${productVariantSerialId} :: int[]
         )
    ON CONFLICT ("purchaseOrderId", uuid)
      DO UPDATE SET "productVariantId"       = EXCLUDED."productVariantId",
                    quantity                 = EXCLUDED.quantity,
                    "availableQuantity"      = EXCLUDED."availableQuantity",
                    "unitCost"               = EXCLUDED."unitCost",
                    "specialOrderLineItemId" = EXCLUDED."specialOrderLineItemId",
                    "productVariantSerialId" = EXCLUDED."productVariantSerialId";
  `;
}

export async function insertPurchaseOrderAssignedEmployees(purchaseOrderId: number, employees: { employeeId: ID }[]) {
  if (!isNonEmptyArray(employees)) {
    return;
  }

  const { employeeId } = nest(employees);
  const _employeeId: string[] = employeeId;

  await sql`
    INSERT INTO "PurchaseOrderEmployeeAssignment" ("purchaseOrderId", "employeeId")
    SELECT ${purchaseOrderId}, *
    FROM UNNEST(${_employeeId} :: text[]);`;
}

export async function getPurchaseOrderLineItemsByNameAndUuid(
  items: {
    purchaseOrderName: string;
    uuid: UUID;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return [];
  }

  const { purchaseOrderName, uuid } = nest(items);

  const lineItems = await sql<{
    purchaseOrderId: number;
    productVariantId: string;
    quantity: number;
    availableQuantity: number;
    unitCost: string;
    createdAt: Date;
    updatedAt: Date;
    uuid: UUID;
    specialOrderLineItemId: number | null;
    productVariantSerialId: number | null;
    purchaseOrderName: string;
  }>`
    SELECT li.*, po.name AS "purchaseOrderName"
    FROM "PurchaseOrderLineItem" li
           INNER JOIN "PurchaseOrder" po ON li."purchaseOrderId" = po.id
    WHERE (po.name, li.uuid) = ANY (SELECT *
                                    FROM UNNEST(
                                      ${purchaseOrderName} :: text[],
                                      ${uuid} :: uuid[]
                                         ));
  `;

  return lineItems.map(mapPurchaseOrderLineItem);
}

export async function getPurchaseOrderLineItemsByIdAndUuid(
  items: {
    purchaseOrderId: number;
    uuid: UUID;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return [];
  }

  const { purchaseOrderId, uuid } = nest(items);

  const _purchaseOrderId: (number | null)[] = purchaseOrderId;
  const _uuid: (string | null)[] = uuid;

  const lineItems = await sql<{
    purchaseOrderId: number;
    productVariantId: string;
    quantity: number;
    availableQuantity: number;
    unitCost: string;
    createdAt: Date;
    updatedAt: Date;
    uuid: UUID;
    specialOrderLineItemId: number | null;
    productVariantSerialId: number | null;
    purchaseOrderName: string;
  }>`
    SELECT li.*, po.name AS "purchaseOrderName"
    FROM "PurchaseOrderLineItem" li
           INNER JOIN "PurchaseOrder" po ON li."purchaseOrderId" = po.id
    WHERE (li."purchaseOrderId", li.uuid) = ANY (SELECT *
                                                 FROM UNNEST(
                                                   ${_purchaseOrderId} :: int[],
                                                   ${_uuid} :: uuid[]
                                                      ));
  `;

  return lineItems.map(mapPurchaseOrderLineItem);
}

export async function getPurchaseOrdersForSpecialOrder(specialOrderId: number) {
  const purchaseOrders = await sql<{
    id: number;
    shop: string;
    locationId: string | null;
    discount: string | null;
    tax: string | null;
    shipping: string | null;
    deposited: string | null;
    paid: string | null;
    name: string;
    status: string;
    shipFrom: string;
    shipTo: string;
    note: string;
    vendorName: string | null;
    createdAt: Date;
    updatedAt: Date;
    placedDate: Date | null;
  }>`
    SELECT DISTINCT po.*
    FROM "PurchaseOrder" po
           INNER JOIN "PurchaseOrderLineItem" poli ON poli."purchaseOrderId" = po.id
           INNER JOIN "SpecialOrderLineItem" soli ON soli.id = poli."specialOrderLineItemId"
    WHERE soli."specialOrderId" = ${specialOrderId};
  `;

  return purchaseOrders.map(mapPurchaseOrder);
}

export async function getPurchaseOrderCount(shop: string, filters: MergeUnion<{ vendor: string }>) {
  const { count } = await sqlOne<{ count: number }>`
    SELECT COUNT(*) :: int AS count
    FROM "PurchaseOrder"
    WHERE "shop" = COALESCE(${shop ?? null}, "shop")
      AND "vendorName" = COALESCE(${filters?.vendor ?? null}, "vendorName");
  `;

  return count;
}

export async function getPurchaseOrderCountByVendor(shop: string) {
  const counts = await sql<{ vendorName: string; count: number }>`
    SELECT "vendorName", COUNT(*) :: int AS count
    FROM "PurchaseOrder"
    WHERE "shop" = COALESCE(${shop ?? null}, "shop")
      AND "vendorName" IS NOT NULL
    GROUP BY "vendorName";
  `;

  return Object.fromEntries(counts.map(({ vendorName, count }) => [vendorName, count]));
}

export async function getPurchaseOrdersForSerial({
  shop,
  serial,
  id,
  productVariantId,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      serial: string;
      productVariantId: ID;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const purchaseOrders = await sql<{
    id: number;
    shop: string;
    locationId: string | null;
    discount: string | null;
    tax: string | null;
    shipping: string | null;
    deposited: string | null;
    paid: string | null;
    name: string;
    status: string;
    shipFrom: string;
    shipTo: string;
    note: string;
    vendorName: string | null;
    createdAt: Date;
    updatedAt: Date;
    placedDate: Date | null;
  }>`
    SELECT DISTINCT po.*
    FROM "ProductVariantSerial" pvs
           INNER JOIN "PurchaseOrderLineItem" poli ON poli."productVariantSerialId" = pvs.id
           INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  return purchaseOrders.map(mapPurchaseOrder);
}

export async function getPurchaseOrderLineItemsForSerial({
  shop,
  serial,
  id,
  productVariantId,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      serial: string;
      productVariantId: ID;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const lineItems = await sql<{
    purchaseOrderId: number;
    productVariantId: string;
    quantity: number;
    availableQuantity: number;
    unitCost: string;
    createdAt: Date;
    updatedAt: Date;
    uuid: UUID;
    specialOrderLineItemId: number | null;
    productVariantSerialId: number | null;
  }>`
    SELECT poli.*
    FROM "ProductVariantSerial" pvs
           INNER JOIN "PurchaseOrderLineItem" poli ON poli."productVariantSerialId" = pvs.id
           INNER JOIN "PurchaseOrder" po ON po.id = poli."purchaseOrderId"
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  return lineItems.map(mapPurchaseOrderLineItem);
}
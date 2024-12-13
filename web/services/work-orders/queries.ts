import { sql, sqlOne } from '../db/sql-tag.js';
import { WorkOrderChargeData } from './charges.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { WorkOrderItemData } from './items.js';
import { assertGidOrNull } from '../../util/assertions.js';
import { MergeUnion } from '../../util/types.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { UUID } from '@work-orders/common/util/uuid.js';

export type WorkOrder = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;

export async function getWorkOrder(
  filters: MergeUnion<{ id: number } | { shop: string; name: string; locationIds: ID[] | null }>,
) {
  const _locationIds: string[] | null = filters?.locationIds ?? null;

  const [workOrder] = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    derivedFromOrderId: string | null;
    dueDate: Date;
    note: string;
    status: string;
    updatedAt: Date;
    createdAt: Date;
    discountAmount: string | null;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE' | null;
    internalNote: string;
    companyId: string | null;
    companyLocationId: string | null;
    companyContactId: string | null;
    paymentFixedDueDate: Date | null;
    paymentTermsTemplateId: string | null;
    locationId: string | null;
    staffMemberId: string | null;
  }>`
    SELECT *
    FROM "WorkOrder"
    WHERE shop = COALESCE(${filters?.shop ?? null}, shop)
      AND name = COALESCE(${filters?.name ?? null}, name)
      AND id = COALESCE(${filters?.id ?? null}, id)
      AND (
      "locationId" = ANY (COALESCE(${_locationIds as string[]}, ARRAY ["locationId"]))
        OR ("locationId" IS NULL AND ${_locationIds as string[]} :: text[] IS NULL)
      )
  `;

  if (!workOrder) {
    return null;
  }

  return mapWorkOrder(workOrder);
}

function mapWorkOrder<
  T extends {
    id: number;
    shop: string;
    name: string;
    customerId: string;
    derivedFromOrderId: string | null;
    dueDate: Date;
    note: string;
    status: string;
    updatedAt: Date;
    createdAt: Date;
    discountAmount: string | null;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE' | null;
    internalNote: string;
    companyId: string | null;
    companyLocationId: string | null;
    companyContactId: string | null;
    paymentFixedDueDate: Date | null;
    paymentTermsTemplateId: string | null;
    locationId: string | null;
    staffMemberId: string | null;
  },
>(workOrder: T) {
  const {
    customerId,
    derivedFromOrderId,
    companyId,
    companyLocationId,
    companyContactId,
    paymentTermsTemplateId,
    locationId,
    staffMemberId,
  } = workOrder;

  try {
    assertGid(customerId);
    assertGidOrNull(derivedFromOrderId);
    assertGidOrNull(companyId);
    assertGidOrNull(companyLocationId);
    assertGidOrNull(companyContactId);
    assertGidOrNull(paymentTermsTemplateId);
    assertGidOrNull(locationId);
    assertGidOrNull(staffMemberId);

    return {
      ...workOrder,
      customerId,
      derivedFromOrderId,
      companyId,
      companyLocationId,
      companyContactId,
      paymentTermsTemplateId,
      locationId,
      staffMemberId,
    };
  } catch (error) {
    sentryErr(error, { workOrder });
    throw new HttpError('Unable to parse work order', 500);
  }
}

export async function getWorkOrderCharges(workOrderId: number) {
  const charges = await sql<{
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    workOrderItemUuid: UUID | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ${workOrderId};
  `;

  try {
    return charges.map(mapWorkOrderCharge);
  } catch (error) {
    sentryErr(error, { charges });
    throw new HttpError('Unable to parse work order charges', 500);
  }
}

function mapWorkOrderCharge(charge: {
  workOrderId: number;
  uuid: UUID;
  shopifyOrderLineItemId: string | null;
  workOrderItemUuid: UUID | null;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { shopifyOrderLineItemId } = charge;
  assertGidOrNull(shopifyOrderLineItemId);
  const data = WorkOrderChargeData.parse(charge.data);
  return {
    ...charge,
    shopifyOrderLineItemId,
    data,
  };
}

export async function getWorkOrderItems(workOrderId: number) {
  const items = await sql<{
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
    productVariantSerialId: number | null;
  }>`
    SELECT *
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId};
  `;

  try {
    return items.map(mapWorkOrderItem);
  } catch (error) {
    sentryErr(error, { items });
    throw new HttpError('Unable to parse work order items', 500);
  }
}

function mapWorkOrderItem(item: {
  workOrderId: number;
  uuid: UUID;
  shopifyOrderLineItemId: string | null;
  productVariantSerialId: number | null;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { shopifyOrderLineItemId } = item;
  assertGidOrNull(shopifyOrderLineItemId);
  const data = WorkOrderItemData.parse(item.data);
  return { ...item, shopifyOrderLineItemId, data };
}

export async function getWorkOrderItemCustomFields(workOrderId: number) {
  return await sql<{
    id: number;
    workOrderId: number;
    workOrderItemUuid: UUID;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderItemCustomField"
    WHERE "workOrderId" = ${workOrderId};
  `;
}

export async function getWorkOrderCustomFields(workOrderId: number) {
  return await sql<{ id: number; workOrderId: number; key: string; value: string; createdAt: Date; updatedAt: Date }>`
    SELECT *
    FROM "WorkOrderCustomField"
    WHERE "workOrderId" = ${workOrderId};`;
}

export async function getWorkOrderItemsByUuids({ workOrderId, uuids }: { workOrderId: number; uuids: string[] }) {
  const items = await sql<{
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
    productVariantSerialId: number | null;
  }>`
    SELECT *
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId}
      AND "uuid" = ANY (${uuids} :: uuid[]);
  `;

  try {
    return items.map(mapWorkOrderItem);
  } catch (error) {
    sentryErr(error, { items });
    throw new HttpError('Unable to parse work order items', 500);
  }
}

export async function getWorkOrderChargesByUuids({ workOrderId, uuids }: { workOrderId: number; uuids: string[] }) {
  const charges = await sql<{
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    workOrderItemUuid: UUID | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ${workOrderId}
      AND "uuid" = ANY (${uuids} :: uuid[]);
  `;

  try {
    return charges.map(mapWorkOrderCharge);
  } catch (error) {
    sentryErr(error, { charges });
    throw new HttpError('Unable to parse work order charges', 500);
  }
}

export async function upsertWorkOrderItems(
  items: {
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: ID | null;
    productVariantSerialId: number | null;
    data: WorkOrderItemData;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { shopifyOrderLineItemId, workOrderId, uuid, data, productVariantSerialId } = nest(items);

  await sql`
    INSERT INTO "WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", data, "productVariantSerialId")
    SELECT *
    FROM UNNEST(${workOrderId} :: int[],
                ${uuid} :: uuid[],
                ${shopifyOrderLineItemId as string[]} :: text[],
                ${data.map(data => JSON.stringify(data))} :: jsonb[],
                ${productVariantSerialId as number[]} :: int[]
         )
    ON CONFLICT ("workOrderId", uuid)
      DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                    data                     = EXCLUDED.data;`;
}

export async function upsertWorkOrderCharges(
  charges: {
    workOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: ID | null;
    workOrderItemUuid: UUID | null;
    data: WorkOrderChargeData;
  }[],
) {
  if (!isNonEmptyArray(charges)) {
    return;
  }

  const { workOrderItemUuid, shopifyOrderLineItemId, workOrderId, uuid, data } = nest(charges);

  await sql`
    INSERT INTO "WorkOrderCharge" ("workOrderId", uuid, "shopifyOrderLineItemId", "workOrderItemUuid", data)
    SELECT *
    FROM UNNEST(${workOrderId} :: int[],
                ${uuid} :: uuid[],
                ${shopifyOrderLineItemId as string[]} :: text[],
                ${workOrderItemUuid as string[]} :: uuid[],
                ${data.map(data => JSON.stringify(data))} :: jsonb[])
    ON CONFLICT ("workOrderId", uuid)
      DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                    "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
                    data                     = EXCLUDED.data;`;
}

export async function deleteWorkOrderCustomFields({ workOrderIds }: { workOrderIds: number[] }) {
  if (workOrderIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderCustomField"
    WHERE "workOrderId" = ANY (${workOrderIds});`;
}

export async function deleteWorkOrderItemCustomFields({ workOrderIds }: { workOrderIds: number[] }) {
  if (workOrderIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderItemCustomField"
    WHERE "workOrderId" = ANY (${workOrderIds});`;
}

export async function insertWorkOrderCustomFields(workOrderId: number, customFields: Record<string, string>) {
  await sql`
    INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
    SELECT ${workOrderId}, *
    FROM UNNEST(${Object.keys(customFields)} :: text[], ${Object.values(customFields)} :: text[]);`;
}

export async function insertWorkOrderItemCustomFields(
  workOrderId: number,
  customFields: { uuid: UUID; customFields: Record<string, string> }[],
) {
  const flatCustomFields = customFields.flatMap(({ uuid, customFields }) =>
    Object.entries(customFields).map(([key, value]) => ({ uuid, key, value })),
  );

  if (!isNonEmptyArray(flatCustomFields)) {
    return;
  }

  const { key, value, uuid } = nest(flatCustomFields);

  await sql`
    INSERT INTO "WorkOrderItemCustomField" ("workOrderId", "workOrderItemUuid", key, value)
    SELECT ${workOrderId}, *
    FROM UNNEST(${uuid} :: uuid[], ${key} :: text[], ${value} :: text[]);`;
}

export async function deleteWorkOrderItemsByUuids(workOrderId: number, uuids: string[]) {
  if (uuids.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function deleteWorkOrderItems({ workOrderIds }: { workOrderIds: number[] }) {
  if (workOrderIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ANY (${workOrderIds});`;
}

export async function deleteWorkOrderChargesByUuids(workOrderId: number, uuids: string[]) {
  if (uuids.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ${workOrderId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function deleteWorkOrderCharges({ workOrderIds }: { workOrderIds: number[] }) {
  if (workOrderIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ANY (${workOrderIds});`;
}

export async function setWorkOrderItemShopifyOrderLineItemIds(
  workOrderId: number,
  items: { uuid: UUID; shopifyOrderLineItemId: ID | null }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { shopifyOrderLineItemId, uuid } = nest(items);

  const { count } = await sqlOne<{ count: number }>`
    WITH updated AS (
      UPDATE "WorkOrderItem" x
        SET "shopifyOrderLineItemId" = y."shopifyOrderLineItemId"
        FROM UNNEST(${shopifyOrderLineItemId as string[]} :: text[], ${uuid} :: uuid[]) AS y("shopifyOrderLineItemId", uuid)
        WHERE x."workOrderId" = ${workOrderId}
          AND x.uuid = y.uuid
        RETURNING 1)
    SELECT COUNT(*) :: int
    FROM updated;`;

  if (count !== items.length) {
    sentryErr(`Expected to update ${items.length} item shopify order line item ids, but got ${count}`, {
      workOrderId,
      items,
      count,
    });
    throw new HttpError('Could not set shopify order line item ids', 500);
  }
}

export async function setWorkOrderChargeShopifyOrderLineItemIds(
  workOrderId: number,
  charges: { uuid: UUID; shopifyOrderLineItemId: ID | null }[],
) {
  if (!isNonEmptyArray(charges)) {
    return;
  }

  const { shopifyOrderLineItemId, uuid } = nest(charges);

  const { count } = await sqlOne<{ count: number }>`
    WITH updated AS (
      UPDATE "WorkOrderCharge" x
        SET "shopifyOrderLineItemId" = y."shopifyOrderLineItemId"
        FROM UNNEST(${shopifyOrderLineItemId as string[]} :: text[], ${uuid as string[]} :: uuid[]) AS y("shopifyOrderLineItemId", uuid)
        WHERE x."workOrderId" = ${workOrderId}
          AND x.uuid = y.uuid
        RETURNING 1)
    SELECT COUNT(*) :: int
    FROM updated;`;

  if (count !== charges.length) {
    sentryErr(`Expected to update ${charges.length} charge shopify order line charge ids, but got ${count}`, {
      workOrderId,
      charges,
      count,
    });
    throw new HttpError('Could not set shopify order line charge ids', 500);
  }
}

export async function getWorkOrdersForSpecialOrder(specialOrderId: number) {
  const workOrders = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    derivedFromOrderId: string | null;
    dueDate: Date;
    note: string;
    status: string;
    updatedAt: Date;
    createdAt: Date;
    discountAmount: string | null;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE' | null;
    internalNote: string;
    companyId: string | null;
    companyLocationId: string | null;
    companyContactId: string | null;
    paymentFixedDueDate: Date | null;
    paymentTermsTemplateId: string | null;
    locationId: string | null;
    staffMemberId: string | null;
    orderIds: string[] | null;
  }>`
    SELECT DISTINCT wo.*, array_agg(DISTINCT soli."orderId") AS "orderIds"
    FROM "WorkOrder" wo
           INNER JOIN "WorkOrderItem" woi ON woi."workOrderId" = wo.id
           INNER JOIN "SpecialOrderLineItem" spoli ON spoli."shopifyOrderLineItemId" = woi."shopifyOrderLineItemId"
           INNER JOIN "ShopifyOrderLineItem" soli ON soli."lineItemId" = woi."shopifyOrderLineItemId"
    WHERE spoli."specialOrderId" = ${specialOrderId}
    GROUP BY wo.id;
  `;

  return workOrders.map(workOrder =>
    mapWorkOrder({
      ...workOrder,
      orderIds: workOrder.orderIds?.map(orderId => (assertGid(orderId), orderId)) ?? [],
    }),
  );
}

export async function getWorkOrdersForSerial({
  shop,
  serial,
  id,
  productVariantId,
  locationIds,
}: MergeUnion<
  | { id: number }
  | {
      shop: string;
      serial: string;
      productVariantId: ID;
      locationIds: ID[] | null;
    }
>) {
  const _productVariantId: string | null = productVariantId ?? null;
  const _locationIds: string[] | null = locationIds ?? null;

  const workOrders = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    derivedFromOrderId: string | null;
    dueDate: Date;
    note: string;
    status: string;
    updatedAt: Date;
    createdAt: Date;
    discountAmount: string | null;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE' | null;
    internalNote: string;
    companyId: string | null;
    companyLocationId: string | null;
    companyContactId: string | null;
    paymentFixedDueDate: Date | null;
    paymentTermsTemplateId: string | null;
    locationId: string | null;
    staffMemberId: string | null;
  }>`
    SELECT wo.*
    FROM "ProductVariantSerial" pvs
           INNER JOIN "WorkOrderItem" woi ON woi."productVariantSerialId" = pvs.id
           INNER JOIN "WorkOrder" wo ON wo.id = woi."workOrderId"
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop)
      AND (
      wo."locationId" = ANY (COALESCE(${_locationIds as string[]}, ARRAY [wo."locationId"]))
        OR (wo."locationId" IS NULL AND ${_locationIds as string[]} :: text[] IS NULL)
      );
  `;

  return workOrders.map(mapWorkOrder);
}

export async function deleteWorkOrders({ workOrderIds }: { workOrderIds: number[] }) {
  if (workOrderIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrder"
    WHERE id = ANY (${workOrderIds});
  `;
}

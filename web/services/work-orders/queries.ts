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

export type WorkOrder = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;

export async function getWorkOrder(filters: MergeUnion<{ id: number } | { shop: string; name: string }>) {
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
  }>`
    SELECT *
    FROM "WorkOrder"
    WHERE shop = COALESCE(${filters?.shop ?? null}, shop)
      AND name = COALESCE(${filters?.name ?? null}, name)
      AND id = COALESCE(${filters?.id ?? null}, id);
  `;

  if (!workOrder) {
    return null;
  }

  const { customerId, derivedFromOrderId, companyId, companyLocationId, companyContactId, paymentTermsTemplateId } =
    workOrder;

  try {
    assertGid(customerId);
    assertGidOrNull(derivedFromOrderId);
    assertGidOrNull(companyId);
    assertGidOrNull(companyLocationId);
    assertGidOrNull(companyContactId);
    assertGidOrNull(paymentTermsTemplateId);

    return {
      ...workOrder,
      customerId,
      derivedFromOrderId,
      companyId,
      companyLocationId,
      companyContactId,
      paymentTermsTemplateId,
    };
  } catch (error) {
    sentryErr(error);
    throw new HttpError('Unable to parse work order', 500);
  }
}

export async function getWorkOrderCharges(workOrderId: number) {
  const charges = await sql<{
    workOrderId: number;
    uuid: string;
    shopifyOrderLineItemId: string | null;
    workOrderItemUuid: string | null;
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
    sentryErr(error);
    throw new HttpError('Unable to parse work order charges', 500);
  }
}

function mapWorkOrderCharge(charge: {
  workOrderId: number;
  uuid: string;
  shopifyOrderLineItemId: string | null;
  workOrderItemUuid: string | null;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { shopifyOrderLineItemId, workOrderItemUuid } = charge;
  assertGidOrNull(shopifyOrderLineItemId);
  assertGidOrNull(workOrderItemUuid);
  const data = WorkOrderChargeData.parse(charge.data);
  return { ...charge, shopifyOrderLineItemId, workOrderItemUuid, data };
}

export async function getWorkOrderItems(workOrderId: number) {
  const items = await sql<{
    workOrderId: number;
    uuid: string;
    shopifyOrderLineItemId: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId};
  `;

  try {
    return items.map(mapWorkOrderItem);
  } catch (error) {
    sentryErr(error);
    throw new HttpError('Unable to parse work order items', 500);
  }
}

function mapWorkOrderItem(item: {
  workOrderId: number;
  uuid: string;
  shopifyOrderLineItemId: string | null;
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
    workOrderItemUuid: string;
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
    uuid: string;
    shopifyOrderLineItemId: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId}
      AND "uuid" = ANY (${uuids} :: UUID[]);
  `;

  try {
    return items.map(mapWorkOrderItem);
  } catch (error) {
    sentryErr(error);
    throw new HttpError('Unable to parse work order items', 500);
  }
}

export async function getWorkOrderChargesByUuids({ workOrderId, uuids }: { workOrderId: number; uuids: string[] }) {
  const charges = await sql<{
    workOrderId: number;
    uuid: string;
    shopifyOrderLineItemId: string | null;
    workOrderItemUuid: string | null;
    data: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ${workOrderId}
      AND "uuid" = ANY (${uuids} :: UUID[]);
  `;

  try {
    return charges.map(mapWorkOrderCharge);
  } catch (error) {
    sentryErr(error);
    throw new HttpError('Unable to parse work order charges', 500);
  }
}

export async function upsertWorkOrderItems(
  items: {
    workOrderId: number;
    uuid: string;
    shopifyOrderLineItemId: ID | null;
    data: WorkOrderItemData;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { shopifyOrderLineItemId, workOrderId, uuid, data } = nest(items);

  const unbrandedShopifyOrderLineItemId = shopifyOrderLineItemId as (string | null)[];

  await sql`
    INSERT INTO "WorkOrderItem" ("workOrderId", uuid, "shopifyOrderLineItemId", data)
    SELECT *
    FROM UNNEST(${workOrderId},
                ${uuid} :: uuid[],
                ${unbrandedShopifyOrderLineItemId},
                ${data.map(data => JSON.stringify(data))} :: jsonb[])
    ON CONFLICT ("workOrderId", uuid)
      DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                    data                     = EXCLUDED.data;`;
}

export async function upsertWorkOrderCharges(
  charges: {
    workOrderId: number;
    uuid: string;
    shopifyOrderLineItemId: ID | null;
    workOrderItemUuid: string | null;
    data: WorkOrderChargeData;
  }[],
) {
  if (!isNonEmptyArray(charges)) {
    return;
  }

  const { workOrderItemUuid, shopifyOrderLineItemId, workOrderId, uuid, data } = nest(charges);

  const unbrandedShopifyOrderLineItemId = shopifyOrderLineItemId as (string | null)[];

  await sql`
    INSERT INTO "WorkOrderCharge" ("workOrderId", uuid, "shopifyOrderLineItemId", "workOrderItemUuid", data)
    SELECT *
    FROM UNNEST(${workOrderId},
                ${uuid} :: uuid[],
                ${unbrandedShopifyOrderLineItemId},
                ${workOrderItemUuid} :: uuid[],
                ${data.map(data => JSON.stringify(data))} :: jsonb[])
    ON CONFLICT ("workOrderId", uuid)
      DO UPDATE SET "shopifyOrderLineItemId" = EXCLUDED."shopifyOrderLineItemId",
                    "workOrderItemUuid"      = EXCLUDED."workOrderItemUuid",
                    data                     = EXCLUDED.data;`;
}

export async function removeWorkOrderCustomFields(workOrderId: number) {
  await sql`
    DELETE
    FROM "WorkOrderCustomField"
    WHERE "workOrderId" = ${workOrderId};`;
}

export async function removeWorkOrderItemCustomFields(workOrderId: number) {
  await sql`
    DELETE
    FROM "WorkOrderItemCustomField"
    WHERE "workOrderId" = ${workOrderId};`;
}

export async function insertWorkOrderCustomFields(workOrderId: number, customFields: Record<string, string>) {
  await sql`
    INSERT INTO "WorkOrderCustomField" ("workOrderId", key, value)
    SELECT ${workOrderId}, *
    FROM UNNEST(${Object.keys(customFields)}, ${Object.values(customFields)});`;
}

export async function insertWorkOrderItemCustomFields(
  workOrderId: number,
  customFields: { uuid: string; customFields: Record<string, string> }[],
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
    FROM UNNEST(${uuid} :: uuid[], ${key}, ${value});`;
}

export async function removeWorkOrderItems(workOrderId: number, uuids: string[]) {
  if (uuids.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderItem"
    WHERE "workOrderId" = ${workOrderId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function removeWorkOrderCharges(workOrderId: number, uuids: string[]) {
  if (uuids.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "WorkOrderCharge"
    WHERE "workOrderId" = ${workOrderId}
      AND uuid = ANY (${uuids} :: uuid[]);`;
}

export async function setWorkOrderItemShopifyOrderLineItemIds(
  workOrderId: number,
  items: { uuid: string; shopifyOrderLineItemId: ID | null }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { shopifyOrderLineItemId, uuid } = nest(items);
  const _shopifyOrderLineItemId = shopifyOrderLineItemId as (string | null)[];

  const { count } = await sqlOne<{ count: number }>`
    WITH updated AS (
      UPDATE "WorkOrderItem" x
        SET "shopifyOrderLineItemId" = y."shopifyOrderLineItemId"
        FROM UNNEST(${_shopifyOrderLineItemId}, ${uuid} :: uuid[]) AS y("shopifyOrderLineItemId", uuid)
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
  charges: { uuid: string; shopifyOrderLineItemId: ID | null }[],
) {
  if (!isNonEmptyArray(charges)) {
    return;
  }

  const { shopifyOrderLineItemId, uuid } = nest(charges);
  const _shopifyOrderLineItemId = shopifyOrderLineItemId as (string | null)[];

  const { count } = await sqlOne<{ count: number }>`
    WITH updated AS (
      UPDATE "WorkOrderCharge" x
        SET "shopifyOrderLineItemId" = y."shopifyOrderLineItemId"
        FROM UNNEST(${_shopifyOrderLineItemId}, ${uuid} :: uuid[]) AS y("shopifyOrderLineItemId", uuid)
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
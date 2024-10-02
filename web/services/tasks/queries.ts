import { sql, sqlOne } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { TaskPaginationOptions } from '../../schemas/generated/task-pagination-options.js';
import { escapeLike } from '../db/like.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';

export type Task = NonNullable<Awaited<ReturnType<typeof getTask>>>;

export async function getTask({ shop, id }: { shop: string; id: number }) {
  const [task] = await sql<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Task"
    WHERE id = ${id}
      AND shop = ${shop};
  `;

  if (!task) {
    return null;
  }

  return task;
}

export async function getTasks(shop: string, ids: number[]) {
  if (!ids.length) {
    return [];
  }

  const tasks = await sql<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Task" t
    WHERE t.shop = ${shop}
      AND t.id = ANY (${ids} :: int[]);
  `;

  return tasks;
}

export async function getScheduleEventTasks({
  shop,
  scheduleId,
  itemId,
}: {
  shop: string;
  scheduleId: number;
  itemId: number;
}) {
  return await sql<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT t.*
    FROM "ScheduleEvent" esi
           INNER JOIN "Schedule" es ON es.id = esi."scheduleId"
           INNER JOIN "ScheduleEventTask" esit ON esit."scheduleEventId" = esi.id
           INNER JOIN "Task" t ON t.id = esit."taskId"
    WHERE esi."scheduleId" = ${scheduleId}
      AND esi.id = ${itemId}
      AND es.shop = ${shop}
      AND t.shop = ${shop};
  `;
}

export async function insertTask({
  shop,
  name,
  description,
  estimatedTimeMinutes,
  deadline,
  done,
}: {
  shop: string;
  name: string;
  description: string;
  estimatedTimeMinutes: number | null;
  deadline: Date | null;
  done: boolean;
}) {
  return await sqlOne<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "Task" (name, deadline, description, done, "estimatedTimeMinutes", shop)
    VALUES (${name}, ${deadline!}, ${description}, ${done}, ${estimatedTimeMinutes}, ${shop})
    RETURNING *;
  `;
}

export async function updateTask({
  id,
  shop,
  name,
  description,
  estimatedTimeMinutes,
  deadline,
  done,
}: {
  id: number;
  shop: string;
  name: string;
  description: string;
  estimatedTimeMinutes: number | null;
  deadline: Date | null;
  done: boolean;
}) {
  const [task] = await sql<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "Task"
    SET name                   = ${name},
        description            = ${description},
        "estimatedTimeMinutes" = ${estimatedTimeMinutes},
        deadline               = ${deadline!},
        done                   = ${done}
    WHERE id = ${id}
      AND shop = ${shop}
    RETURNING *;
  `;

  if (!task) {
    throw new HttpError('Task not found', 404);
  }

  return task;
}

export async function getTasksPage(
  shop: string,
  {
    done,
    query,
    offset,
    limit,
    staffMemberId,
    sortOrder = 'descending',
    sortMode = 'updated-at',
  }: TaskPaginationOptions,
) {
  const escapedQuery = query ? `%${escapeLike(query)}%` : '%';
  const _staffMemberId: string | null = staffMemberId ?? null;

  const tasks = await sql<{
    id: number;
    shop: string;
    name: string;
    description: string;
    estimatedTimeMinutes: number | null;
    deadline: Date | null;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT t.*
    FROM "Task" t
           LEFT JOIN "TaskAssignment" ta ON ta."taskId" = t.id
           LEFT JOIN "Employee" tae ON tae."staffMemberId" = ta."staffMemberId"
      --
           LEFT JOIN "TaskWorkOrderLink" towol ON towol."taskId" = t.id
           LEFT JOIN "WorkOrder" towo ON towo.id = towol."workOrderId"
      --
           LEFT JOIN "TaskPurchaseOrderLink" topol ON topol."taskId" = t.id
           LEFT JOIN "PurchaseOrder" topo ON topo.id = topol."purchaseOrderId"
      --
           LEFT JOIN "TaskSpecialOrderLink" tosoll ON tosoll."taskId" = t.id
           LEFT JOIN "SpecialOrder" tosol ON tosol.id = tosoll."specialOrderId"
      --
           LEFT JOIN "TaskStockTransferLink" tostl ON tostl."taskId" = t.id
           LEFT JOIN "StockTransfer" tost ON tost.id = tostl."stockTransferId"
      --
           LEFT JOIN "TaskCycleCountLink" toccl ON toccl."taskId" = t.id
           LEFT JOIN "CycleCount" tocc ON tocc.id = toccl."cycleCountId"
      --
           LEFT JOIN "TaskSerialLink" tosl ON tosl."taskId" = t.id
           LEFT JOIN "ProductVariantSerial" tos ON tos.id = tosl."serialId"
    WHERE t.shop = ${shop}
      AND t.done = COALESCE(${done ?? null}, t.done)
      AND ((${_staffMemberId}::text) IS NULL OR tae."staffMemberId" = (${_staffMemberId}::text))
      AND (
      tae.name ILIKE ${escapedQuery} OR
      tae.email ILIKE ${escapedQuery} OR
      t.name ILIKE ${escapedQuery} OR
      t.description ILIKE ${escapedQuery} OR
      towo.name ILIKE ${escapedQuery} OR
      topo.name ILIKE ${escapedQuery} OR
      tosol.name ILIKE ${escapedQuery} OR
      tost.name ILIKE ${escapedQuery} OR
      tocc.name ILIKE ${escapedQuery} OR
      tos.serial ILIKE ${escapedQuery}
      )
    GROUP BY t.id
    ORDER BY CASE WHEN ${sortMode} = 'deadline' AND ${sortOrder} = 'ascending' THEN t."deadline" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'deadline' AND ${sortOrder} = 'descending' THEN t."deadline" END DESC NULLS LAST,
             --
             CASE
               WHEN ${sortMode} = 'estimated-time-minutes' AND ${sortOrder} = 'ascending'
                 THEN t."estimatedTimeMinutes" END ASC NULLS LAST,
             CASE
               WHEN ${sortMode} = 'estimated-time-minutes' AND ${sortOrder} = 'descending'
                 THEN t."estimatedTimeMinutes" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'ascending' THEN t."name" END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'name' AND ${sortOrder} = 'descending' THEN t."name" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'created-at' AND ${sortOrder} = 'ascending' THEN t."createdAt" END ASC NULLS LAST,
             CASE
               WHEN ${sortMode} = 'created-at' AND ${sortOrder} = 'descending' THEN t."createdAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'updated-at' AND ${sortOrder} = 'ascending' THEN t."updatedAt" END ASC NULLS LAST,
             CASE
               WHEN ${sortMode} = 'updated-at' AND ${sortOrder} = 'descending' THEN t."updatedAt" END DESC NULLS LAST,
             --
             CASE WHEN ${sortMode} = 'done' AND ${sortOrder} = 'ascending' THEN t.done END ASC NULLS LAST,
             CASE WHEN ${sortMode} = 'done' AND ${sortOrder} = 'descending' THEN t.done END DESC NULLS LAST
    LIMIT ${limit + 1} OFFSET ${offset}
  `;

  return {
    tasks: tasks.slice(0, limit),
    hasNextPage: tasks.length > limit,
  };
}

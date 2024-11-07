import { sql, sqlOne } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { TaskPaginationOptions } from '../../schemas/generated/task-pagination-options.js';
import { escapeLike } from '../db/like.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unit } from '../db/unit-of-work.js';
import { MergeUnion } from '../../util/types.js';

export type Task = ReturnType<typeof mapTask>;
export type TaskAssignment = ReturnType<typeof mapTaskAssignment>;
export type TaskLinks = Awaited<ReturnType<typeof getTaskLinks>>;

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

  return mapTask(task);
}

function mapTask(task: {
  id: number;
  shop: string;
  name: string;
  description: string;
  estimatedTimeMinutes: number | null;
  deadline: Date | null;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
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
    FROM "Task"
    WHERE shop = ${shop}
      AND id = ANY (${ids} :: int[]);
  `;

  return tasks.map(mapTask);
}

export async function getScheduleEventTasks({
  shop,
  scheduleId,
  eventId,
}: {
  shop: string;
  scheduleId: number;
  eventId: number;
}) {
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
    FROM "ScheduleEvent" esi
           INNER JOIN "Schedule" es ON es.id = esi."scheduleId"
           INNER JOIN "ScheduleEventTask" esit ON esit."scheduleEventId" = esi.id
           INNER JOIN "Task" t ON t.id = esit."taskId"
    WHERE esi."scheduleId" = ${scheduleId}
      AND esi.id = ${eventId}
      AND es.shop = ${shop}
      AND t.shop = ${shop};
  `;

  return tasks.map(mapTask);
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
    staffMemberIds,
    sortOrder = 'descending',
    sortMode = 'updated-at',
    ...paginationOptions
  }: TaskPaginationOptions,
) {
  const escapedQuery = query ? `%${escapeLike(query)}%` : '%';
  const _staffMemberIds: string[] | null = staffMemberIds ?? null;

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
           LEFT JOIN "TaskSpecialOrderLink" tosol ON tosol."taskId" = t.id
           LEFT JOIN "SpecialOrder" toso ON toso.id = tosol."specialOrderId"
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
      AND (${_staffMemberIds!} :: text[] IS NULL OR tae."staffMemberId" = ANY (${_staffMemberIds!} :: text[]))
      AND (
      tae.name ILIKE ${escapedQuery} OR
      tae.email ILIKE ${escapedQuery} OR
      t.name ILIKE ${escapedQuery} OR
      t.description ILIKE ${escapedQuery} OR
      towo.name ILIKE ${escapedQuery} OR
      topo.name ILIKE ${escapedQuery} OR
      toso.name ILIKE ${escapedQuery} OR
      tost.name ILIKE ${escapedQuery} OR
      tocc.name ILIKE ${escapedQuery} OR
      tos.serial ILIKE ${escapedQuery}
      )
      AND (towo.name = ANY (${paginationOptions?.['links.workOrders']!} :: text[]) OR ${paginationOptions?.['links.workOrders']!} :: text[] IS NULL)
      AND (topo.name = ANY (${paginationOptions?.['links.purchaseOrders']!} :: text[]) OR ${paginationOptions?.['links.purchaseOrders']!} :: text[] IS NULL)
      AND (toso.name = ANY (${paginationOptions?.['links.specialOrders']!} :: text[]) OR ${paginationOptions?.['links.specialOrders']!} :: text[] IS NULL)
      AND (tost.name = ANY (${paginationOptions?.['links.transferOrders']!} :: text[]) OR ${paginationOptions?.['links.transferOrders']!} :: text[] IS NULL)
      AND (tocc.name = ANY (${paginationOptions?.['links.cycleCounts']!} :: text[]) OR ${paginationOptions?.['links.cycleCounts']!} :: text[] IS NULL)
      -- TODO: Consider product variant too
      AND (tos.serial = ANY (${paginationOptions?.['links.serials']!} :: text[]) OR ${paginationOptions?.['links.serials']!} :: text[] IS NULL)
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
    tasks: tasks.map(mapTask).slice(0, limit),
    hasNextPage: tasks.length > limit,
  };
}

export async function deleteTaskAssignments({ taskId }: { taskId: number }) {
  await sql`
    DELETE
    FROM "TaskAssignment"
    WHERE "taskId" = ${taskId};
  `;
}

export async function insertTaskAssignments(taskId: number, staffMemberIds: ID[]) {
  if (staffMemberIds.length === 0) {
    return;
  }

  await sql`
    INSERT INTO "TaskAssignment" ("taskId", "staffMemberId")
    SELECT ${taskId}, *
    FROM UNNEST(
      ${staffMemberIds as string[]} :: text[]
         );
  `;
}

export async function getTaskAssignments(ids: number[]) {
  if (!ids.length) {
    return [];
  }

  const assignments = await sql<{
    id: number;
    taskId: number;
    staffMemberId: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT ta.*
    FROM "TaskAssignment" ta
    WHERE ta."taskId" = ANY (${ids} :: int[]);
  `;

  return assignments.map(mapTaskAssignment);
}

export function mapTaskAssignment(assignment: {
  id: number;
  taskId: number;
  staffMemberId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { staffMemberId } = assignment;

  try {
    assertGid(staffMemberId);

    return {
      ...assignment,
      staffMemberId,
    };
  } catch (error) {
    sentryErr(error, { assignment });
    throw new HttpError('Unable to parse task assignment', 500);
  }
}

export async function insertTaskWorkOrderLinks(taskId: number, shop: string, workOrderNames: string[]) {
  await sql`
    INSERT INTO "TaskWorkOrderLink" ("taskId", "workOrderId")
    SELECT ${taskId}, wo.id
    FROM "WorkOrder" wo
    WHERE wo.name = ANY (${workOrderNames} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskWorkOrderLinks(taskId: number) {
  await sql`
    DELETE
    FROM "TaskWorkOrderLink"
    WHERE "taskId" = ${taskId};
  `;
}

export async function insertTaskPurchaseOrderLinks(taskId: number, shop: string, purchaseOrderNames: string[]) {
  await sql`
    INSERT INTO "TaskPurchaseOrderLink" ("taskId", "purchaseOrderId")
    SELECT ${taskId}, po.id
    FROM "PurchaseOrder" po
    WHERE po.name = ANY (${purchaseOrderNames} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskPurchaseOrderLinks({
  taskId,
  purchaseOrderId,
}: MergeUnion<{ taskId: number } | { purchaseOrderId: number }>) {
  await sql`
    DELETE
    FROM "TaskPurchaseOrderLink"
    WHERE "taskId" = COALESCE(${taskId ?? null}, "taskId")
      AND "purchaseOrderId" = COALESCE(${purchaseOrderId ?? null}, "purchaseOrderId");
  `;
}

export async function insertTaskSpecialOrderLinks(taskId: number, shop: string, specialOrderNames: string[]) {
  await sql`
    INSERT INTO "TaskSpecialOrderLink" ("taskId", "specialOrderId")
    SELECT ${taskId}, so.id
    FROM "SpecialOrder" so
    WHERE so.name = ANY (${specialOrderNames} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskSpecialOrderLinks(taskId: number) {
  await sql`
    DELETE
    FROM "TaskSpecialOrderLink"
    WHERE "taskId" = ${taskId};
  `;
}

export async function insertTaskTransferOrderLinks(taskId: number, shop: string, stockTransferNames: string[]) {
  await sql`
    INSERT INTO "TaskStockTransferLink" ("taskId", "stockTransferId")
    SELECT ${taskId}, st.id
    FROM "StockTransfer" st
    WHERE st.name = ANY (${stockTransferNames} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskTransferOrderLinks(taskId: number) {
  await sql`
    DELETE
    FROM "TaskStockTransferLink"
    WHERE "taskId" = ${taskId};
  `;
}

export async function insertTaskCycleCountLinks(taskId: number, shop: string, cycleCountNames: string[]) {
  await sql`
    INSERT INTO "TaskCycleCountLink" ("taskId", "cycleCountId")
    SELECT ${taskId}, cc.id
    FROM "CycleCount" cc
    WHERE cc.name = ANY (${cycleCountNames} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskCycleCountLinks(taskId: number) {
  await sql`
    DELETE
    FROM "TaskCycleCountLink"
    WHERE "taskId" = ${taskId};
  `;
}

export async function insertTaskSerialLinks(taskId: number, shop: string, serials: string[]) {
  await sql`
    INSERT INTO "TaskSerialLink" ("taskId", "serialId")
    SELECT ${taskId}, pvs.id
    FROM "ProductVariantSerial" pvs
    WHERE pvs.serial = ANY (${serials} :: text[])
    AND shop = ${shop};
  `;
}

export async function deleteTaskSerialLinks(taskId: number) {
  await sql`
    DELETE
    FROM "TaskSerialLink"
    WHERE "taskId" = ${taskId};
  `;
}

export async function deleteTaskLinks(taskId: number) {
  await unit(async () => {
    await Promise.all([
      deleteTaskWorkOrderLinks(taskId),
      deleteTaskPurchaseOrderLinks({ taskId }),
      deleteTaskSpecialOrderLinks(taskId),
      deleteTaskTransferOrderLinks(taskId),
      deleteTaskCycleCountLinks(taskId),
      deleteTaskSerialLinks(taskId),
    ]);
  });
}

export async function insertTaskLinks(
  taskId: number,
  shop: string,
  links: {
    workOrders: string[];
    purchaseOrders: string[];
    specialOrders: string[];
    transferOrders: string[];
    cycleCounts: string[];
    serials: string[];
  },
) {
  await unit(async () => {
    await Promise.all([
      insertTaskWorkOrderLinks(taskId, shop, links.workOrders),
      insertTaskPurchaseOrderLinks(taskId, shop, links.purchaseOrders),
      insertTaskSpecialOrderLinks(taskId, shop, links.specialOrders),
      insertTaskTransferOrderLinks(taskId, shop, links.transferOrders),
      insertTaskCycleCountLinks(taskId, shop, links.cycleCounts),
      insertTaskSerialLinks(taskId, shop, links.serials),
    ]);
  });
}

export async function getTaskLinks(ids: number[]) {
  if (!ids.length) {
    return [];
  }

  const links = await sql<{
    id: number;
    links: {
      workOrders: (string | null)[];
      purchaseOrders: (string | null)[];
      specialOrders: (string | null)[];
      transferOrders: (string | null)[];
      cycleCounts: (string | null)[];
      serials: (string | null)[];
    };
  }>`
    SELECT t.id,
           jsonb_build_object('workOrders', COALESCE(jsonb_agg(wo.name), '[]'),
                              'purchaseOrders', COALESCE(jsonb_agg(po.name), '[]'),
                              'specialOrders', COALESCE(jsonb_agg(so.name), '[]'),
                              'transferOrders', COALESCE(jsonb_agg(st.name), '[]'),
                              'cycleCounts', COALESCE(jsonb_agg(cc.name), '[]'),
                              'serials', COALESCE(jsonb_agg(pvs.serial), '[]')
           ) AS "links"
    FROM "Task" t
           LEFT JOIN "TaskWorkOrderLink" twol ON twol."taskId" = t.id
           LEFT JOIN "WorkOrder" wo ON wo.id = twol."workOrderId"
      --
           LEFT JOIN "TaskPurchaseOrderLink" twop ON twop."taskId" = t.id
           LEFT JOIN "PurchaseOrder" po ON po.id = twop."purchaseOrderId"
      --
           LEFT JOIN "TaskSpecialOrderLink" tsol ON tsol."taskId" = t.id
           LEFT JOIN "SpecialOrder" so ON so.id = tsol."specialOrderId"
      --
           LEFT JOIN "TaskStockTransferLink" tstl ON tstl."taskId" = t.id
           LEFT JOIN "StockTransfer" st ON st.id = tstl."stockTransferId"
      --
           LEFT JOIN "TaskCycleCountLink" toccl ON toccl."taskId" = t.id
           LEFT JOIN "CycleCount" cc ON cc.id = toccl."cycleCountId"
      --
           LEFT JOIN "TaskSerialLink" tosl ON tosl."taskId" = t.id
           LEFT JOIN "ProductVariantSerial" pvs ON pvs.id = tosl."serialId"
    WHERE t.id = ANY (${ids} :: int[])
    GROUP BY t.id;
  `;

  return links.map(
    ({ id, links: { workOrders, specialOrders, purchaseOrders, cycleCounts, serials, transferOrders } }) => ({
      id,
      links: {
        workOrders: workOrders.filter(isNonNullable),
        specialOrders: specialOrders.filter(isNonNullable),
        purchaseOrders: purchaseOrders.filter(isNonNullable),
        cycleCounts: cycleCounts.filter(isNonNullable),
        serials: serials.filter(isNonNullable),
        transferOrders: transferOrders.filter(isNonNullable),
      },
    }),
  );
}

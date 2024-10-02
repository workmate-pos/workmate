import { sql, sqlOne } from '../db/sql-tag.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { escapeLike } from '../db/like.js';
import { assertGidOrNull } from '../../util/assertions.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';

export type Schedule = ReturnType<typeof mapSchedule>;
export type ScheduleEvent = ReturnType<typeof mapScheduleEvent>;
export type ScheduleEventAssignment = ReturnType<typeof mapScheduleEventAssignment>;
export type EmployeeAvailability = ReturnType<typeof mapEmployeeAvailability>;
export type ScheduleEventTask = Awaited<ReturnType<typeof getScheduleEventTasks>>[number];

export async function getSchedules({
  shop,
  limit,
  offset = 0,
  locationId,
  query,
}: {
  shop: string;
  limit: number;
  offset?: number;
  locationId?: ID;
  query?: string;
}) {
  const _locationId: string | null = locationId ?? null;
  const _query = query ? `%${escapeLike(query)}%` : null;

  const schedules = await sql<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT es.*
    FROM "Schedule" es
    WHERE es.shop = ${shop}
      AND es."locationId" IS NOT DISTINCT FROM COALESCE(${_locationId}, es."locationId")
      AND es.name ILIKE COALESCE(${_query}, '%')
    ORDER BY es."publishedAt" DESC NULLS FIRST
    LIMIT ${limit + 1} OFFSET ${offset}
  `;

  return {
    schedules: schedules.slice(0, limit).map(mapSchedule),
    hasNextPage: schedules.length > limit,
  };
}

function mapSchedule(schedule: {
  id: number;
  shop: string;
  name: string;
  locationId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { locationId } = schedule;

  try {
    assertGidOrNull(locationId);

    return {
      ...schedule,
      locationId,
    };
  } catch (error) {
    sentryErr(error, { schedule });
    throw new HttpError('Unable to parse employee schedule', 500);
  }
}

export async function getSchedule({ id, shop }: { id: number; shop: string }) {
  const [schedule] = await sql<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Schedule"
    WHERE id = ${id}
      AND shop = ${shop};
  `;

  if (!schedule) {
    return null;
  }

  return mapSchedule(schedule);
}

export async function insertSchedule({
  shop,
  name,
  locationId,
  publishedAt,
}: {
  shop: string;
  name: string;
  locationId: ID | null;
  publishedAt: Date | null;
}) {
  const _locationId: string | null = locationId ?? null;

  const schedule = await sqlOne<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "Schedule" (shop, name, "locationId", "publishedAt")
    VALUES (${shop}, ${name}, ${_locationId}, ${publishedAt!})
    RETURNING *;
  `;

  return mapSchedule(schedule);
}

export async function updateSchedule({
  id,
  shop,
  name,
  locationId,
  publishedAt,
}: {
  id: number;
  shop: string;
  name: string;
  locationId: ID | null;
  publishedAt: Date | null;
}) {
  const _locationId: string | null = locationId;

  const [schedule] = await sql<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "Schedule"
    SET name          = ${name},
        "locationId"  = ${_locationId},
        "publishedAt" = ${publishedAt!}
    WHERE id = ${id}
      AND shop = ${shop}
    RETURNING *
  `;

  if (!schedule) {
    throw new HttpError('Schedule not found', 404);
  }

  return mapSchedule(schedule);
}

export async function updateSchedules(
  schedules: {
    id: number;
    shop: string;
    name: string;
    locationId: ID | null;
    publishedAt: Date | null;
  }[],
) {
  if (!isNonEmptyArray(schedules)) {
    return [];
  }

  const { id, shop, name, locationId, publishedAt } = nest(schedules);
  const _locationId: (string | null)[] = locationId;

  const updatedSchedules = await sql<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "Schedule" es
    SET name          = input.name,
        "locationId"  = input."locationId",
        "publishedAt" = input."publishedAt"
    FROM UNNEST(
           ${id} :: int[],
           ${shop} :: text[],
           ${name} :: text[],
           ${_locationId} :: text[],
           ${publishedAt as Date[]} :: timestamptz[]
         ) AS input(id, shop, name, "locationId", "publishedAt")
    WHERE es.id = input.id
      AND es.shop = input.shop
    RETURNING es.*;
  `;

  return updatedSchedules.map(mapSchedule);
}

export async function deleteSchedules(
  schedules: {
    id: number;
    shop: string;
  }[],
) {
  if (!isNonEmptyArray(schedules)) {
    return;
  }

  const { id, shop } = nest(schedules);

  await sql`
    DELETE
    FROM "Schedule"
    WHERE (id, shop) IN (SELECT *
                         FROM UNNEST(
                           ${id} :: int[],
                           ${shop} :: text[]
                              ))
  `;
}

/**
 * Publish a schedule right away if not scheduled yet.
 */
export async function publishSchedule({ shop, id }: { shop: string; id: number }) {
  const [schedule] = await sql<{
    id: number;
    shop: string;
    name: string;
    locationId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "Schedule"
    SET "publishedAt" = NOW()
    WHERE shop = ${shop}
      AND id = ${id}
      AND "publishedAt" IS NULL
    RETURNING *;
  `;

  if (!schedule) {
    return null;
  }

  return mapSchedule(schedule);
}

export async function deleteSchedule({ shop, id }: { shop: string; id: number }) {
  await sql`
    DELETE
    FROM "Schedule"
    WHERE shop = ${shop}
      AND id = ${id};
  `;
}

export async function getScheduleEvents({
  from,
  to,
  shop,
  scheduleId,
  staffMemberId,
  published,
  taskId,
}: {
  from: Date;
  to: Date;
  shop: string;
  scheduleId?: number;
  staffMemberId?: ID;
  published?: boolean;
  taskId?: number;
}) {
  const _staffMemberId: string | null = staffMemberId ?? null;

  const items = await sql<{
    id: number;
    scheduleId: number;
    name: string;
    description: string;
    color: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT DISTINCT esi.*
    FROM "ScheduleEvent" esi
           INNER JOIN "Schedule" es ON es.id = esi."scheduleId"
           LEFT JOIN "ScheduleEventAssignment" esia ON esia."ScheduleEventId" = esi.id
           LEFT JOIN "ScheduleEventTask" esit ON esit."ScheduleEventId" = esi.id
    WHERE es.shop = ${shop}
      AND es.id = COALESCE(${scheduleId ?? null}, es.id)
      AND ("publishedAt" IS NOT NULL AND "publishedAt" <= NOW()) =
          COALESCE(${published ?? null}, ("publishedAt" IS NOT NULL AND "publishedAt" <= NOW()))
      AND esia."staffMemberId" IS NOT DISTINCT FROM COALESCE(${_staffMemberId}, esia."staffMemberId")
      AND ((start >= ${from} AND start < ${to}) OR
           ("end" >= ${from} AND "end" < ${to}))
      AND esit."taskId" IS NOT DISTINCT FROM COALESCE(${taskId ?? null}, esit."taskId");
  `;

  return items.map(mapScheduleEvent);
}

export async function getScheduleEvent({ id, scheduleId }: { id: number; scheduleId: number }) {
  const [item] = await sql<{
    id: number;
    scheduleId: number;
    name: string;
    description: string;
    color: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ScheduleEvent"
    WHERE id = ${id}
      AND "scheduleId" = ${scheduleId};
  `;

  if (!item) {
    return null;
  }

  return mapScheduleEvent(item);
}

export function mapScheduleEvent(item: {
  id: number;
  scheduleId: number;
  name: string;
  description: string;
  start: Date;
  end: Date;
  createdAt: Date;
  updatedAt: Date;
  color: string;
}) {
  try {
    return item;
  } catch (error) {
    sentryErr(error, { item });
    throw new HttpError('Unable to parse employee schedule item', 500);
  }
}

export async function insertScheduleEvent({
  scheduleId,
  name,
  description,
  start,
  end,
  color,
}: {
  scheduleId: number;
  name: string;
  description: string;
  start: Date;
  end: Date;
  color: string;
}) {
  const ScheduleEvent = await sqlOne<{
    id: number;
    scheduleId: number;
    name: string;
    description: string;
    color: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "ScheduleEvent" ("scheduleId", name, description, start, "end", color)
    VALUES (${scheduleId}, ${name}, ${description}, ${start}, ${end}, ${color})
    RETURNING *;
  `;

  return mapScheduleEvent(ScheduleEvent);
}

export async function updateScheduleEvent({
  id,
  scheduleId,
  name,
  description,
  start,
  end,
  color,
}: {
  id: number;
  scheduleId: number;
  name: string;
  description: string;
  start: Date;
  end: Date;
  color: string;
}) {
  const ScheduleEvent = await sqlOne<{
    id: number;
    scheduleId: number;
    name: string;
    description: string;
    color: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "ScheduleEvent"
    SET name            = ${name},
        description     = ${description},
        start           = ${start},
        "end"           = ${end},
        color           = ${color}
    WHERE id = ${id}
      AND "scheduleId" = ${scheduleId}
    RETURNING *;
  `;

  if (!ScheduleEvent) {
    throw new HttpError('Schedule item not found', 404);
  }

  return mapScheduleEvent(ScheduleEvent);
}

export async function deleteScheduleEvent({ id, scheduleId }: { id?: number; scheduleId: number }) {
  await sql`
    WITH "ItemsToDelete" AS (SELECT id
                             FROM "ScheduleEvent"
                             WHERE id = COALESCE(${id ?? null}, id)
                               AND "scheduleId" = ${scheduleId}),
         "DeleteAssignments" AS (
           DELETE FROM "ScheduleEventAssignment"
             WHERE "ScheduleEventId" IN (SELECT id FROM "ItemsToDelete")),
         "DeleteTasks" AS (
           DELETE FROM "ScheduleEventTask"
             WHERE "ScheduleEventId" IN (SELECT id FROM "ItemsToDelete"))
    DELETE
    FROM "ScheduleEvent"
    WHERE id IN (SELECT id FROM "ItemsToDelete")


  `;
}

export async function insertEmployeeAvailability({
  shop,
  staffMemberId,
  available,
  start,
  end,
}: {
  shop: string;
  staffMemberId: ID;
  available: boolean;
  start: Date;
  end: Date;
}) {
  const availability = await sqlOne<{
    shop: string;
    id: number;
    staffMemberId: string;
    available: boolean;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "EmployeeAvailability" (shop, "staffMemberId", available, start, "end")
    VALUES (${shop}, ${staffMemberId as string}, ${available}, ${start}, ${end})
    RETURNING *;
  `;

  return mapEmployeeAvailability(availability);
}

function mapEmployeeAvailability(availability: {
  id: number;
  staffMemberId: string;
  available: boolean;
  start: Date;
  end: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { staffMemberId } = availability;

  try {
    assertGid(staffMemberId);

    return {
      ...availability,
      staffMemberId,
    };
  } catch (error) {
    sentryErr(error, { availability });
    throw new HttpError('Unable to parse employee availability', 500);
  }
}

export async function updateEmployeeAvailability({
  id,
  shop,
  staffMemberId,
  available,
  start,
  end,
}: {
  id: number;
  shop: string;
  staffMemberId: ID;
  available: boolean;
  start: Date;
  end: Date;
}) {
  const [availability] = await sql<{
    shop: string;
    id: number;
    staffMemberId: string;
    available: boolean;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    UPDATE "EmployeeAvailability"
    SET available = ${available},
        start     = ${start},
        "end"     = ${end}
    WHERE id = ${id}
      AND shop = ${shop}
      -- Staff member id cannot be updated
      AND "staffMemberId" = ${staffMemberId as string}
    RETURNING *;
  `;

  if (!availability) {
    throw new HttpError('Availability not found', 404);
  }

  return mapEmployeeAvailability(availability);
}

export async function deleteEmployeeAvailability({
  id,
  shop,
  staffMemberId,
}: {
  id: number;
  shop: string;
  staffMemberId: ID;
}) {
  await sql`
    DELETE
    FROM "EmployeeAvailability"
    WHERE id = ${id}
      AND shop = ${shop}
      AND "staffMemberId" = ${staffMemberId as string};
  `;
}

export async function getEmployeeAvailability({ shop, id }: { shop: string; id: number }) {
  const [availability] = await sql<{
    id: number;
    shop: string;
    staffMemberId: string;
    available: boolean;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "EmployeeAvailability"
    WHERE id = ${id}
      AND shop = ${shop};
  `;

  if (!availability) {
    return null;
  }

  return mapEmployeeAvailability(availability);
}

export async function getEmployeeAvailabilities({
  from,
  to,
  shop,
  staffMemberId,
}: {
  from: Date;
  to: Date;
  shop: string;
  staffMemberId?: ID;
}) {
  const availabilities = await sql<{
    id: number;
    staffMemberId: string;
    available: boolean;
    shop: string;
    start: Date;
    end: Date;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "EmployeeAvailability"
    WHERE shop = ${shop}
      AND ("start" >= ${from} OR "start" < ${to})
      AND ("end" >= ${from} OR "end" < ${to})
      AND "staffMemberId" IS NOT DISTINCT FROM COALESCE(${(staffMemberId as string | undefined) ?? null}, "staffMemberId");
  `;

  return availabilities.map(mapEmployeeAvailability);
}

export async function getScheduleEventAssignments(ids: number[]) {
  const assignments = await sql<{
    id: number;
    ScheduleEventId: number;
    staffMemberId: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "ScheduleEventAssignment" esia
    WHERE esia."ScheduleEventId" = ANY (${ids} :: int[]);
  `;

  return assignments.map(mapScheduleEventAssignment);
}

function mapScheduleEventAssignment(assignment: {
  id: number;
  ScheduleEventId: number;
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
    throw new HttpError('Unable to parse employee schedule item assignment', 500);
  }
}

export async function deleteScheduleEventAssignments({ ScheduleEventId }: { ScheduleEventId: number }) {
  await sql`
    DELETE
    FROM "ScheduleEventAssignment"
    WHERE "ScheduleEventId" = ${ScheduleEventId};
  `;
}

export async function insertScheduleEventAssignments(
  assignments: {
    ScheduleEventId: number;
    staffMemberId: ID;
  }[],
) {
  if (!isNonEmptyArray(assignments)) {
    return [];
  }

  const { ScheduleEventId, staffMemberId } = nest(assignments);

  const result = await sql<{
    id: number;
    ScheduleEventId: number;
    staffMemberId: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "ScheduleEventAssignment" ("ScheduleEventId", "staffMemberId")
    SELECT *
    FROM UNNEST(
      ${ScheduleEventId} :: int[],
      ${staffMemberId as string[]} :: text[]
         )
    RETURNING *;
  `;

  return result.map(mapScheduleEventAssignment);
}

export async function deleteScheduleEventTasks({ ScheduleEventId }: { ScheduleEventId: number }) {
  await sql`
    DELETE
    FROM "ScheduleEventTask"
    WHERE "ScheduleEventId" = ${ScheduleEventId};
  `;
}

export async function insertScheduleEventTasks(
  links: {
    itemId: number;
    taskId: number;
  }[],
) {
  if (!isNonEmptyArray(links)) {
    return [];
  }

  const { itemId, taskId } = nest(links);

  return await sql<{ id: number; ScheduleEventId: number; taskId: number; createdAt: Date; updatedAt: Date }>`
    INSERT INTO "ScheduleEventTask" ("ScheduleEventId", "taskId")
    SELECT *
    FROM UNNEST(
      ${itemId} :: int[],
      ${taskId} :: int[]
         )
    RETURNING *;
  `;
}

export async function getScheduleEventTasks(ids: number[]) {
  if (ids.length === 0) {
    return [];
  }

  return await sql<{ id: number; ScheduleEventId: number; taskId: number; createdAt: Date; updatedAt: Date }>`
    SELECT DISTINCT *
    FROM "ScheduleEventTask"
    WHERE "ScheduleEventId" = ANY (${ids} :: int[]);
  `;
}

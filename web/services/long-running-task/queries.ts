import { sql } from '../db/sql-tag.js';

export async function getLongRunningTask(name: string) {
  const [task] = await sql<{
    id: number;
    name: string;
    progress: number;
    progressMax: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "LongRunningTask"
    WHERE name = ${name};
  `;

  if (!task) {
    return null;
  }

  return task;
}

export async function getLongRunningTasksLike(name: string) {
  const tasks = await sql<{
    id: number;
    name: string;
    progress: number;
    progressMax: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "LongRunningTask"
    WHERE name LIKE ${name}
    ORDER BY "createdAt" DESC
  `;

  return tasks;
}

export async function insertLongRunningTask({
  name,
  progress,
  progressMax,
}: {
  name: string;
  progress: number;
  progressMax?: number;
}) {
  await sql`
    INSERT INTO "LongRunningTask" (name, progress, "progressMax")
    VALUES (${name}, ${progress}, ${progressMax ?? null})
  `;
}

export async function updateLongRunningTask({
  name,
  progress,
  progressMax,
}: {
  name: string;
  progress: number;
  progressMax?: number;
}) {
  await sql`
    UPDATE "LongRunningTask"
    SET "progress"    = ${progress},
        "progressMax" = ${progressMax ?? null}
    WHERE name = ${name};
  `;
}

export async function removeLongRunningTask(name: string) {
  await sql`
    DELETE
    FROM "LongRunningTask"
    WHERE name = ${name};
  `;
}

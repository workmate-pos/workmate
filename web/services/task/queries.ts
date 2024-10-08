import { sql } from '../db/sql-tag.js';

export async function getTask(name: string) {
  const [task] = await sql<{
    id: number;
    name: string;
    progress: number;
    progressMax: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Task"
    WHERE name = ${name};
  `;

  if (!task) {
    return null;
  }

  return task;
}

export async function insertTask({
  name,
  progress,
  progressMax,
}: {
  name: string;
  progress: number;
  progressMax?: number;
}) {
  await sql`
    INSERT INTO "Task" (name, progress, "progressMax")
    VALUES (${name}, ${progress}, ${progressMax ?? null})
  `;
}

export async function updateTask({
  name,
  progress,
  progressMax,
}: {
  name: string;
  progress: number;
  progressMax?: number;
}) {
  await sql`
    UPDATE "Task"
    SET "progress"    = ${progress},
        "progressMax" = ${progressMax!}
    WHERE name = ${name};
  `;
}

export async function removeTask(name: string) {
  await sql`
    DELETE
    FROM "Task"
    WHERE name = ${name};
  `;
}

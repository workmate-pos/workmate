import { unit } from '../db/unit-of-work.js';
import { getTask, insertTask, removeTask, updateTask } from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export type RunTaskContext = {
  updateProgress: (progress: { progress: number; progressMax?: number }) => Promise<void>;
};

export async function runTask<T>(name: string, fn: (context: RunTaskContext) => T | Promise<T>, progressMax?: number) {
  await unit(async () => {
    const task = await getTask(name);

    if (task) {
      throw new HttpError('Task already running', 400);
    }

    await insertTask({
      name,
      progress: 0,
      progressMax,
    });
  });

  async function updateProgress(progress: { progress: number; progressMax?: number }) {
    await updateTask({
      name,
      progress: progress.progress,
      progressMax: progress.progressMax,
    });
  }

  try {
    return await fn({ updateProgress });
  } finally {
    await removeTask(name);
  }
}

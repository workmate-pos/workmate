import { unit } from '../db/unit-of-work.js';
import { getLongRunningTask, insertLongRunningTask, removeLongRunningTask, updateLongRunningTask } from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export type RunTaskContext = {
  updateProgress: (progress: { progress: number; progressMax?: number }) => Promise<void>;
};

export async function runLongRunningTask<T>(
  name: string,
  fn: (context: RunTaskContext) => T | Promise<T>,
  progressMax?: number,
) {
  await unit(async () => {
    const task = await getLongRunningTask(name);

    if (task) {
      throw new HttpError('Task already running', 400);
    }

    await insertLongRunningTask({
      name,
      progress: 0,
      progressMax,
    });
  });

  async function updateProgress(progress: { progress: number; progressMax?: number }) {
    await updateLongRunningTask({
      name,
      progress: progress.progress,
      progressMax: progress.progressMax,
    });
  }

  try {
    return await fn({ updateProgress });
  } finally {
    await removeLongRunningTask(name);
  }
}

/**
 * Class to get a fake progress bar.
 */
export class FakeProgress {
  private static PROGRESS_MAX = 0.95;
  /**
   * x value at which the progress bar is at the PROGRESS_MAX.
   */
  private static PROGRESS_MAX_INTERCEPT = Math.log(1 / (1 - FakeProgress.PROGRESS_MAX));

  private readonly start = new Date();

  constructor(private readonly estimatedTimeMs: number) {}

  getProgress() {
    const elapsedMs = new Date().getTime() - this.start.getTime();
    const elapsedRatio = Math.min(1, elapsedMs / this.estimatedTimeMs);
    return 1 - 1 / Math.exp(elapsedRatio * FakeProgress.PROGRESS_MAX_INTERCEPT);
  }
}

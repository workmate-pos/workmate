import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { getSyncProductOrVariantMetafieldsTaskName } from '../../services/metafields/sync.js';
import { Session } from '@shopify/shopify-api';
import { Request, Response } from 'express-serve-static-core';
import { getLongRunningTask } from '../../services/long-running-task/queries.js';

@Authenticated()
export default class TasksController {
  @Get('/sync/products')
  async fetchSyncProductMetafieldsTaskStatus(req: Request, res: Response<FetchTaskResponse>) {
    const session: Session = res.locals.shopify.session;
    const name = getSyncProductOrVariantMetafieldsTaskName(session.shop, 'product');
    return res.json(await getFetchTaskResponse(name));
  }

  @Get('/sync/variants')
  async fetchSyncVariantMetafieldsTaskStatus(req: Request, res: Response<FetchTaskResponse>) {
    const session: Session = res.locals.shopify.session;
    const name = getSyncProductOrVariantMetafieldsTaskName(session.shop, 'variant');
    return res.json(await getFetchTaskResponse(name));
  }
}

async function getFetchTaskResponse(name: string): Promise<FetchTaskResponse> {
  const task = await getLongRunningTask(name);

  if (!task) {
    return null;
  }

  return {
    progress: task.progress,
    progressMax: task.progressMax,
  };
}

export type FetchTaskResponse = null | {
  progress: number;
  progressMax: number | null;
};

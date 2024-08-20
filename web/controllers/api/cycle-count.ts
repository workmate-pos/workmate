import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { Permission } from '../../decorators/permission.js';
import { applyCycleCountItems, ApplyCycleCountPlan, getCycleCountApplyPlan } from '../../services/cycle-count/apply.js';
import { upsertCycleCount } from '../../services/cycle-count/upsert.js';
import { getDetailedCycleCount, getDetailedCycleCountsPage } from '../../services/cycle-count/get.js';
import { DetailedCycleCount } from '../../services/cycle-count/types.js';
import { ApplyCycleCount } from '../../schemas/generated/apply-cycle-count.js';
import { CreateCycleCount } from '../../schemas/generated/create-cycle-count.js';
import { CycleCountPaginationOptions } from '../../schemas/generated/cycle-count-pagination-options.js';

@Authenticated()
export default class CycleCountController {
  @Post('/:name/apply')
  @BodySchema('apply-cycle-count')
  @Permission('cycle_count')
  async applyCycleCount(
    req: Request<{ name: string }, unknown, ApplyCycleCount>,
    res: Response<ApplyCycleCountResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    await applyCycleCountItems(session, {
      cycleCountName: name,
      itemApplications: req.body.items,
    });
    const cycleCount = await getDetailedCycleCount(session, name);

    return res.json(cycleCount);
  }

  @Get('/:name/plan')
  @Permission('cycle_count')
  async planCycleCount(req: Request<{ name: string }>, res: Response<PlanCycleCountResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const plan = await getCycleCountApplyPlan(session, name);

    return res.json(plan);
  }

  @Post('/')
  @BodySchema('create-cycle-count')
  @Permission('cycle_count')
  async createCycleCount(req: Request<unknown, unknown, CreateCycleCount>, res: Response<CreateCycleCountResponse>) {
    const session: Session = res.locals.shopify.session;

    const { name } = await upsertCycleCount(session, req.body);
    const cycleCount = await getDetailedCycleCount(session, name);

    return res.json(cycleCount);
  }

  @Get('/:name')
  @Permission('cycle_count')
  async fetchCycleCount(req: Request<{ name: string }>, res: Response<FetchCycleCountResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const cycleCount = await getDetailedCycleCount(session, name);

    return res.json(cycleCount);
  }

  @Get('/')
  @QuerySchema('cycle-count-pagination-options')
  @Permission('cycle_count')
  async fetchCycleCounts(
    req: Request<unknown, unknown, unknown, CycleCountPaginationOptions>,
    res: Response<FetchCycleCountsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const cycleCounts = await getDetailedCycleCountsPage(session, paginationOptions);

    return res.json(cycleCounts);
  }
}

export type ApplyCycleCountResponse = DetailedCycleCount;
export type CreateCycleCountResponse = DetailedCycleCount;
export type FetchCycleCountResponse = DetailedCycleCount;
export type FetchCycleCountsResponse = DetailedCycleCount[];
export type PlanCycleCountResponse = ApplyCycleCountPlan;

import { Authenticated, BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { CreateAppPlanSubscription } from '../../schemas/generated/create-app-plan-subscription.js';
import { Int } from '../../services/gql/queries/generated/schema.js';
import { Permission } from '../../decorators/permission.js';
import { getAppPlan, getAppPlanSubscription, getAvailableAppPlans } from '../../services/app-plans/app-plans.js';
import { Session } from '@shopify/shopify-api';
import { IGetSubscriptionResult } from '../../services/db/queries/generated/app-plan.sql.js';

export type AppSubscriptionCreate = gql.appSubscriptions.appSubscriptionCreate.Result['appSubscriptionCreate'];

@Authenticated()
export default class AppPlansController {
  @Get('/')
  @Permission('read_app_plan')
  async getAvailableAppPlans(req: Request, res: Response<GetAvailableAppPlansResponse>) {
    const session: Session = res.locals.shopify.session;

    const availableAppPlans = await getAvailableAppPlans(session);
    return res.json({
      availableAppPlans,
      message:
        availableAppPlans.length === 0
          ? 'There are no standard plans available for your store. Please reach out for an enterprise plan'
          : undefined,
    });
  }

  @Get('/subscription')
  @Permission('read_app_plan')
  async getAppPlanSubscription(req: Request, res: Response<GetAppPlanSubscriptionResponse>) {
    const session = res.locals.shopify.session;
    const graphql = new Graphql(session);
    const appPlanSubscription = await getAppPlanSubscription(graphql);
    return res.json({ appPlanSubscription });
  }

  @Post('/subscription')
  @BodySchema('create-app-plan-subscription')
  @Permission('write_app_plan')
  async createNewAppPlan(
    req: Request<unknown, unknown, CreateAppPlanSubscription>,
    res: Response<CreateAppPlanSubscriptionResponse>,
  ): Promise<Response> {
    const session = res.locals.shopify.session;
    const graphql = new Graphql(session);
    const { appPlanId } = req.body;

    const appPlan = await getAppPlan(session, appPlanId);

    const appSubscription = await gql.appSubscriptions.appSubscriptionCreate.run(graphql, {
      name: `${appPlan.id}-${appPlan.name}`,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,
      test: process.env.NODE_ENV === 'development',
      trialDays: appPlan.trialDays === 0 ? undefined : (appPlan.trialDays as Int),
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              interval: appPlan.interval,
              price: {
                amount: appPlan.price,
                currencyCode: appPlan.currencyCode,
              },
            },
          },
        },
      ],
    });

    return res.json(appSubscription.appSubscriptionCreate);
  }
}

export type GetAvailableAppPlansResponse = {
  availableAppPlans: Awaited<ReturnType<typeof getAvailableAppPlans>>;
  message?: string;
};

export type GetAppPlanSubscriptionResponse = {
  appPlanSubscription: IGetSubscriptionResult | null;
};

export type CreateAppPlanSubscriptionResponse = AppSubscriptionCreate;

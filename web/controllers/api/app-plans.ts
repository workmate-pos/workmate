import { Authenticated, BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { AppPlan, appPlans, AppPlanSubscription } from '../../services/app-plans.js';
import { gql } from '../../services/gql/gql.js';
import { CreateAppPlanSubscription } from '../../schemas/generated/create-app-plan-subscription.js';
import { Int } from '../../services/gql/queries/generated/schema.js';
import { db } from '../../services/db/db.js';
import { getShopType } from '../../services/shop.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

export type AppSubscriptionCreate = gql.appSubscriptions.appSubscriptionCreate.Result['appSubscriptionCreate'];

@Authenticated()
export default class AppPlans {
  @Get('/')
  async getAvailableAppPlans(req: Request, res: Response<GetAvailableAppPlansResponse>) {
    const session = res.locals.shopify.session;
    const shop = session.shop;
    const graphql = new Graphql(session);

    // If locations > 1, disallow name=STARTER
    const locations = await gql.location.searchLocations.run(graphql, { query: '' });
    const appPlanSubscription = await appPlans.getAppPlanSubscription(graphql);
    const trialDaysUsed = await appPlans.getTrialDaysUsed(graphql);
    const shopType = await getShopType(graphql);

    const shopAppPlans = await db.appPlan.get({ shop });
    const availableAppPlans: AppPlan[] = [];
    for (const appPlan of shopAppPlans) {
      if (appPlan.type === 'DEFAULT') {
        if (appPlan.name === 'STARTER' && locations.locations.nodes.length > 1) continue;
        if (appPlan.name === 'STARTER' && shopType !== 'BASIC') continue;
        if (appPlan.name === 'BASIC' && shopType !== 'BASIC') continue;
        if (appPlan.name === 'PREMIUM' && shopType !== 'ADVANCED') continue;
      }
      if (appPlan.id === appPlanSubscription?.appPlanId && appPlanSubscription?.appSubscriptionStatus === 'ACTIVE') {
        continue;
      }
      appPlan.trialDays = Math.max(0, appPlan.trialDays - trialDaysUsed);
      availableAppPlans.push(appPlan);
    }

    return res.json({ availableAppPlans });
  }

  @Get('/subscription')
  async getAppPlanSubscription(req: Request, res: Response<GetAppPlanSubscriptionResponse>) {
    const session = res.locals.shopify.session;
    const graphql = new Graphql(session);
    const appPlanSubscription = await appPlans.getAppPlanSubscription(graphql);
    return res.json({ appPlanSubscription });
  }

  @Post('/subscription')
  @BodySchema('create-app-plan-subscription')
  async createNewAppPlan(
    req: Request<unknown, unknown, CreateAppPlanSubscription>,
    res: Response<CreateAppPlanSubscriptionResponse>,
  ): Promise<Response> {
    const session = res.locals.shopify.session;
    const shop = session.shop;
    const graphql = new Graphql(session);
    const { appPlanId } = req.body;

    const [appPlan] = await db.appPlan.get({ shop, id: appPlanId });
    if (appPlan == null) {
      throw new HttpError('App plan not found', 400);
    }

    const trialDaysUsed = await appPlans.getTrialDaysUsed(graphql);

    const appSubscription = await gql.appSubscriptions.appSubscriptionCreate.run(graphql, {
      name: `${appPlan.id}-${appPlan.name}`,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,
      test: process.env.NODE_ENV === 'development',
      trialDays: Math.max(0, appPlan.trialDays - trialDaysUsed) as Int,
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
  availableAppPlans: AppPlan[];
};

export type GetAppPlanSubscriptionResponse = {
  appPlanSubscription: AppPlanSubscription | null;
};

export type CreateAppPlanSubscriptionResponse = AppSubscriptionCreate;

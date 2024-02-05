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

export type AvailableAppPlans = {
  availableAppPlans: AppPlan[];
  message?: string;
};

@Authenticated()
export default class AppPlans {
  @Get('/')
  async getAvailableAppPlans(req: Request, res: Response<GetAvailableAppPlansResponse>) {
    const session = res.locals.shopify.session;
    const shop = session.shop;
    const graphql = new Graphql(session);

    // If locations > 1, disallow name=STARTER
    const [hasOneLocation, appPlanSubscription, shopType, shopAppPlans] = await Promise.all([
      gql.location.searchLocations.run(graphql, { query: '' }).then(locations => locations.locations.nodes.length <= 1),
      appPlans.getAppPlanSubscription(graphql),
      getShopType(graphql),
      db.appPlan.get({ shop }),
    ]);
    const trialDaysUsed = appPlans.getTrialDaysUsed(appPlanSubscription);

    const availableAppPlans: AppPlan[] = [];
    for (const appPlan of shopAppPlans) {
      if (appPlan.type === 'DEFAULT' && shopType !== 'PARTNER_DEVELOPMENT') {
        if (appPlan.name === 'STARTER' && !hasOneLocation) continue;
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

    let message = undefined;
    if (shopType === 'BASIC') {
      if (!hasOneLocation) {
        message = 'It seems you are on the Basic Shopify store plan and have more than one location — ';
        message += 'we have selected the Basic plan for you.';
      }
    } else if (shopType === 'ADVANCED') {
      message = 'It seems you are on the Advanced Shopify store plan — ';
      message += 'we have selected the Premium plan for you.';
    } else if (shopType === 'SHOPIFY_PLUS') {
      message = 'It seems you are on the Shopify Plus store plan, ';
      message += 'please reach out for an Enterprise plan.';
    }

    const payload: AvailableAppPlans = { availableAppPlans, message };
    return res.json(payload);
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

    const appPlanSubscription = await appPlans.getAppPlanSubscription(graphql);
    const trialDaysUsed = appPlans.getTrialDaysUsed(appPlanSubscription);
    const trialDays = Math.max(0, appPlan.trialDays - trialDaysUsed);

    const appSubscription = await gql.appSubscriptions.appSubscriptionCreate.run(graphql, {
      name: `${appPlan.id}-${appPlan.name}`,
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,
      test: process.env.NODE_ENV === 'development',
      trialDays: trialDays === 0 ? undefined : (trialDays as Int),
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

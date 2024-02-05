import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import * as gql from './gql/queries/generated/queries.js';
import { AppPlanName, IGetResult, IGetSubscriptionResult } from './db/queries/generated/app-plan.sql.js';
import { InstallableService } from '@teifi-digital/shopify-app-express/services/installable-service.js';
import { Permutations } from '../util/types.js';
import { AppSubscriptionStatus } from './gql/queries/generated/schema.js';
import { db } from './db/db.js';
import { MILLIS_IN_DAY } from '../util/date-utils.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const appPlanLevels = ['STARTER', 'BASIC', 'PREMIUM', 'ENTERPRISE'] as const satisfies Permutations<AppPlanName>;

export type AppPlan = IGetResult;
export type AppPlanSubscription = Omit<IGetSubscriptionResult, 'appSubscriptionStatus' | 'appSubscriptionShopifyId'> & {
  appSubscriptionStatus: AppSubscriptionStatus;
  appSubscriptionShopifyId: ID;
};

export class AppPlans extends InstallableService {
  async initStore(graphql: Graphql): Promise<void> {
    const activeSubscription = await gql.appSubscriptions.getCurrentAppSubscriptions
      .run(graphql, {})
      .then(res => res.currentAppInstallation.activeSubscriptions.filter(s => s.status === 'ACTIVE')[0]);
    if (activeSubscription == null) return;

    const shop = graphql.session.shop;
    const appPlanIdStr = activeSubscription.name.split('-')[0];
    if (appPlanIdStr == null) return;

    const [appPlan] = await db.appPlan.get({ shop, id: Number(appPlanIdStr) });
    if (appPlan == null) return;

    await db.appPlan.upsertSubscription({
      shop,
      appSubscriptionShopifyId: activeSubscription.id,
      appPlanId: appPlan.id,
      appSubscriptionStatus: activeSubscription.status,
    });
  }

  /**
   * Returns a cached app subscription status if it exists and is less than 24 hours old.
   * If the status is not 'ACTIVE', it will always fetch GraphQL.
   * Returns null if the app subscription does not exist.
   */
  async getAppPlanSubscription(graphql: Graphql): Promise<AppPlanSubscription | null> {
    const shop = graphql.session.shop;
    const [appPlanSubscription] = (await db.appPlan.getSubscription({ shop })) as AppPlanSubscription[];
    if (appPlanSubscription == null) return null;

    const updatedAt = new Date(appPlanSubscription.updatedAt);
    const now = new Date();
    const diff = now.getTime() - updatedAt.getTime();
    if (appPlanSubscription.appSubscriptionStatus === 'ACTIVE' && diff < MILLIS_IN_DAY) return appPlanSubscription;

    const liveAppSubscription = await gql.appSubscriptions.getAppSubscription.run(graphql, {
      id: appPlanSubscription.appSubscriptionShopifyId as ID,
    });
    if (liveAppSubscription.node == null || !('id' in liveAppSubscription.node)) return null;

    appPlanSubscription.appSubscriptionStatus = liveAppSubscription.node.status;
    await db.appPlan.upsertSubscription(appPlanSubscription);
    return appPlanSubscription;
  }

  async getTrialDaysUsed(graphql: Graphql): Promise<number> {
    const appInstallation = await gql.appSubscriptions.getCurrentAppSubscriptions.run(graphql, {});
    const earliestActiveSubscription = appInstallation.currentAppInstallation.activeSubscriptions.reduce(
      (earliest, activeSubscription) => {
        const createdAt = new Date(activeSubscription.createdAt as string);
        if (earliest == null || createdAt < earliest) return createdAt;
        return earliest;
      },
      null as Date | null,
    );
    return earliestActiveSubscription
      ? Math.floor((Date.now() - earliestActiveSubscription.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
  }
}

export const appPlans = new AppPlans();

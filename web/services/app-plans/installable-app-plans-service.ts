import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import * as gql from '../gql/queries/generated/queries.js';
import { AppPlanName } from '../db/queries/generated/app-plan.sql.js';
import { InstallableService } from '@teifi-digital/shopify-app-express/services/installable-service.js';
import { Permutations } from '../../util/types.js';
import { db } from '../db/db.js';

export const appPlanLevels = ['FREE', 'ESSENTIAL', 'ENTERPRISE'] as const satisfies Permutations<AppPlanName>;

export class InstallableAppPlansService extends InstallableService {
  async initStore(graphql: Graphql): Promise<void> {
    const [activeSubscription] = await gql.appSubscriptions.getCurrentAppSubscriptions
      .run(graphql, {})
      .then(res => res.currentAppInstallation.activeSubscriptions.filter(s => s.status === 'ACTIVE'));
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
}

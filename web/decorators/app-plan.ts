import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators/registry.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { appPlanLevels, appPlans } from '../services/app-plans.js';
import { err } from '@teifi-digital/shopify-app-express/utils/express-utils.js';
import { never } from '@teifi-digital/shopify-app-express/utils/never.js';
import { AppPlanName } from '../services/db/queries/generated/app-plan.sql.js';
import { AppSubscriptionStatus } from '../services/gql/queries/generated/schema.js';

export type AppPlanHandlerParam = {
  name: AppPlanName;
  statuses: AppSubscriptionStatus[];
};

export const AppPlanKey = 'app-plan';
export function AppPlan(name: AppPlanName, statuses: AppSubscriptionStatus[] = ['ACTIVE']) {
  return decorator<AppPlanHandlerParam>(AppPlanKey, { name, statuses });
}

export const appPlanHandler: DecoratorHandler<AppPlanHandlerParam> = ([{ name, statuses } = never()]) => {
  return (async (_req, res, next) => {
    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const requiredStatuses = new Set(statuses.map(s => s.toLowerCase()));
    const appPlanSubscription = await appPlans.getAppPlanSubscription(graphql);
    if (appPlanSubscription == null || !requiredStatuses.has(appPlanSubscription.appSubscriptionStatus.toLowerCase())) {
      const message =
        requiredStatuses.size === 1
          ? `You must have an ${[...requiredStatuses][0]} subscription`
          : 'App subscription status must be one of: ' + [...requiredStatuses].join(', ');
      return err(res, message, 401);
    }

    if (appPlanLevels.indexOf(appPlanSubscription.appPlanName) < appPlanLevels.indexOf(name)) {
      return err(res, `You must have at least a ${name.toLowerCase()} subscription for this feature`, 401);
    }

    if (res.locals.teifi == null) res.locals.teifi = {};
    res.locals.teifi.appPlanSubscription = appPlanSubscription;

    next();
  }) as RequestHandler;
};

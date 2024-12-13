import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { appPlanLevels } from '../services/app-plans/installable-app-plans-service.js';
import { err } from '@teifi-digital/shopify-app-express/utils';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { AppPlanName, IGetSubscriptionResult } from '../services/db/queries/generated/app-plan.sql.js';
import { AppSubscriptionStatus } from '../services/gql/queries/generated/schema.js';
import { getAppPlanSubscription } from '../services/app-plans/app-plans.js';

export type AppPlanHandlerParam = {
  name: AppPlanName;
  statuses: AppSubscriptionStatus[];
};

export const AppPlanKey = 'app-plan';
export function AppPlan(name: AppPlanName, statuses: AppSubscriptionStatus[] = ['ACTIVE']) {
  return decorator<AppPlanHandlerParam>(AppPlanKey, { name, statuses });
}

export type AppPlanSubscription = IGetSubscriptionResult;

export const appPlanHandler: DecoratorHandler<AppPlanHandlerParam> = ([{ name, statuses } = never()]) => {
  return (async (_req, res, next) => {
    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const requiredStatuses = new Set(statuses.map(s => s.toLowerCase()));
    const appPlanSubscription = await getAppPlanSubscription(graphql);
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
    res.locals.teifi.appPlanSubscription = appPlanSubscription satisfies AppPlanSubscription;

    next();
  }) as RequestHandler;
};

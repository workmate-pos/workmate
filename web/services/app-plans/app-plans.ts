import { MILLIS_IN_DAY } from '../../util/date-utils.js';
import { db } from '../db/db.js';
import * as gql from '../gql/queries/generated/queries.js';
import { ID, ShopPlanType } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { Session } from '@shopify/shopify-api';
import { getShopType } from '../shop.js';
import { IGetResult, IGetSubscriptionResult } from '../db/queries/generated/app-plan.sql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export function getAppPlanTrialDaysUsed(appPlanSubscription: IGetSubscriptionResult | null): number {
  if (appPlanSubscription === null) {
    return 0;
  }

  const trialCreatedAt = new Date(appPlanSubscription.appPlanTrialCreatedAt);

  if (isNaN(trialCreatedAt.getTime())) {
    return 0;
  }

  return Math.floor((Date.now() - trialCreatedAt.getTime()) / MILLIS_IN_DAY);
}

export async function getAppPlanSubscription(graphql: Graphql): Promise<IGetSubscriptionResult | null> {
  const shop = graphql.session.shop;
  const [appPlanSubscription] = await db.appPlan.getSubscription({ shop });

  if (!appPlanSubscription) {
    return null;
  }

  const timeSinceLastUpdate = Date.now() - appPlanSubscription.updatedAt.getTime();

  if (timeSinceLastUpdate > MILLIS_IN_DAY) {
    const { node: liveAppSubscription } = await gql.appSubscriptions.getAppSubscription.run(graphql, {
      id: appPlanSubscription.appSubscriptionShopifyId as ID,
    });

    if (liveAppSubscription?.__typename === 'AppSubscription') {
      await db.appPlan.upsertSubscription({
        ...appPlanSubscription,
        appSubscriptionStatus: liveAppSubscription.status,
      });

      appPlanSubscription.appSubscriptionStatus = liveAppSubscription.status;
    }
  }

  return appPlanSubscription;
}

export async function getAppPlan(session: Session, id: number) {
  const graphql = new Graphql(session);
  const { shop } = session;

  const [{ locations }, appPlanSubscription, [appPlan]] = await Promise.all([
    gql.location.searchLocations.run(graphql, {}),
    getAppPlanSubscription(graphql),
    db.appPlan.get({ shop, id }),
  ]);

  if (!appPlan) {
    throw new HttpError('App plan not found', 400);
  }

  const usedTrialDays = getAppPlanTrialDaysUsed(appPlanSubscription);

  return {
    ...appPlan,
    trialDays: Math.max(0, appPlan.trialDays - usedTrialDays),
    price: getAppPlanPrice(appPlan, { locations: locations.nodes.length }),
  };
}

export async function getAvailableAppPlans(session: Session) {
  const { shop } = session;
  const graphql = new Graphql(session);

  const [{ locations }, appPlanSubscription, shopType, appPlans] = await Promise.all([
    gql.location.searchLocations.run(graphql, {}),
    getAppPlanSubscription(graphql),
    getShopType(graphql),
    db.appPlan.get({ shop }),
  ]);

  const usedTrialDays = getAppPlanTrialDaysUsed(appPlanSubscription);
  const activeAppPlanId =
    appPlanSubscription?.appSubscriptionStatus === 'ACTIVE' ? appPlanSubscription.appPlanId : null;
  const storeProperties: StoreProperties = {
    activeAppPlanId,
    locations: locations.nodes.length,
    shopType,
    usedTrialDays,
  };

  const availableAppPlans = appPlans.filter(appPlan => isAppPlanAvailable(appPlan, storeProperties));

  return availableAppPlans.map(appPlan => ({
    ...appPlan,
    trialDays: Math.max(0, appPlan.trialDays - usedTrialDays),
    price: getAppPlanPrice(appPlan, storeProperties),
  }));
}

type StoreProperties = {
  locations: number;
  shopType: ShopPlanType;
  usedTrialDays: number;
  activeAppPlanId: number | null;
};

export function isAppPlanAvailable(appPlan: IGetResult, storeProperties: StoreProperties) {
  const { id, allowedShopifyPlans, maxLocations, trialOnly, trialDays } = appPlan;

  if (storeProperties.activeAppPlanId === id) {
    return false;
  }

  if (maxLocations !== null && storeProperties.locations > maxLocations) {
    return false;
  }

  if (allowedShopifyPlans !== null && !allowedShopifyPlans.includes(storeProperties.shopType)) {
    return false;
  }

  if (trialOnly && storeProperties.usedTrialDays >= trialDays) {
    return false;
  }

  return true;
}

export function getAppPlanPrice(appPlan: IGetResult, storeProperties: Pick<StoreProperties, 'locations'>) {
  const { extraLocationPrices } = appPlan;

  let price = appPlan.basePrice;

  for (let i = 0; i < storeProperties.locations - 1; i++) {
    price += extraLocationPrices ? extraLocationPrices[Math.min(extraLocationPrices.length - 1, i)] ?? 0 : 0;
  }

  return price;
}

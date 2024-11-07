import { Session } from '@shopify/shopify-api';
import {
  createCycleCountItemApplications,
  getCycleCount,
  getCycleCountItemApplications,
  getCycleCountItems,
} from './queries.js';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unit } from '../db/unit-of-work.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UUID } from '@work-orders/common/util/uuid.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { mutateInventoryQuantities } from '../inventory/adjust.js';

const COMPARE_QUANTITY_MISMATCH_ERROR_MESSAGE =
  'The compareQuantity argument no longer matches the persisted quantity.';

export async function applyCycleCountItems(session: Session, user: LocalsTeifiUser, plan: ApplyCycleCountPlan) {
  const { cycleCountName, itemApplications } = plan;

  if (itemApplications.length === 0) {
    // nothing to do
    return;
  }

  return await unit(async () => {
    const cycleCount = await getCycleCount({
      shop: session.shop,
      name: cycleCountName,
      locationIds: user.user.allowedLocationIds,
    });

    if (!cycleCount) {
      throw new HttpError('Cycle count not found', 404);
    }

    const items = await getCycleCountItems(cycleCount.id);

    for (const { uuid, countQuantity } of itemApplications) {
      const item = items.find(hasPropertyValue('uuid', uuid));

      if (!item) {
        throw new HttpError(`An item was not found, someone may be editing this cycle count at the same time`, 400);
      }

      if (item.countQuantity !== countQuantity) {
        throw new HttpError(
          'Count does not match the stored count, someone may be editing this cycle count at the same time',
          400,
        );
      }
    }

    await createCycleCountItemApplications(
      cycleCount.id,
      user.staffMember.id,
      itemApplications.map(({ originalQuantity, countQuantity, uuid }) => ({
        appliedQuantity: countQuantity,
        cycleCountItemUuid: uuid,
        originalQuantity,
      })),
    );

    try {
      await mutateInventoryQuantities(session, {
        type: 'set',
        initiator: {
          type: 'cycle-count',
          name: cycleCount.name,
        },
        name: 'available',
        reason: 'cycle_count_available',
        staffMemberId: user.staffMember.id,
        changes: itemApplications.map(({ originalQuantity, countQuantity, uuid }) => ({
          locationId: cycleCount.locationId,
          quantity: countQuantity,
          compareQuantity: originalQuantity,
          inventoryItemId:
            items.find(hasPropertyValue('uuid', uuid))?.inventoryItemId ??
            never('We already threw above if there was no associated item'),
        })),
      });
    } catch (error) {
      if (
        // TODO: Use userErrors.code for this - COMPARE_QUANTITY_STALE
        error instanceof GraphqlUserErrors &&
        error.userErrors.some(userError => userError.message === COMPARE_QUANTITY_MISMATCH_ERROR_MESSAGE)
      ) {
        throw new HttpError(
          'The inventory quantities of some items have changed since this overview was shown. A concurrent count may have occurred. Reload this tab to view an accurate count.',
          400,
        );
      }

      throw error;
    }
  });
}

export type ApplyCycleCountPlan = {
  cycleCountName: string;
  itemApplications: {
    originalQuantity: number;
    countQuantity: number;
    uuid: UUID;
  }[];
};

export async function getCycleCountApplyPlan(
  session: Session,
  name: string,
  locationIds: ID[] | null,
): Promise<ApplyCycleCountPlan> {
  const cycleCount = await getCycleCount({ shop: session.shop, name, locationIds });

  if (!cycleCount) {
    throw new HttpError('Cycle count not found', 404);
  }

  const [items, applications] = await Promise.all([
    getCycleCountItems(cycleCount.id),
    getCycleCountItemApplications(cycleCount.id),
  ]);

  const itemsToApply = items.filter(item => {
    const [lastItemApplication] = applications
      .filter(hasPropertyValue('cycleCountItemUuid', item.uuid))
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return lastItemApplication?.appliedQuantity !== item.countQuantity;
  });

  const inventoryItemIds = itemsToApply.map(item => item.inventoryItemId);
  const inventoryItems = await getInventoryItems(session, inventoryItemIds, cycleCount.locationId);

  const itemApplications = itemsToApply.map(item => {
    const inventoryItem = inventoryItems.find(hasPropertyValue('id', item.inventoryItemId));

    if (!inventoryItem) {
      throw new HttpError(
        `Could not apply count - inventory item not found for ${item.productTitle} - ${item.productVariantTitle}`,
        404,
      );
    }

    const originalQuantity = inventoryItem.inventoryLevel?.quantities.find(
      hasPropertyValue('name', 'available'),
    )?.quantity;

    if (typeof originalQuantity !== 'number') {
      throw new HttpError(
        `Could not apply count - inventory item level not found for ${item.productTitle} - ${item.productVariantTitle}`,
        404,
      );
    }

    return { ...pick(item, 'uuid', 'countQuantity'), originalQuantity };
  });

  return {
    cycleCountName: cycleCount.name,
    itemApplications,
  };
}

async function getInventoryItems(session: Session, ids: ID[], locationId: ID) {
  const graphql = new Graphql(session);

  const { nodes } = await gql.inventoryItems.getManyWithLocationInventoryLevel.run(graphql, { ids, locationId });

  return nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'InventoryItem'));
}

import { Session } from '@shopify/shopify-api';
import {
  CycleCount,
  getCycleCount,
  getCycleCountItemApplications,
  getCycleCountItems,
  getCycleCountsPage,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { CycleCountPaginationOptions } from '../../schemas/generated/cycle-count-pagination-options.js';
import { CycleCountApplicationStatus, DetailedCycleCount } from './types.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasNestedPropertyValue, hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { match } from 'ts-pattern';
import { DateTime } from '../gql/queries/generated/schema.js';

export async function getDetailedCycleCount(session: Session, name: string) {
  const cycleCount = await getCycleCount({ shop: session.shop, name });

  if (!cycleCount) {
    throw new HttpError('Cycle count not found', 404);
  }

  return getDetailedCycleCountForCycleCount(cycleCount);
}

async function getDetailedCycleCountForCycleCount(cycleCount: CycleCount): Promise<{
  name: string;
  note: string;
  status: string;
  locationId: ID;
  items: Awaited<ReturnType<typeof getDetailedCycleCountItems>>;
  applicationStatus: CycleCountApplicationStatus;
}> {
  const { status, locationId, note } = cycleCount;

  const items = await getDetailedCycleCountItems(cycleCount.id);

  const hasOnlyAppliedItems = items.every(hasPropertyValue('applicationStatus', 'APPLIED'));
  const hasOnlyNotAppliedItems = items.every(hasPropertyValue('applicationStatus', 'NOT_APPLIED'));

  const applicationStatus = match({ hasOnlyAppliedItems, hasOnlyNotAppliedItems })
    .returnType<CycleCountApplicationStatus>()
    .with({ hasOnlyAppliedItems: true }, () => 'APPLIED')
    .with({ hasOnlyNotAppliedItems: true }, () => 'NOT_APPLIED')
    .otherwise(() => 'PARTIALLY_APPLIED');

  return {
    name: cycleCount.name,
    note,
    status,
    locationId,
    items,
    applicationStatus,
  };
}

export async function getDetailedCycleCountsPage(
  session: Session,
  paginationOptions: CycleCountPaginationOptions,
): Promise<DetailedCycleCount[]> {
  const cycleCounts = await getCycleCountsPage(session.shop, paginationOptions);
  return await Promise.all(cycleCounts.map(cycleCount => getDetailedCycleCountForCycleCount(cycleCount)));
}

async function getDetailedCycleCountItems(cycleCountId: number) {
  const [items, applications] = await Promise.all([
    getCycleCountItems(cycleCountId),
    getCycleCountItemApplications(cycleCountId),
  ]);

  return items.map(item => {
    const itemApplications = applications.filter(hasNestedPropertyValue('cycleCountItemUuid', item.uuid));

    const [lastItemApplication] = itemApplications.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const applicationStatus = match(lastItemApplication)
      .returnType<CycleCountApplicationStatus>()
      .with(undefined, () => 'NOT_APPLIED')
      .with({ appliedQuantity: item.countQuantity }, () => 'APPLIED')
      .otherwise(() => 'PARTIALLY_APPLIED');

    return {
      ...pick(
        item,
        'uuid',
        'productVariantTitle',
        'productTitle',
        'productVariantId',
        'inventoryItemId',
        'countQuantity',
      ),
      applicationStatus,
      applications: itemApplications.map(application => ({
        ...pick(application, 'originalQuantity', 'appliedQuantity'),
        appliedAt: application.createdAt.toISOString() as DateTime,
      })),
    };
  });
}

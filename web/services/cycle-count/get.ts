import { Session } from '@shopify/shopify-api';
import {
  CycleCount,
  getCycleCount,
  getCycleCountEmployeeAssignments,
  getCycleCountItemApplications,
  getCycleCountItems,
  getCycleCountsPage,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { CycleCountPaginationOptions } from '../../schemas/generated/cycle-count-pagination-options.js';
import {
  CycleCountApplicationStatus,
  DetailedCycleCount,
  DetailedCycleCountEmployeeAssignment,
  DetailedCycleCountItem,
} from './types.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
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
  items: DetailedCycleCountItem[];
  applicationStatus: CycleCountApplicationStatus;
  employeeAssignments: DetailedCycleCountEmployeeAssignment[];
  dueDate: DateTime | null;
  locked: boolean;
}> {
  const { status, locationId, note, dueDate, locked } = cycleCount;

  const [items, employeeAssignments] = await Promise.all([
    getDetailedCycleCountItems(cycleCount.id),
    getDetailedCycleCountEmployeeAssignments(cycleCount.id),
  ]);

  const applicationStatus = deriveCycleCountApplicationStatus(items);

  return {
    name: cycleCount.name,
    note,
    status,
    locationId,
    items,
    locked,
    applicationStatus,
    employeeAssignments,
    dueDate: dueDate ? (new Date(dueDate).toISOString() as DateTime) : null,
  };
}

export async function getDetailedCycleCountsPage(
  session: Session,
  paginationOptions: CycleCountPaginationOptions,
): Promise<DetailedCycleCount[]> {
  const cycleCounts = await getCycleCountsPage(session.shop, paginationOptions);
  return await Promise.all(cycleCounts.map(cycleCount => getDetailedCycleCountForCycleCount(cycleCount)));
}

export async function getDetailedCycleCountItems(cycleCountId: number) {
  const [items, applications] = await Promise.all([
    getCycleCountItems(cycleCountId),
    getCycleCountItemApplications(cycleCountId),
  ]);

  return items.map(item => {
    const itemApplications = applications.filter(hasPropertyValue('cycleCountItemUuid', item.uuid));

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
      /**
       * Sorted from oldest to newest.
       */
      applications: itemApplications
        .map(application => ({
          ...pick(application, 'originalQuantity', 'appliedQuantity', 'staffMemberId'),
          appliedAt: application.createdAt.toISOString() as DateTime,
        }))
        .toSorted((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()),
    };
  });
}

export async function getDetailedCycleCountEmployeeAssignments(cycleCountId: number) {
  const assignments = await getCycleCountEmployeeAssignments(cycleCountId);
  return assignments.map(assignment => pick(assignment, 'employeeId'));
}

function deriveCycleCountApplicationStatus(items: DetailedCycleCountItem[]) {
  const hasOnlyAppliedItems = items.every(hasPropertyValue('applicationStatus', 'APPLIED'));
  const hasOnlyNotAppliedItems = items.every(hasPropertyValue('applicationStatus', 'NOT_APPLIED'));

  return match({ hasOnlyAppliedItems, hasOnlyNotAppliedItems })
    .returnType<CycleCountApplicationStatus>()
    .with({ hasOnlyNotAppliedItems: true }, () => 'NOT_APPLIED')
    .with({ hasOnlyAppliedItems: true }, () => 'APPLIED')
    .otherwise(() => 'PARTIALLY_APPLIED');
}

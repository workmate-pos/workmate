import * as queries from './queries.js';
import { CreateCycleCount, CreateCycleCountItem } from '../../schemas/generated/create-cycle-count.js';
import { unit } from '../db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import {
  getCycleCount,
  getCycleCountEmployeeAssignments,
  getCycleCountItemApplications,
  getCycleCountItems,
  removeCycleCountEmployeeAssignments,
  removeCycleCountItemsByUuid,
  upsertCycleCountItems,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { validateCreateCycleCount } from './validate.js';
import { getNewCycleCountName } from '../id-formatting.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';

export async function upsertCycleCount(session: Session, user: LocalsTeifiUser, createCycleCount: CreateCycleCount) {
  if (createCycleCount.name) {
    const cycleCount = await getCycleCount({
      shop: session.shop,
      name: createCycleCount.name,
      locationIds: user.user.allowedLocationIds,
    });

    if (!cycleCount) {
      throw new HttpError('Cycle count not found', 404);
    }

    if (cycleCount.locked && !user.user.superuser) {
      throw new HttpError('Cycle count is locked', 400);
    }
  }

  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createCycleCount.locationId],
    staffMemberId: user.staffMember.id,
  });

  validateCreateCycleCount(createCycleCount);

  return await unit(async () => {
    const { status, note, locationId, dueDate, locked } = createCycleCount;
    const name = createCycleCount.name ?? (await getNewCycleCountName(session.shop));

    const { id: cycleCountId } = await queries.upsertCycleCount({
      shop: session.shop,
      name,
      status,
      note,
      locationId,
      dueDate: dueDate ? new Date(dueDate) : null,
      locked,
    });

    await upsertCreateCycleCountItems(cycleCountId, createCycleCount);
    await upsertCycleCountEmployeeAssignments(cycleCountId, createCycleCount);

    return { id: cycleCountId, name };
  });
}

/**
 * Verify all changes are legal (e.g. deletions and changes to immutable fields) and update database items.
 */
async function upsertCreateCycleCountItems(cycleCountId: number, createCycleCount: CreateCycleCount) {
  const [currentItems, currentApplications] = await Promise.all([
    getCycleCountItems(cycleCountId),
    getCycleCountItemApplications(cycleCountId),
  ]);

  const deletedItems = currentItems.filter(item => !createCycleCount.items.some(hasPropertyValue('uuid', item.uuid)));

  if (deletedItems.some(item => currentApplications.some(hasPropertyValue('cycleCountItemUuid', item.uuid)))) {
    throw new HttpError('You cannot remove products whose count has been applied', 400);
  }

  for (const item of createCycleCount.items) {
    const currentItem = currentItems.find(hasPropertyValue('uuid', item.uuid));
    const isApplied = currentApplications.some(hasPropertyValue('cycleCountItemUuid', item.uuid));

    if (currentItem && isApplied) {
      const immutableFields: (keyof CreateCycleCountItem)[] = ['inventoryItemId', 'productVariantId'];

      for (const field of immutableFields) {
        if (item[field] !== currentItem[field]) {
          throw new HttpError(`Cannot change ${field} for products whose count has been applied`, 400);
        }
      }
    }
  }

  await removeCycleCountItemsByUuid(
    cycleCountId,
    deletedItems.map(item => item.uuid),
  );

  await upsertCycleCountItems(cycleCountId, createCycleCount.items);
}

async function upsertCycleCountEmployeeAssignments(cycleCountId: number, createCycleCount: CreateCycleCount) {
  const currentEmployeeAssignments = await getCycleCountEmployeeAssignments(cycleCountId);
  const deletedEmployeeAssignments = currentEmployeeAssignments.filter(
    assignment => !createCycleCount.employeeAssignments.some(hasPropertyValue('employeeId', assignment.employeeId)),
  );

  await removeCycleCountEmployeeAssignments(cycleCountId, deletedEmployeeAssignments);
  await queries.upsertCycleCountEmployeeAssignment(cycleCountId, createCycleCount.employeeAssignments);
}

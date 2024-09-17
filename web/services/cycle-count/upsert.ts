import * as queries from './queries.js';
import { CreateCycleCount, CreateCycleCountItem } from '../../schemas/generated/create-cycle-count.js';
import { unit } from '../db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import {
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

export async function upsertCycleCount(session: Session, createCycleCount: CreateCycleCount) {
  validateCreateCycleCount(createCycleCount);

  return await unit(async () => {
    const { status, note, locationId, dueDate } = createCycleCount;
    const name = createCycleCount.name ?? (await getNewCycleCountName(session.shop));

    const { id: cycleCountId } = await queries.upsertCycleCount({
      shop: session.shop,
      name,
      status,
      note,
      locationId,
      dueDate: dueDate ? new Date(dueDate) : null,
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

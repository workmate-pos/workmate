import { CreateCycleCount } from '../../schemas/generated/create-cycle-count.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export function validateCreateCycleCount(createCycleCount: CreateCycleCount) {
  validateUniqueUuids(createCycleCount);
  validateUniqueInventoryItemIds(createCycleCount);
}

function validateUniqueUuids(createCycleCount: CreateCycleCount) {
  const uuids = createCycleCount.items.map(item => item.uuid);

  if (unique(uuids).length !== uuids.length) {
    throw new Error('Duplicate uuids are not allowed');
  }
}

function validateUniqueInventoryItemIds(createCycleCount: CreateCycleCount) {
  const inventoryItemIds = createCycleCount.items.map(item => item.inventoryItemId);

  if (unique(inventoryItemIds).length !== inventoryItemIds.length) {
    throw new Error('Duplicate inventory item ids are not allowed');
  }
}

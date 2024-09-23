import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { DetailedCycleCount } from '@web/services/cycle-count/types.js';

export function getCreateCycleCountFromDetailedCycleCount(cycleCount: DetailedCycleCount): CreateCycleCount {
  return {
    name: cycleCount.name,
    status: cycleCount.status,
    note: cycleCount.note,
    locationId: cycleCount.locationId,
    items: cycleCount.items.map(item => ({
      inventoryItemId: item.inventoryItemId,
      countQuantity: item.countQuantity,
      uuid: item.uuid,
      productTitle: item.productTitle,
      productVariantTitle: item.productVariantTitle,
      productVariantId: item.productVariantId,
    })),
    employeeAssignments: cycleCount.employeeAssignments.map(assignment => ({
      employeeId: assignment.employeeId,
    })),
    dueDate: cycleCount.dueDate,
    locked: cycleCount.locked,
  };
}

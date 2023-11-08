import type { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import type { ShopSettings } from '../schemas/generated/shop-settings.js';

type CreateWorkOrderErrors = { [field in keyof CreateWorkOrder]?: string[] };

export function validateCreateWorkOrder(
  workOrder: CreateWorkOrder,
  settings: ShopSettings,
): CreateWorkOrderErrors | null {
  const errors: CreateWorkOrderErrors = {};

  if (!settings.statuses.some(status => workOrder.status === status.name)) {
    errors.status = [`Invalid status: ${workOrder.status}`];
  }

  const dueDate = new Date(workOrder.dueDate);
  if (dueDate.toString() === 'Invalid Date') {
    errors.dueDate = ['Invalid due date'];
  }

  for (const item of workOrder.items) {
    if (item.unitPrice < 0) {
      (errors.items ??= []).push(`Unit price cannot be negative for item ${item.productId}`);
    }

    if (item.quantity < 0) {
      (errors.items ??= []).push(`Quantity cannot be negative for item ${item.productId}`);
    }

    // TODO: check that this product exists in the database/shopify api
  }

  if (workOrder.price.tax < 0) {
    (errors.price ??= []).push['Tax amount cannot be negative'];
  }

  // TODO: verify that this aligns with the settings
  if (workOrder.price.discount < 0) {
    (errors.price ??= []).push['Discount amount cannot be negative'];
  }

  // TODO: verify that this aligns with the settings
  if (workOrder.price.deposit < 0) {
    (errors.price ??= []).push['Deposit amount cannot be negative'];
  }

  // TODO: Look these up in the database/shopify api
  workOrder.employeeAssignments;
  workOrder.customer;

  if (Object.keys(errors).length > 0) {
    return errors;
  }

  return null;
}

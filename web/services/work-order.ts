import { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import { getSettingsByShop } from './settings.js';
import type { WorkOrderPaginationOptions } from '../schemas/generated/work-order-pagination-options.js';
import { getFormattedId } from './id-format.js';
import { db } from './db/index.js';
import { never } from '../util/never.js';
import { unit } from './db/unit-of-work.js';

export async function upsertWorkOrder(shop: string, createWorkOrder: ValidatedCreateWorkOrder) {
  return await unit(async () => {
    // TODO: Remove these once customers and employees are supported
    const customerId = '0';
    await db.workOrder.createTestCustomerIfNotExists({ customerId, shop });

    const employeeId = '0';
    await db.workOrder.createTestEmployeeIfNotExists({ employeeId, shop });

    const isUpdate = createWorkOrder.name !== undefined;

    const [{ id } = never()] = await db.workOrder.upsert({
      shop,
      name: createWorkOrder.name ?? (await getFormattedId(shop)),
      status: createWorkOrder.status,
      customerId: customerId,
      depositAmount: createWorkOrder.price.deposit,
      taxAmount: createWorkOrder.price.tax,
      discountAmount: createWorkOrder.price.discount,
      shippingAmount: createWorkOrder.price.shipping,
      // TODO: Make sure everything is utc in front end and back end
      dueDate: new Date(createWorkOrder.dueDate),
      description: createWorkOrder.description,
    });

    if (isUpdate) {
      await db.employee.deleteWorkOrderEmployeeAssignments({ workOrderId: id });
      await db.workOrderProduct.remove({ workOrderId: id });
    }

    // TODO: Remove these once customers and employees are supported
    await db.employee.createEmployeeAssignment({ workOrderId: id, employeeId });

    // for (const { employeeId } of createWorkOrder.employeeAssignments) {
    //   await db.employee.createEmployeeAssignment({ workOrderId: id, employeeId });
    // }

    for (const { productVariantId, quantity, unitPrice } of createWorkOrder.products) {
      await db.workOrderProduct.insert({ productVariantId, unitPrice, quantity, workOrderId: id });
    }
  });
}

// TODO: figure out a way to share types between front end and back end
export async function getWorkOrder(shop: string, name: string) {
  const [workOrder] = await db.workOrder.get({ shop, name });

  if (!workOrder) {
    return null;
  }

  const employees = await db.employee.getAssignedEmployees({ workOrderId: workOrder.id });
  const [customer = never('Every work order has a customer')] = await db.customer.getWorkOrderCustomer({
    workOrderId: workOrder.id,
  });
  const products = await db.workOrderProduct.get({ workOrderId: workOrder.id });

  return {
    workOrder,
    customer,
    employees,
    products,
  };
}

export async function getPaginatedWorkOrders(shop: string, { fromName, status, limit }: WorkOrderPaginationOptions) {
  let cursorId: null | number = null;

  if (fromName) {
    const [cursorWorkOrder] = await db.workOrder.get({ shop, name: fromName });
    if (!cursorWorkOrder) {
      throw new Error('Invalid cursor');
    }
    cursorId = cursorWorkOrder.id;
  }

  return await db.workOrder.infoPage({
    shop,
    cursorId,
    status,
    limit,
  });
}

type ValidatedCreateWorkOrder = CreateWorkOrder & { _brand: readonly ['validated'] };
type CreateWorkOrderErrors = { [field in keyof CreateWorkOrder]?: string[] };

export async function validateCreateWorkOrder(
  shop: string,
  workOrder: CreateWorkOrder,
): Promise<
  { type: 'error'; errors: CreateWorkOrderErrors } | { type: 'validated'; validated: ValidatedCreateWorkOrder }
> {
  const settings = await getSettingsByShop(shop);

  const errors: CreateWorkOrderErrors = {};

  if (!settings.statuses.some(status => workOrder.status === status.name)) {
    errors.status = [`Invalid status: ${workOrder.status}`];
  }

  const dueDate = new Date(workOrder.dueDate);
  if (dueDate.toString() === 'Invalid Date') {
    errors.dueDate = ['Invalid due date'];
  }

  for (const product of workOrder.products) {
    // TODO: check that this product exists in the database/shopify api
  }

  // TODO: Look these up in the database/shopify api
  workOrder.employeeAssignments;
  workOrder.customer;

  if (Object.keys(errors).length > 0) {
    return { type: 'error', errors };
  }

  return { type: 'validated', validated: workOrder as ValidatedCreateWorkOrder };
}

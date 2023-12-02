import type { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import { getFormattedId } from './id-formatting.js';
import { db } from './db/db.js';
import { never } from '../util/never.js';
import { unit } from './db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from './gql/gql.js';
import type { ID } from './gql/queries/generated/schema.js';
import { StaffMemberFragmentResult } from './gql/queries/generated/queries.js';

export async function upsertWorkOrder(shop: string, createWorkOrder: CreateWorkOrder) {
  return await unit(async () => {
    const isUpdate = createWorkOrder.name !== undefined;

    const [workOrder = never('XD')] = await db.workOrder.upsert({
      shop,
      name: createWorkOrder.name ?? (await getFormattedId(shop)),
      status: createWorkOrder.status,
      customerId: createWorkOrder.customer.id,
      taxAmount: createWorkOrder.price.tax,
      discountAmount: createWorkOrder.price.discount,
      shippingAmount: createWorkOrder.price.shipping,
      dueDate: new Date(createWorkOrder.dueDate),
      description: createWorkOrder.description,
    });

    if (isUpdate) {
      await db.workOrderEmployeeAssignment.remove({ workOrderId: workOrder.id });
      await db.workOrderProduct.remove({ workOrderId: workOrder.id });
    }

    for (const { employeeId } of createWorkOrder.employeeAssignments) {
      await db.workOrderEmployeeAssignment.insert({ workOrderId: workOrder.id, employeeId });
    }

    for (const { productVariantId, quantity, unitPrice } of createWorkOrder.products) {
      await db.workOrderProduct.insert({ productVariantId, unitPrice, quantity, workOrderId: workOrder.id });
    }

    return workOrder;
  });
}

// TODO: figure out a way to share types between front end and back end
export async function getWorkOrder(session: Session, name: string) {
  const [workOrder] = await db.workOrder.get({ shop: session.shop, name });

  if (!workOrder) {
    return null;
  }

  const graphql = new Graphql(session);

  const getEmployees = async () => {
    const assignedEmployees = await db.workOrderEmployeeAssignment.get({ workOrderId: workOrder.id });
    const responses = await Promise.all(
      assignedEmployees.map(({ employeeId }) => gql.staffMember.getStaffMember(graphql, { id: employeeId as ID })),
    );
    return responses
      .map(response => response.staffMember)
      .filter(
        (staffMember): staffMember is StaffMemberFragmentResult & { active: true } => staffMember?.active ?? false,
      );
  };

  const [products, payments, customer, employees] = await Promise.all([
    db.workOrderProduct.get({ workOrderId: workOrder.id }),
    db.workOrderPayment.get({ workOrderId: workOrder.id }),
    gql.customer
      .getCustomer(graphql, {
        id: workOrder.customerId as ID,
      })
      .then(response => response.customer),
    getEmployees(),
  ]);

  return {
    workOrder: { ...workOrder, dueDate: workOrder.dueDate.toISOString() },
    payments,
    customer,
    employees,
    products,
  };
}

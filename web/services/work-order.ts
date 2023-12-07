import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import type { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import { getFormattedId } from './id-formatting.js';
import { db } from './db/db.js';
import { never } from '../util/never.js';
import { unit } from './db/unit-of-work.js';
import { gql } from './gql/gql.js';
import type { ID } from './gql/queries/generated/schema.js';
import { GetStaffMembersByIdOperationResult } from './gql/queries/generated/queries.js';
import { awaitNested } from '../util/promise.js';
import { PAYMENT_ADDITIONAL_DETAIL_KEYS } from './webhooks.js';

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
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
    });

    const { id: workOrderId } = workOrder;

    if (isUpdate) {
      // updating = removing all previous data and inserting the new data
      await db.workOrderEmployeeAssignment.remove({ workOrderId });
      await db.workOrderProduct.remove({ workOrderId });
      await db.workOrderServiceEmployeeAssignment.removeByWorkOrder({ workOrderId });
      await db.workOrderService.remove({ workOrderId });
    }

    for (const { employeeId } of createWorkOrder.employeeAssignments) {
      await db.workOrderEmployeeAssignment.insert({ workOrderId, employeeId });
    }

    for (const { productVariantId, quantity, unitPrice } of createWorkOrder.products) {
      await db.workOrderProduct.insert({ productVariantId, unitPrice, quantity, workOrderId });
    }

    for (const { productVariantId, employeeAssignments, basePrice } of createWorkOrder.services) {
      const [{ id: workOrderServiceId } = never('Insert should always return a row')] =
        await db.workOrderService.insert({
          workOrderId,
          basePrice,
          productVariantId,
        });

      for (const { employeeId, employeeRate, hours } of employeeAssignments) {
        await db.workOrderServiceEmployeeAssignment.insert({ employeeId, employeeRate, hours, workOrderServiceId });
      }
    }

    return workOrder;
  });
}

export async function getWorkOrder(session: Session, name: string) {
  const { shop } = session;

  const [workOrder] = await db.workOrder.get({ shop, name });

  if (!workOrder) {
    return null;
  }

  const graphql = new Graphql(session);

  type Node = GetStaffMembersByIdOperationResult['nodes'][number];
  type ActiveStaffMember = Node & { __typename: 'StaffMember'; active: true };
  const isActiveStaffMember = (node: Node): node is ActiveStaffMember =>
    node?.__typename === 'StaffMember' && node.active;

  const getStaffMembers = (ids: ID[]) =>
    gql.staffMember.getStaffMembersById(graphql, { ids }).then(({ nodes }) => nodes.filter(isActiveStaffMember));

  const workOrderId = workOrder.id;

  return await awaitNested({
    workOrder: { ...workOrder, dueDate: workOrder.dueDate.toISOString() },
    payments: db.workOrderPayment.get({ workOrderId }),
    products: db.workOrderProduct.get({ workOrderId }),
    customer: gql.customer
      .getCustomer(graphql, { id: workOrder.customerId as ID })
      .then(({ customer }) => customer ?? never()),
    employees: db.workOrderEmployeeAssignment
      .get({ workOrderId })
      .then(employees => getStaffMembers(employees.map(e => e.employeeId as ID))),
    services: db.workOrderService.get({ workOrderId }).then(services =>
      services.map(service => ({
        ...service,
        employeeAssignments: db.workOrderServiceEmployeeAssignment
          .get({ workOrderServiceId: service.id })
          .then(async employees => {
            const staffMembers = await getStaffMembers(employees.map(e => e.employeeId as ID));
            return staffMembers.map(staffMember => {
              const { employeeRate, hours } = employees.find(e => e.employeeId === staffMember.id) ?? never();
              return { ...staffMember, employeeRate, hours };
            });
          }),
      })),
    ),
    derivedFromOrder: workOrder.derivedFromOrderId
      ? gql.order
          .getOrderAttributes(graphql, { id: workOrder.derivedFromOrderId as ID })
          .then(({ order }) => order ?? never())
          .then(order => ({
            ...order,
            workOrderName:
              order.customAttributes.find(({ key }) => key == PAYMENT_ADDITIONAL_DETAIL_KEYS.WORK_ORDER_NAME)?.value ??
              undefined,
          }))
      : undefined,
  });
}

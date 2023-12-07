import type { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import { getFormattedId } from './id-formatting.js';
import { db } from './db/db.js';
import { never } from '../util/never.js';
import { unit } from './db/unit-of-work.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from './gql/gql.js';
import type { ID } from './gql/queries/generated/schema.js';
import { GetStaffMembersByIdOperationResult } from './gql/queries/generated/queries.js';

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
      const [{ id: workOrderServiceId } = never()] = await db.workOrderService.insert({
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
  const graphql = new Graphql(session);

  type Node = GetStaffMembersByIdOperationResult['nodes'][number];
  type ActiveStaffMember = Node & { __typename: 'StaffMember'; active: true };
  const isActiveStaffMember = (node: Node): node is ActiveStaffMember =>
    node?.__typename === 'StaffMember' && node.active;

  const getStaffMembers = (ids: ID[]) =>
    querySelect({
      query: () => gql.staffMember.getStaffMembersById(graphql, { ids }),
      select: ({ nodes }) => nodes.filter(isActiveStaffMember),
    });

  // TODO: some better abstraction than this to easily fetch deeply nested structures
  return await querySelect({
    query: () => db.workOrder.get({ shop, name }),
    select: ([workOrder = never()]) => ({
      workOrder: { ...workOrder, dueDate: workOrder.dueDate.toISOString() },
      payments: querySelect({ query: () => db.workOrderPayment.get({ workOrderId: workOrder.id }) }),
      products: querySelect({ query: () => db.workOrderProduct.get({ workOrderId: workOrder.id }) }),
      customer: querySelect({
        query: () => gql.customer.getCustomer(graphql, { id: workOrder.customerId as ID }),
        select: ({ customer }) => customer ?? never(),
      }),
      employees: querySelect({
        query: () => db.workOrderEmployeeAssignment.get({ workOrderId: workOrder.id }),
        select: employees => getStaffMembers(employees.map(e => e.employeeId as ID)),
      }),
      services: querySelect({
        query: () => db.workOrderService.get({ workOrderId: workOrder.id }),
        select: services =>
          services.map(async service => ({
            ...service,
            employeeAssignments: await querySelect({
              query: () => db.workOrderServiceEmployeeAssignment.get({ workOrderServiceId: service.id }),
              select: employees =>
                querySelect({
                  query: () => getStaffMembers(employees.map(employee => employee.employeeId as ID)),
                  select: staffMembers =>
                    staffMembers.map(staffMember => {
                      const { employeeRate, hours } = employees.find(e => e.employeeId === staffMember.id) ?? never();
                      return {
                        ...staffMember,
                        employeeRate,
                        hours,
                      };
                    }),
                }),
            }),
          })),
      }),
    }),
  });
}

// TODO: Move
// TODO: Support arbitrary amounts of nesting (create helper for it, w recursive type)
type QuerySelectArgs<R, S> = { query: () => Promise<R>; select?: (response: R) => S };

async function querySelect<R, S extends undefined>(args: QuerySelectArgs<R, S>): Promise<R>;

async function querySelect<R, S extends unknown[]>(
  args: QuerySelectArgs<R, S>,
): Promise<S extends (infer T)[] ? Awaited<T>[] : never>;

async function querySelect<R, S extends Record<string, unknown>>(
  args: QuerySelectArgs<R, S>,
): Promise<{ [K in keyof S]: Awaited<S[K]> }>;

async function querySelect<R, S>(args: QuerySelectArgs<R, S>): Promise<Awaited<S>>;

async function querySelect<R, S>({ query, select }: QuerySelectArgs<R, S>) {
  const response = await query();
  const selected = select ? await select(response) : response;

  if (Array.isArray(selected)) {
    const awaitedElements = await Promise.all(selected);
    return awaitedElements;
  }

  if (selected !== null && typeof selected === 'object') {
    const awaitedEntries = await Promise.all(Object.entries(selected).map(async ([key, value]) => [key, await value]));
    return Object.fromEntries(awaitedEntries);
  }

  return selected;
}

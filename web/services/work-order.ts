import { CreateWorkOrder } from '../schemas/generated/create-work-order.js';
import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
import { getSettingsByShop } from './settings.js';
import type { WorkOrderPaginationOptions } from '../schemas/generated/work-order-pagination-options.js';
import { getFormattedId } from './id-format.js';

export async function upsertWorkOrder(shop: string, createWorkOrder: ValidatedCreateWorkOrder) {
  const data = {
    shop,
    name: createWorkOrder.name ?? (await getFormattedId(shop)),
    status: createWorkOrder.status,
    customer: {
      // connect: {
      //   id_shop: {
      //     id: createWorkOrder.customer.id,
      //     shop,
      //   },
      // },
      // TODO: Remove this once customers are set up
      connectOrCreate: {
        create: {
          id: '0',
          name: 'Test Customer',
          shop,
        },
        where: {
          id: '0',
        },
      },
    },
    depositAmount: createWorkOrder.price.deposit,
    taxAmount: createWorkOrder.price.tax,
    discountAmount: createWorkOrder.price.discount,
    shippingAmount: createWorkOrder.price.shipping,
    dueDate: new Date(createWorkOrder.dueDate),
    description: createWorkOrder.description,
    products: {
      createMany: {
        data: createWorkOrder.products.map(product => ({
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
        })),
      },
    },
    employeeAssignments: {
      // createMany: {
      // data: createWorkOrder.employeeAssignments.map(assignment => ({
      //   employeeId: assignment.employeeId,
      //   employeeShop: shop,
      // })),
      // },
      // TODO: Remove this once employees are set up
      create: {
        shop,
        employee: {
          connectOrCreate: {
            create: {
              id: '0',
              shop,
              name: 'Test Employee',
            },
            where: {
              id: '0',
            },
          },
        },
      },
    },
  } satisfies Prisma.WorkOrderCreateInput;

  if (createWorkOrder.name) {
    return prisma.$transaction(async prisma => {
      // clean up old products as the update will re-create them
      await prisma.workOrderProduct.deleteMany({
        where: {
          workOrder: {
            name: createWorkOrder.name,
            shop,
          },
        },
      });

      return prisma.workOrder.update({
        where: { shop_name: { shop, name: data.name } },
        data,
      });
    });
  }

  return prisma.workOrder.create({ data });
}

export function getWorkOrder(shop: string, name: string) {
  return prisma.workOrder.findUnique({
    where: { shop_name: { shop, name } },
    select: {
      name: true,
      status: true,
      discountAmount: true,
      shippingAmount: true,
      depositAmount: true,
      taxAmount: true,
      dueDate: true,
      description: true,
      employeeAssignments: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      products: {
        select: {
          productId: true,
          unitPrice: true,
          quantity: true,
        },
      },
    },
  });
}

export function getPaginatedWorkOrders(shop: string, { fromName, status, limit }: WorkOrderPaginationOptions) {
  const cursor = fromName ? { shop_name: { shop, name: fromName } } : undefined;

  return prisma.workOrder.findMany({
    where: { shop, status },
    orderBy: { createdAt: 'desc' },
    cursor,
    skip: cursor ? 1 : undefined,
    take: limit,
    select: {
      name: true,
      status: true,
      dueDate: true,
      discountAmount: true,
      depositAmount: true,
      taxAmount: true,
      products: {
        select: {
          unitPrice: true,
          quantity: true,
        },
      },
    },
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

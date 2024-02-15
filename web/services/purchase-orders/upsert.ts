import { Session } from '@shopify/shopify-api';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { getNewPurchaseOrderId } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';

export async function upsertPurchaseOrder({ shop }: Session, createPurchaseOrder: CreatePurchaseOrder) {
  return await unit(async () => {
    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderId(shop));

    const isNew = createPurchaseOrder.name === null;
    const [currentPurchaseOrder] = isNew ? [] : await db.purchaseOrder.get({ shop, name });

    if (!isNew && !currentPurchaseOrder) {
      throw new HttpError('Purchase order not found', 404);
    }

    const [{ id: purchaseOrderId } = never()] = await db.purchaseOrder.upsert({
      shop,
      name,
      status: createPurchaseOrder.status,
      orderId: createPurchaseOrder.orderId,
      orderName: createPurchaseOrder.orderName,
      workOrderName: createPurchaseOrder.workOrderName,
      locationId: createPurchaseOrder.locationId,
      customerId: createPurchaseOrder.customerId,
      vendorCustomerId: createPurchaseOrder.vendorCustomerId,
      note: createPurchaseOrder.note,
      vendorName: createPurchaseOrder.vendorName,
      customerName: createPurchaseOrder.customerName,
      locationName: createPurchaseOrder.locationName,
      shipFrom: createPurchaseOrder.shipFrom,
      shipTo: createPurchaseOrder.shipTo,
      deposited: createPurchaseOrder.deposited,
      paid: createPurchaseOrder.paid,
      discount: createPurchaseOrder.discount,
      tax: createPurchaseOrder.tax,
      shipping: createPurchaseOrder.shipping,
      subtotal: createPurchaseOrder.subtotal,
    });

    await Promise.all([
      db.purchaseOrder.removeProducts({ purchaseOrderId }),
      db.purchaseOrder.removeCustomFields({ purchaseOrderId }),
      db.purchaseOrder.removeAssignedEmployees({ purchaseOrderId }),
    ]);

    await Promise.all([
      ...createPurchaseOrder.products.map(product => db.purchaseOrder.insertProduct({ ...product, purchaseOrderId })),
      ...Object.entries(createPurchaseOrder.customFields).map(([key, value]) =>
        db.purchaseOrder.insertCustomField({ purchaseOrderId, key, value }),
      ),
      ...createPurchaseOrder.employeeAssignments.map(employee =>
        db.purchaseOrder.insertAssignedEmployee({ ...employee, purchaseOrderId }),
      ),
    ]);

    // TODO: Also update shopify inventory depending on how the status changed

    return { name };
  });
}

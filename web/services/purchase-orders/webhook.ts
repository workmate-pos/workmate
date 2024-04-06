import { Session } from '@shopify/shopify-api';
import { getPurchaseOrder } from './get.js';
import { getShopSettings } from '../settings.js';
import { PurchaseOrderWebhookBody } from './types.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getAverageUnitCostForProductVariant } from './average-unit-cost.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { db } from '../db/db.js';

export async function sendPurchaseOrderWebhook(session: Session, name: string) {
  const purchaseOrder = await getPurchaseOrder(session, name);

  if (!purchaseOrder) {
    throw new Error(`Purchase order with name ${name} not found`);
  }

  const {
    purchaseOrderWebhook: { endpointUrl },
  } = await getShopSettings(session.shop);

  if (!endpointUrl) {
    return;
  }

  const [{ id } = never()] = await db.purchaseOrder.get({ name });

  const url = new URL(endpointUrl);

  const subtotal = BigDecimal.sum(
    ...purchaseOrder.lineItems.map(lineItem =>
      BigDecimal.fromMoney(lineItem.unitCost).multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0))),
    ),
  ).round(2);

  const total = BigDecimal.sum(
    subtotal,
    BigDecimal.fromString(purchaseOrder.tax ?? '0.00'),
    BigDecimal.fromString(purchaseOrder.shipping ?? '0.00'),
    BigDecimal.fromString(purchaseOrder.discount ?? '0.00'),
  )
    .round(2)
    .toMoney();

  const payload: PurchaseOrderWebhookBody = {
    purchaseOrder: {
      id,
      customFields: purchaseOrder.customFields,
      name: purchaseOrder.name,
      deposited: purchaseOrder.deposited,
      discount: purchaseOrder.discount,
      employeeAssignments: purchaseOrder.employeeAssignments.map(ea => ({
        id: ea.employeeId,
        name: ea.name ?? '',
      })),
      location: purchaseOrder.location
        ? {
            id: purchaseOrder.location.id,
            name: purchaseOrder.location.name,
          }
        : null,
      note: purchaseOrder.note,
      paid: purchaseOrder.paid,
      shipFrom: purchaseOrder.shipFrom,
      shipping: purchaseOrder.shipping,
      shipTo: purchaseOrder.shipTo,
      status: purchaseOrder.status,
      tax: purchaseOrder.tax,
      subtotal: subtotal.toMoney(),
      total,
      vendorName: purchaseOrder.vendorName,
      lineItems: await Promise.all(
        purchaseOrder.lineItems.map(async lineItem => {
          const productVariant = lineItem.productVariant;
          const averageUnitCost = await getAverageUnitCostForProductVariant(session.shop, productVariant.id);

          return {
            shopifyOrderLineItem: lineItem.shopifyOrderLineItem
              ? {
                  order: {
                    id: lineItem.shopifyOrderLineItem.order.id,
                    name: lineItem.shopifyOrderLineItem.order.name,
                  },
                  lineItemId: lineItem.shopifyOrderLineItem.id,
                }
              : null,
            availableQuantity: lineItem.availableQuantity,
            quantity: lineItem.quantity,
            averageUnitCost: averageUnitCost.toMoney(),
            unitCost: lineItem.unitCost,
            productVariant: {
              product: {
                id: productVariant.product.id,
                description: productVariant.product.description,
                handle: productVariant.product.handle,
                title: productVariant.product.title,
              },
              id: productVariant.id,
              inventoryItemId: productVariant.inventoryItemId,
              sku: productVariant.sku,
              title: productVariant.title,
            },
          };
        }),
      ),
    },
  };

  let agent = undefined;

  if (process.env.HTTP_PROXY_URL) {
    agent = new HttpsProxyAgent(process.env.HTTP_PROXY_URL);
  }

  await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    agent,
  });
}

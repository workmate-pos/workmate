import { Session } from '@shopify/shopify-api';
import { getDetailedPurchaseOrder } from './get.js';
import { getShopSettings } from '../settings.js';
import { PurchaseOrderWebhookBody } from './types.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getAverageUnitCostForProductVariant } from './average-unit-cost.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getVendors } from '../vendors/get.js';
import { getPurchaseOrder } from './queries.js';

export async function sendPurchaseOrderWebhook(session: Session, name: string) {
  const purchaseOrder = await getDetailedPurchaseOrder(session, name);

  if (!purchaseOrder) {
    throw new Error(`Purchase order with name ${name} not found`);
  }

  const [
    {
      purchaseOrderWebhook: { endpointUrl },
    },
    { id, createdAt, updatedAt },
    vendors,
  ] = await Promise.all([
    getShopSettings(session.shop),
    getPurchaseOrder({ shop: session.shop, name }).then(po => po ?? never()),
    getVendors(session),
  ]);

  if (!endpointUrl) {
    return;
  }

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
      placedDate: purchaseOrder.placedDate,
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
      vendor: purchaseOrder.vendorName
        ? {
            name: purchaseOrder.vendorName,
            metafields: Object.fromEntries(
              vendors
                .find(vendor => vendor.name === purchaseOrder.vendorName)
                ?.customer?.metafields?.nodes?.map(({ namespace, key, value }) => [`${namespace}.${key}`, value]) ?? [],
            ),
          }
        : null,
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
                productType: productVariant.product.productType,
              },
              id: productVariant.id,
              inventoryItemId: productVariant.inventoryItemId,
              sku: productVariant.sku,
              title: productVariant.title,
            },
          };
        }),
      ),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
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

import { Session } from '@shopify/shopify-api';
import { getPurchaseOrder } from './get.js';
import { getShopSettings } from '../settings.js';
import { PurchaseOrderWebhookBody } from './types.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import { indexBy } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

// TODO: Update this after merging with wo-router

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

  const url = new URL(endpointUrl);

  const total = BigDecimal.sum(
    BigDecimal.fromString(purchaseOrder.subtotal ?? '0.00'),
    BigDecimal.fromString(purchaseOrder.tax ?? '0.00'),
    BigDecimal.fromString(purchaseOrder.shipping ?? '0.00'),
    BigDecimal.fromString(purchaseOrder.discount ?? '0.00'),
  )
    .round(2)
    .toMoney();

  const graphql = new Graphql(session);

  const productVariants = await gql.products.getMany.run(graphql, {
    ids: purchaseOrder.products.map(product => product.productVariantId),
  });

  const productVariantById = indexBy(
    productVariants.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'ProductVariant')),
    pv => pv.id,
  );

  const payload: PurchaseOrderWebhookBody = {
    purchaseOrder: {
      customFields: purchaseOrder.customFields,
      name: purchaseOrder.name,
      deposited: purchaseOrder.deposited,
      discount: purchaseOrder.discount,
      employeeAssignments: purchaseOrder.employeeAssignments.map(ea => ({
        id: ea.employeeId,
        name: ea.employeeName ?? '',
      })),
      location: purchaseOrder.locationId
        ? {
            id: purchaseOrder.locationId,
            name: purchaseOrder.locationName ?? '',
          }
        : null,
      note: purchaseOrder.note ?? '',
      paid: purchaseOrder.paid,
      shipFrom: purchaseOrder.shipFrom ?? '',
      shipping: purchaseOrder.shipping,
      shipTo: purchaseOrder.shipTo ?? '',
      status: purchaseOrder.status,
      tax: purchaseOrder.tax,
      subtotal: purchaseOrder.subtotal ?? BigDecimal.ZERO.round(2).toMoney(),
      total,
      vendorName: purchaseOrder.vendorName,
      lineItems: purchaseOrder.products.map(product => {
        const productVariant = productVariantById[product.productVariantId] ?? never();

        return {
          shopifyOrderLineItem: null,
          availableQuantity: product.availableQuantity,
          quantity: product.quantity,
          averageUnitCost: BigDecimal.ZERO.toMoney(),
          unitCost: BigDecimal.ZERO.toMoney(),
          productVariant: {
            product: {
              id: productVariant.product.id,
              description: productVariant.product.description,
              handle: productVariant.product.handle,
              title: productVariant.product.title,
            },
            id: product.productVariantId,
            inventoryItemId: product.inventoryItemId,
            sku: product.sku,
            title: productVariant.title,
          },
        };
      }),
    },
  };

  await fetch(url, {
    method: 'GET',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

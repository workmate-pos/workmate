import type { getDetailedPurchaseOrder } from './get.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Int } from '../gql/queries/generated/schema.js';
import { DateTime } from '../../schemas/generated/create-purchase-order.js';

export type DetailedPurchaseOrder = NonNullable<Awaited<ReturnType<typeof getDetailedPurchaseOrder>>>;

// purchase orders exist entirely in our own database, so we can afford to fetch the full object for lower latency on the front end -> better UX
export type PurchaseOrderInfo = DetailedPurchaseOrder;

export type PurchaseOrderWebhookBody = {
  purchaseOrder: {
    /**
     * Included to allow consumers to have a stable reference.
     */
    id: number;
    name: string;
    placedDate: DateTime | null;
    shipFrom: string;
    shipTo: string;
    location: {
      id: ID;
      name: string;
    } | null;
    supplier: {
      id: number;
      name: string;
    } | null;
    note: string;
    subtotal: Money;
    total: Money;
    discount: Money | null;
    tax: Money | null;
    shipping: Money | null;
    deposited: Money | null;
    paid: Money | null;
    status: string;
    customFields: {
      [key: string]: string;
    };
    employeeAssignments: {
      id: ID;
      name: string;
    }[];
    lineItems: {
      shopifyOrderLineItem: {
        order: {
          id: ID;
          name: string;
        };
        lineItemId: ID;
      } | null;
      productVariant: {
        id: ID;
        sku: string | null;
        title: string;
        inventoryItemId: ID;
        product: {
          id: ID;
          title: string;
          handle: string;
          description: string;
        };
      };
      unitCost: Money;
      averageUnitCost: Money;
      quantity: Int;
      availableQuantity: Int;
    }[];
    createdAt: string;
    updatedAt: string;
  };
};

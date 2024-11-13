import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getSerial, getSerialsPage } from './queries.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getCustomers } from '../customer/queries.js';
import { getProductVariant } from '../product-variants/queries.js';
import { getLocationForSerial, getLocations } from '../locations/queries.js';
import { getWorkOrdersForSerial } from '../work-orders/queries.js';
import { getPurchaseOrdersForSerial } from '../purchase-orders/queries.js';
import { SerialPaginationOptions } from '../../schemas/generated/serial-pagination-options.js';
import { MergeUnion } from '../../util/types.js';
import { DateTime } from '../gql/queries/generated/schema.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProduct } from '../products/queries.js';
import { httpError } from '../../util/http-error.js';
import { getShopifyOrdersForSerial } from '../orders/queries.js';

export type DetailedSerial = NonNullable<Awaited<ReturnType<typeof getDetailedSerial>>>;

export async function getDetailedSerial(
  shop: string,
  filter: MergeUnion<{
    productVariantId: ID;
    serial: string;
  }>,
  allowedLocationIds: ID[] | null,
) {
  const [serial, [productVariant, product], location, workOrders, purchaseOrders, shopifyOrders] = await Promise.all([
    // TODO: Maybe just check location id afterwards? (for all except page)
    getSerial({ ...filter, shop, locationIds: allowedLocationIds }),
    getProductVariant(filter.productVariantId).then(
      async pv => [pv, pv ? await getProduct(pv.productId) : null] as const,
    ),
    getLocationForSerial({ ...filter, shop }),
    getWorkOrdersForSerial({ ...filter, shop, locationIds: allowedLocationIds }),
    getPurchaseOrdersForSerial({ ...filter, shop, locationIds: allowedLocationIds }),
    getShopifyOrdersForSerial({ ...filter, shop }),
  ]);

  if (!serial) {
    return null;
  }

  if (!productVariant || !product) {
    never('fk');
  }

  const customerIds = unique([
    ...workOrders.map(wo => wo.customerId),
    ...shopifyOrders.map(so => so.customerId).filter(isNonNullable),
  ]);

  const locationIds = unique([
    ...workOrders.map(wo => wo.locationId).filter(isNonNullable),
    ...purchaseOrders.map(po => po.locationId).filter(isNonNullable),
  ]);

  const [customers, locations] = await Promise.all([getCustomers(customerIds), getLocations(locationIds)]);

  return {
    serial: serial.serial,
    note: serial.note,
    sold: serial.sold,
    productVariant: {
      id: productVariant.productVariantId,
      title: productVariant.title,
      sku: productVariant.sku,
      inventoryItemId: productVariant.inventoryItemId,
      product: {
        id: product.productId,
        title: product.title,
        handle: product.handle,
        description: product.description,
        productType: product.productType,
        hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
      },
    },
    location: location
      ? {
          id: location.locationId,
          name: location.name,
        }
      : null,
    history: [
      ...purchaseOrders.map<SerialHistory>(po => {
        const location = po.locationId
          ? (locations.find(hasPropertyValue('locationId', po.locationId)) ?? never('fk'))
          : null;

        return {
          type: 'purchase-order',
          name: po.name,
          status: po.status,
          location: location ? { id: location.locationId, name: location.name } : null,
          date: po.createdAt.toISOString() as DateTime,
        };
      }),
      ...workOrders.map<SerialHistory>(wo => {
        const location = wo.locationId
          ? (locations.find(hasPropertyValue('locationId', wo.locationId)) ?? never('fk'))
          : null;
        const customer = customers.find(hasPropertyValue('customerId', wo.customerId)) ?? never('fk');

        return {
          type: 'work-order',
          name: wo.name,
          status: wo.status,
          location: location ? { id: location.locationId, name: location.name } : null,
          customer: {
            id: customer.customerId,
            displayName: customer.displayName,
            phone: customer.phone,
            email: customer.email,
          },
          date: wo.createdAt.toISOString() as DateTime,
        };
      }),
      ...shopifyOrders.map<SerialHistory>(so => {
        const customer = so.customerId ? customers.find(hasPropertyValue('customerId', so.customerId)) : null;

        return {
          type: 'shopify-order',
          orderType: so.orderType,
          id: so.orderId,
          name: so.name,
          customer: customer
            ? {
                id: customer.customerId,
                displayName: customer.displayName,
                phone: customer.phone,
                email: customer.email,
              }
            : null,
          date: so.createdAt.toISOString() as DateTime,
        };
      }),
    ].toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) satisfies SerialHistory[],
  };
}

type SerialHistory =
  | {
      type: 'purchase-order';
      name: string;
      status: string;
      location: {
        id: ID;
        name: string;
      } | null;
      date: DateTime;
    }
  | {
      type: 'work-order';
      name: string;
      status: string;
      location: {
        id: ID;
        name: string;
      } | null;
      customer: {
        id: ID;
        displayName: string;
        phone: string | null;
        email: string | null;
      };
      date: DateTime;
    }
  | {
      type: 'shopify-order';
      id: ID;
      orderType: 'ORDER' | 'DRAFT_ORDER';
      name: string;
      customer: {
        id: ID;
        displayName: string;
        phone: string | null;
        email: string | null;
      } | null;
      date: DateTime;
    };

export async function getDetailedSerialsPage(
  shop: string,
  paginationOptions: SerialPaginationOptions,
  locationIds: ID[] | null,
) {
  const { serials, hasNextPage } = await getSerialsPage(shop, paginationOptions, locationIds);

  return {
    serials: await Promise.all(
      serials.map(serial =>
        getDetailedSerial(shop, serial, locationIds).then(
          detailedSerial => detailedSerial ?? httpError(`Serial ${serial.serial} not found`),
        ),
      ),
    ),
    hasNextPage,
  };
}

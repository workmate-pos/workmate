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

export type DetailedSerial = NonNullable<Awaited<ReturnType<typeof getDetailedSerial>>>;

export async function getDetailedSerial(
  shop: string,
  filter: MergeUnion<{
    productVariantId: ID;
    serial: string;
  }>,
) {
  const [serial, [productVariant, product], location, workOrders, purchaseOrders] = await Promise.all([
    getSerial({ ...filter, shop }),
    getProductVariant(filter.productVariantId).then(
      async pv => [pv, pv ? await getProduct(pv.productId) : null] as const,
    ),
    getLocationForSerial({ ...filter, shop }),
    getWorkOrdersForSerial({ ...filter, shop }),
    getPurchaseOrdersForSerial({ ...filter, shop }),
  ]);

  if (!serial) {
    return null;
  }

  if (!productVariant || !product) {
    never('fk');
  }

  const [workOrderCustomers, purchaseOrderLocations] = await Promise.all([
    getCustomers(unique(workOrders.map(wo => wo.customerId))),
    getLocations(unique(purchaseOrders.map(po => po.locationId).filter(isNonNullable))),
  ]);

  return {
    serial: serial.serial,
    note: serial.note,
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
          ? (purchaseOrderLocations.find(hasPropertyValue('locationId', po.locationId)) ?? never('fk'))
          : null;

        return {
          type: 'purchase-order',
          name: po.name,
          status: po.status,
          location: location
            ? {
                id: location.locationId,
                name: location.name,
              }
            : null,
          date: po.createdAt.toISOString() as DateTime,
        };
      }),
      ...workOrders.map<SerialHistory>(wo => {
        const customer = workOrderCustomers.find(hasPropertyValue('customerId', wo.customerId)) ?? never('fk');

        return {
          type: 'work-order',
          name: wo.name,
          status: wo.status,
          customer: {
            id: customer.customerId,
            displayName: customer.displayName,
            phone: customer.phone,
            email: customer.email,
          },
          date: wo.createdAt.toISOString() as DateTime,
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
      customer: {
        id: ID;
        displayName: string;
        phone: string | null;
        email: string | null;
      };
      date: DateTime;
    };

export async function getDetailedSerialsPage(shop: string, paginationOptions: SerialPaginationOptions) {
  const { serials, hasNextPage } = await getSerialsPage(shop, paginationOptions);

  return {
    serials: await Promise.all(
      serials.map(serial =>
        getDetailedSerial(shop, serial).then(
          detailedSerial => detailedSerial ?? httpError(`Serial ${serial.serial} not found`),
        ),
      ),
    ),
    hasNextPage,
  };
}

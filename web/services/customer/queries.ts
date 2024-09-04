import { sql, sqlOne } from '../db/sql-tag.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { MergeUnion } from '../../util/types.js';

export async function getCustomerForSpecialOrder(specialOrderId: number) {
  const customer = await sqlOne<{
    customerId: string;
    shop: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT c.*
    FROM "Customer" c
           INNER JOIN "SpecialOrder" spo ON spo."customerId" = c."customerId"
    WHERE spo."id" = ${specialOrderId}
    LIMIT 1;
  `;

  return mapCustomer(customer);
}

export async function getCustomerForSerial({
  shop,
  serial,
  id,
  productVariantId,
}: MergeUnion<{ id: number } | { shop: string; serial: string; productVariantId: ID }>) {
  const _productVariantId: string | null = productVariantId ?? null;

  const [customer] = await sql<{
    customerId: string;
    shop: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT c.*
    FROM "ProductVariantSerial" pvs
    INNER JOIN "Customer" c USING ("customerId")
    WHERE pvs.id = COALESCE(${id ?? null}, pvs.id)
      AND pvs."productVariantId" = COALESCE(${_productVariantId}, pvs."productVariantId")
      AND pvs.serial = COALESCE(${serial ?? null}, pvs.serial)
      AND pvs.shop = COALESCE(${shop ?? null}, pvs.shop);
  `;

  if (!customer) {
    return null;
  }

  return mapCustomer(customer);
}

function mapCustomer(customer: {
  customerId: string;
  shop: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const { customerId } = customer;

  try {
    assertGid(customerId);

    return {
      ...customer,
      customerId,
    };
  } catch (error) {
    sentryErr(error, { customer });
    throw new HttpError('Unable to parse customer', 500);
  }
}

export async function getCustomers(customerIds: ID[]) {
  const customers = await sql<{
    customerId: string;
    shop: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>`
    SELECT *
    FROM "Customer"
    WHERE "customerId" = ANY (${customerIds as string[]} :: text[]);
  `;

  return customers.map(mapCustomer);
}

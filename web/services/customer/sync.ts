import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

export async function ensureCustomersExist(session: Session, customerIds: ID[]) {
  if (customerIds.length === 0) {
    return;
  }

  const databaseCustomers = await db.customers.getMany({ customerIds });
  const existingCustomerIds = new Set(databaseCustomers.map(customer => customer.customerId));
  const missingCustomerIds = customerIds.filter(customerId => !existingCustomerIds.has(customerId));

  await syncCustomers(session, missingCustomerIds);
}

export async function syncCustomersIfExists(session: Session, customerIds: ID[]) {
  if (customerIds.length === 0) {
    return;
  }

  const databaseCustomers = await db.customers.getMany({ customerIds });
  const existingCustomerIds = databaseCustomers.map(customer => {
    const customerId = customer.customerId;
    assertGid(customerId);
    return customerId;
  });

  await syncCustomers(session, existingCustomerIds);
}

export async function syncCustomers(session: Session, customerIds: ID[]) {
  if (customerIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.customer.getManyForDatabase.run(graphql, { ids: customerIds });
  const customers = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'Customer'));

  const errors: unknown[] = [];

  await upsertCustomers(session.shop, customers).catch(e => errors.push(e));

  if (customers.length !== customerIds.length) {
    errors.push(new Error(`Some customers were not found (${customers.length}/${customerIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync customers');
  }
}

export async function upsertCustomers(shop: string, customers: gql.customer.DatabaseCustomerFragment.Result[]) {
  if (customers.length === 0) {
    return;
  }

  await db.customers.upsertMany({
    customers: customers.map(({ id: customerId, email, phone, lastName, firstName, displayName, defaultAddress }) => ({
      shop,
      email,
      phone,
      lastName,
      firstName,
      customerId,
      displayName,
      address: defaultAddress?.formatted?.join('\n') ?? null,
    })),
  });
}

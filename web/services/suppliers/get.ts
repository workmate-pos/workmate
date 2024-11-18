import { Session } from '@shopify/shopify-api';
import * as queries from './queries.js';
import { SupplierPaginationOptions } from '../../schemas/generated/supplier-pagination-options.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export type DetailedSupplier = NonNullable<Awaited<ReturnType<typeof getDetailedSupplier>>>;

export async function getDetailedSupplier(session: Session, id: number) {
  const { shop } = session;

  const supplier = await queries.getSupplier(shop, { id });

  if (!supplier) {
    return null;
  }

  const [vendors, productVariants] = await Promise.all([
    queries.getSupplierVendors(supplier.id),
    queries.getSupplierProductVariants(supplier.id),
  ]);

  return {
    id: supplier.id,
    name: supplier.name,
    vendors: vendors.map(vendor => vendor.vendor),
    productVariantIds: productVariants.map(row => row.productVariantId),
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    lastUsedAt: supplier.lastUsedAt ?? supplier.updatedAt,
  };
}

export async function getDetailedSuppliers(session: Session, paginationOptions: SupplierPaginationOptions) {
  const { suppliers, hasNextPage } = await queries.getSuppliers(session.shop, paginationOptions);

  return {
    suppliers: await Promise.all(
      suppliers.map(supplier => getDetailedSupplier(session, supplier.id).then(supplier => supplier ?? never('pk'))),
    ),
    hasNextPage,
  };
}

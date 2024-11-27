import { Session } from '@shopify/shopify-api';
import { CreateSupplier } from '../../schemas/generated/create-supplier.js';
import { setSupplierVendors, getSupplier, insertSupplier, updateSupplier } from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export async function upsertSupplier(session: Session, id: number | null, createSupplier: CreateSupplier) {
  const { shop } = session;
  const { name, address, vendors } = createSupplier;

  const existingSupplier = await getSupplier(shop, { name });

  if (id === null) {
    if (existingSupplier) {
      throw new HttpError('Supplier name taken', 400);
    }

    const supplier = await insertSupplier(shop, { name, address });
    id = supplier.id;
  } else {
    if (!existingSupplier) {
      throw new HttpError('Supplier not found', 404);
    }

    // if changing name, ensure that it is not already taken
    if (existingSupplier.name !== name) {
      if (await getSupplier(shop, { name })) {
        throw new HttpError('Supplier name taken', 400);
      }
    }
  }

  await Promise.all([updateSupplier(shop, { id, name, address }), setSupplierVendors(id, vendors)]);

  return id;
}

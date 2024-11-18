import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getPurchaseOrderCountBySupplier } from '../purchase-orders/queries.js';
import * as queries from './queries.js';

export async function deleteSupplier(shop: string, id: number) {
  const supplier = await queries.getSupplier(shop, { id });

  if (!supplier) {
    throw new HttpError('Supplier not found', 400);
  }

  const purchaseOrderCounts = await getPurchaseOrderCountBySupplier(shop, [id]);

  if (purchaseOrderCounts.some(x => x.count > 0)) {
    throw new HttpError('Cannot delete a supplier that is used in purchase orders', 400);
  }

  await Promise.all([queries.deleteSupplierVendors(id), queries.deleteSupplierProductVariants(id)]);
  await queries.deleteSupplier(shop, id);
}

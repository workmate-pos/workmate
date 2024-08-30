import { sql } from '../db/sql-tag.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

/**
 * Get vendors for which there are special orders at some location that still need to be converted to a purchase order.
 */
export async function getNotFullyOrderedSpecialOrderVendors(locationId?: ID) {
  const _locationId: string | null = locationId ?? null;

  const vendors = await sql<{ vendor: string }>`
    SELECT DISTINCT p.vendor
    FROM "Product" p
           INNER JOIN "ProductVariant" pv ON pv."productId" = p."productId"
    WHERE "productVariantId" IN (SELECT DISTINCT spoli."productVariantId"
                                 FROM "SpecialOrderLineItem" spoli
                                        INNER JOIN "SpecialOrder" spo ON spo."id" = spoli."specialOrderId"
                                        LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
                                 WHERE spo."locationId" = COALESCE(${_locationId}, spo."locationId")
                                 GROUP BY spoli.id
                                 HAVING spoli.quantity > COALESCE(SUM(poli.quantity), 0))
  `;

  return vendors.map(vendor => vendor.vendor);
}

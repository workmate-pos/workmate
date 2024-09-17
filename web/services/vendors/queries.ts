import { sql } from '../db/sql-tag.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { VendorFilter } from '../../schemas/generated/get-vendors-filters.js';

export async function getSpecialOrderVendors({ specialOrderLocationId, specialOrderLineItemOrderState }: VendorFilter) {
  const _locationId: string | null = specialOrderLocationId ?? null;
  const _lineItemOrderState: string | null = specialOrderLineItemOrderState ?? null;

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
                                 HAVING CASE ${_lineItemOrderState}
                                          WHEN 'FULLY_ORDERED' THEN spoli.quantity <= COALESCE(SUM(poli.quantity), 0)
                                          WHEN 'NOT_FULLY_ORDERED' THEN spoli.quantity > COALESCE(SUM(poli.quantity), 0)
                                          ELSE TRUE
                                          END)
  `;

  return vendors.map(vendor => vendor.vendor);
}

import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

// TODO: bulk

export async function getAverageUnitCostForProductVariant(shop: string, productVariantId: ID) {
  const productVariantCosts = await db.purchaseOrder.getProductVariantCostsForShop({ shop, productVariantId });

  const totalCost = BigDecimal.sum(
    ...productVariantCosts.map(({ unitCost, quantity }) =>
      BigDecimal.fromString(unitCost).multiply(BigDecimal.fromString(quantity.toFixed(0))),
    ),
  );

  const totalQuantity = BigDecimal.sum(
    ...productVariantCosts.map(({ quantity }) => BigDecimal.fromString(quantity.toFixed(0))),
  );

  const averageCost = totalCost.divide(BigDecimal.max(BigDecimal.ONE, totalQuantity)).round(2);

  return averageCost;
}

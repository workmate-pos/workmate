import { Button, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useEffect, useState } from 'react';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useRouter } from '../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Product } from '@web/schemas/generated/create-purchase-order.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { uuid } from '@work-orders/common-pos/util/uuid.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

/**
 * Button that allows the user to select a special order + their line items to add to their purchase order.
 */
export function ImportSpecialOrderLineItemsButton({
  vendorName,
  locationId,
  onSelect,
}: {
  vendorName: string;
  locationId: ID;
  onSelect: (products: Product[]) => void;
}) {
  const [specialOrderName, setSpecialOrderName] = useState<string>();
  const [lineItems, setLineItems] = useState<DetailedSpecialOrder['lineItems']>([]);

  const fetch = useAuthenticatedFetch();

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });

  const productVariantIds = unique(lineItems.map(lineItem => lineItem.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const screen = useScreen();
  const isLoading =
    Object.values(productVariantQueries).some(query => query.isLoading) || customFieldsPresetsQuery.isLoading;

  screen.setIsLoading(lineItems.length > 0 && isLoading);

  const router = useRouter();

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  useEffect(() => {
    if (!specialOrderName) {
      return;
    }

    if (lineItems.length === 0) {
      return;
    }

    if (Object.values(productVariantQueries).some(query => query.isLoading)) {
      return;
    }

    setLineItems([]);

    if (Object.values(productVariantQueries).some(query => query.isError || !query.data)) {
      toast.show('Failed to load product variants, please try again');
      return;
    }

    if (!customFieldsPresetsQuery.data?.defaultCustomFields) {
      toast.show('Failed to load default custom fields, please try again');
      return;
    }

    onSelect(
      lineItems
        .map(lineItem => {
          const productVariantQuery = productVariantQueries[lineItem.productVariantId];
          const productVariant = productVariantQuery?.data;
          const inventoryItem = productVariant?.inventoryItem;

          if (!inventoryItem) {
            toast.show('Failed to load product variant, please try again');
            throw new Error('Failed to load product variant');
          }

          const purchaseOrderQuantity = sum(lineItem.purchaseOrderLineItems.map(lineItem => lineItem.quantity));

          const remainingQuantity = Math.max(0, lineItem.quantity - purchaseOrderQuantity);

          if (!remainingQuantity) {
            return null;
          }

          return {
            uuid: uuid(),
            specialOrderLineItem: {
              name: specialOrderName,
              uuid: lineItem.uuid,
            },
            quantity: remainingQuantity,
            unitCost: inventoryItem.unitCost
              ? BigDecimal.fromDecimal(inventoryItem.unitCost.amount).toMoney()
              : BigDecimal.ZERO.toMoney(),
            customFields: customFieldsPresetsQuery.data.defaultCustomFields,
            productVariantId: lineItem.productVariantId,
            availableQuantity: 0,
          };
        })
        .filter(isNonNullable),
    );
  }, [specialOrderName, lineItems, Object.values(productVariantQueries)]);

  return (
    <Button
      title={'Select from Special Orders'}
      onPress={() =>
        router.push('SpecialOrderSelector', {
          onSelect: specialOrder => {
            setSpecialOrderName(specialOrder.name);
            router.push('MultiSpecialOrderLineItemSelector', {
              name: specialOrder.name,
              // TODO: Handle already-added line items!
              actions: [
                {
                  title: 'Add to Purchase Order',
                  type: 'primary',
                  position: 'bottom',
                  onAction: lineItems => {
                    router.pop();
                    setLineItems(lineItems);
                  },
                },
              ],
              options: {
                filters: {
                  // vendorName,
                  // state: 'NOT_FULLY_ORDERED',
                },
                quantityBadge: 'UNORDERED_QUANTITY',
              },
            });
          },
          filters: {
            locationId,
            lineItemOrderState: 'NOT_FULLY_ORDERED',
            lineItemVendorName: vendorName,
          },
        })
      }
    />
  );
}

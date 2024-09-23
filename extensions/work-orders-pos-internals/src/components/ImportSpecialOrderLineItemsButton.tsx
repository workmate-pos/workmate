import { Button, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useEffect, useState } from 'react';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useRouter } from '../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasNestedPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';

/**
 * Button that allows the user to select a special order + their line items to add to their purchase order.
 */
export function ImportSpecialOrderLineItemsButton({
  vendorName,
  locationId,
  onSelect,
  createPurchaseOrder,
}: {
  vendorName: string;
  locationId: ID;
  onSelect: (products: Product[]) => void;
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'name' | 'lineItems'>;
}) {
  const [specialOrderName, setSpecialOrderName] = useState<string>();

  const fetch = useAuthenticatedFetch();

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name: specialOrderName ?? null });
  const specialOrder = specialOrderQuery.data;

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });

  const productVariantIds = unique(specialOrder?.lineItems?.map(lineItem => lineItem.productVariantId) ?? []);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const screen = useScreen();
  const isLoading =
    specialOrderQuery.isFetching ||
    Object.values(productVariantQueries).some(query => query.isLoading) ||
    customFieldsPresetsQuery.isLoading;

  screen.setIsLoading(isLoading);

  const router = useRouter();
  const { toast } = useApi<'pos.home.modal.render'>();
  const productVariantQueryStatuses = Object.values(productVariantQueries).map(query => query.status);

  const getRemainingLineItemQuantity = (
    specialOrder: DetailedSpecialOrder,
    specialOrderLineItem: DetailedSpecialOrder['lineItems'][number],
  ) => {
    if (!specialOrder) {
      return null;
    }

    const currentPurchaseOrderQuantity = sum(
      createPurchaseOrder.lineItems
        .filter(hasNestedPropertyValue('specialOrderLineItem.uuid', specialOrderLineItem.uuid))
        .filter(hasNestedPropertyValue('specialOrderLineItem.name', specialOrder.name))
        .map(lineItem => lineItem.quantity),
    );

    const otherPurchaseOrderQuantity = sum(
      specialOrderLineItem.purchaseOrderLineItems
        .filter(lineItem => lineItem.purchaseOrderName !== createPurchaseOrder.name)
        .map(lineItem => lineItem.quantity),
    );

    return Math.max(0, specialOrderLineItem.quantity - currentPurchaseOrderQuantity - otherPurchaseOrderQuantity);
  };

  useEffect(() => {
    if (!specialOrder || !specialOrderName) {
      return;
    }

    if (Object.values(productVariantQueries).some(query => query.isLoading)) {
      return;
    }

    setSpecialOrderName(undefined);

    if (Object.values(productVariantQueries).some(query => query.isError || !query.data)) {
      toast.show('Failed to load product variants, please try again');
      return;
    }

    if (!customFieldsPresetsQuery.data?.defaultCustomFields) {
      toast.show('Failed to load default custom fields, please try again');
      return;
    }

    onSelect(
      specialOrder.lineItems
        .map(lineItem => {
          const productVariantQuery = productVariantQueries[lineItem.productVariantId];
          const productVariant = productVariantQuery?.data;
          const inventoryItem = productVariant?.inventoryItem;

          if (!inventoryItem) {
            toast.show('Failed to load product variant, please try again');
            throw new Error('Failed to load product variant');
          }

          const remainingQuantity = getRemainingLineItemQuantity(specialOrder, lineItem);

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
            serialNumber: null,
          };
        })
        .filter(isNonNullable),
    );
  }, [specialOrder, productVariantQueryStatuses.join(', ')]);

  return (
    <Button
      title={'Import Special Order'}
      onPress={() =>
        router.push('SpecialOrderSelector', {
          onSelect: specialOrder => setSpecialOrderName(specialOrder.name),
          filters: {
            locationId,
            lineItemOrderState: 'NOT_FULLY_ORDERED',
            lineItemVendorName: vendorName,
            // We exclude any special orders that have no items with remaining quantity.
            // This cannot be fully computed on the server because the current purchase order can have unsaved line items linked to the special order.
            isExcluded: specialOrder =>
              specialOrder.lineItems.every(lineItem => {
                const remainingLineItemQuantity = getRemainingLineItemQuantity(specialOrder, lineItem);
                return !remainingLineItemQuantity;
              }),
          },
        })
      }
    />
  );
}

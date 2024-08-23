import { UnsourcedItemList, UnsourcedItemListSelectedItem } from './UnsourcedItemList.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useRouter } from '../../routes.js';
import { useState } from 'react';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { getFormattedAddressSubtitle } from '../../util/formatted-address-subtitle.js';

/**
 * Wrapper around {@link UnsourcedItemList} that adds vendor filtering.
 */
export function UnsourcedPurchaseOrderItemList({ items }: { items: UnsourcedItemListSelectedItem[] }) {
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });
  const reserveLineItemInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });
  const { toast, session } = useExtensionApi<'pos.home.modal.render'>();
  const productVariantIds = unique(items.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });
  const vendorsQuery = useVendorsQuery({ fetch });
  const router = useRouter();

  const [vendorName, setVendorName] = useState<string>();

  const filteredItems = items.filter(item => {
    if (!vendorName) return true;
    const productVariant = productVariantQueries[item.productVariantId]?.data;
    if (!productVariant) return false;
    return productVariant.product.vendor === vendorName;
  });

  // TODO: Fix bug removing a filter causes fake enabled items or smth

  return (
    <UnsourcedItemList
      items={filteredItems}
      filterAction={{
        title: ['Filter by vendor', vendorName ? `(${vendorName})` : null].filter(isNonNullable).join(' '),
        disabled: items.length === 0,
        onAction: () =>
          router.push('ListPopup', {
            title: 'Select Vendor',
            selection: {
              type: 'select',
              items: [
                {
                  id: '',
                  leftSide: {
                    label: 'Clear',
                  },
                },
                ...(vendorsQuery.data?.map(vendor => ({
                  id: vendor.name,
                  leftSide: {
                    label: vendor.name,
                    subtitle: vendor.customer?.defaultAddress
                      ? getFormattedAddressSubtitle(vendor.customer.defaultAddress.formatted)
                      : undefined,
                  },
                })) ?? []),
              ],
              //TODO: Maybe reset selection when this happens?
              onSelect: vendorName => setVendorName(vendorName || undefined),
            },
          }),
        loading: vendorsQuery.isLoading,
      }}
      primaryAction={{
        title: 'Create Purchase Order',
        loading: reserveLineItemInventoryMutation.isLoading,
        onAction: async selectedItems => {
          const status = settingsQuery.data?.settings.defaultPurchaseOrderStatus;
          const customFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;
          const lineItemCustomFields = lineItemCustomFieldsPresetsQuery.data?.defaultCustomFields;

          if (!status || !customFields || !lineItemCustomFields) {
            toast.show('Wait for settings to load before creating a purchase order');
            return;
          }

          const createPurchaseOrder: CreatePurchaseOrder = {
            ...defaultCreatePurchaseOrder({ status }),
            vendorName: vendorName ?? null,
            locationId: createGid('Location', session.currentSession.locationId),
            customFields,
            lineItems: selectedItems
              .map<CreatePurchaseOrder['lineItems'][number] | null>(item => {
                const { uuid, productVariantId, quantity, shopifyOrderLineItem } = item;
                const productVariantQuery = productVariantQueries[productVariantId];

                if (!productVariantQuery?.data) {
                  return null;
                }

                const {
                  inventoryItem: { unitCost },
                } = productVariantQuery.data;

                return {
                  // can just recycle the work order item uuid
                  uuid,
                  shopifyOrderLineItem,
                  quantity,
                  productVariantId,
                  availableQuantity: 0,
                  customFields: lineItemCustomFields,
                  unitCost: unitCost ? BigDecimal.fromDecimal(unitCost.amount).toMoney() : BigDecimal.ZERO.toMoney(),
                };
              })
              .filter(isNonNullable),
          };

          if (createPurchaseOrder.lineItems.length !== selectedItems.length) {
            toast.show('Some items could not be added to the transfer order');
            return;
          }

          await router.popCurrent();
          router.push('PurchaseOrder', { initial: createPurchaseOrder });
        },
      }}
    />
  );
}

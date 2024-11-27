import { useToast } from '@teifi-digital/shopify-app-react';
import {
  WIPCreateStockTransfer,
  CreateStockTransferDispatchProxy,
} from '@work-orders/common/create-stock-transfer/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Badge } from '@shopify/polaris';
import { UUID, uuid } from '@work-orders/common/util/uuid.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int } from '@web/schemas/generated/create-stock-transfer.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ProductVariantResourceItemContent } from '@web/frontend/components/ProductVariantResourceList.js';

type Props = {
  open: boolean;
  onClose: () => void;
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
};

export function AddStockTransferItemsModal({ open, onClose, createStockTransfer, dispatch }: Props) {
  const [toast, setToastAction] = useToast();

  return (
    <>
      <ProductVariantSelectorModal
        open={open}
        onClose={onClose}
        filters={{
          type: ['product'],
          locationId: [createStockTransfer.fromLocationId].filter(isNonNullable),
        }}
        closeOnSelect={false}
        render={productVariant => (
          <ProductVariantResourceItemContent
            productVariant={productVariant}
            right={
              <InventoryItemAvailableQuantityBadge
                inventoryItemId={productVariant.inventoryItem.id}
                locationId={createStockTransfer.fromLocationId}
              />
            }
          />
        )}
        onSelect={productVariant => {
          setToastAction({ content: `Added ${getProductVariantName(productVariant)}` });

          dispatch.addLineItems({
            lineItems: [
              {
                uuid: uuid() as UUID,
                inventoryItemId: productVariant.inventoryItem.id,
                quantity: 1 as Int,
                status: 'PENDING',
                productVariantTitle: productVariant.title,
                productTitle: productVariant.product.title,
                shopifyOrderLineItem: null,
                purchaseOrderLineItem: null,
              },
            ],
          });
        }}
      />

      {toast}
    </>
  );
}

function InventoryItemAvailableQuantityBadge({
  inventoryItemId,
  locationId,
}: {
  inventoryItemId: ID;
  locationId: ID | null;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const inventoryItemQuery = useInventoryItemQuery({ fetch, id: inventoryItemId, locationId });
  const availableQuantity = inventoryItemQuery.data?.inventoryLevel?.quantities.find(
    q => q.name === 'available',
  )?.quantity;

  const nbsp = '\u00A0';

  return (
    <>
      {availableQuantity !== undefined && (
        <Badge tone={availableQuantity >= 0 ? 'success' : 'warning'}>{`${availableQuantity}${nbsp}available`}</Badge>
      )}

      {toast}
    </>
  );
}

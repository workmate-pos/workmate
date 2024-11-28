import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Badge, InlineStack, Spinner } from '@shopify/polaris';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';

export function InventoryItemAvailableQuantityBadge({
  inventoryItemId,
  locationId,
  delta = 0,
}: {
  inventoryItemId: ID;
  locationId: ID | null;
  /**
   * Optional delta to change the available quantity by.
   * Can be used to account for unsaved changes
   */
  delta?: number;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const inventoryItemQuery = useInventoryItemQuery({ fetch, id: inventoryItemId, locationId });
  const availableQuantity = inventoryItemQuery.data?.inventoryLevel?.quantities.find(
    q => q.name === 'available',
  )?.quantity;
  const adjustedAvailableQuantity = availableQuantity !== undefined ? availableQuantity + delta : undefined;

  // 🤠
  const nbsp = '\u00A0';

  return (
    <InlineStack align="end">
      {adjustedAvailableQuantity !== undefined && (
        <Badge
          tone={adjustedAvailableQuantity > 0 ? 'success' : 'warning'}
        >{`${adjustedAvailableQuantity}${nbsp}available`}</Badge>
      )}

      {inventoryItemQuery.isLoading && <Spinner size="small" />}

      {toast}
    </InlineStack>
  );
}

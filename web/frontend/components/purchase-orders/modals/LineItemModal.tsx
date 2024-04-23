import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { Badge, BlockStack, Box, DataTable, InlineStack, Modal, Text } from '@shopify/polaris';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { Int } from '@web/schemas/generated/create-product.js';
import { IntegerField } from '@web/frontend/components/IntegerField.js';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { PurchaseOrder } from '@web/services/purchase-orders/types.js';

export function LineItemModal({
  initialProduct,
  purchaseOrder,
  locationId,
  open,
  onClose,
  setToastAction,
  onSave,
}: {
  initialProduct: CreatePurchaseOrder['lineItems'][number];
  purchaseOrder: PurchaseOrder | null;
  locationId: ID | null;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  onSave: (product: CreatePurchaseOrder['lineItems'][number]) => void;
}) {
  const [product, setProduct] = useState(initialProduct);
  const savedProduct = purchaseOrder?.lineItems.find(li => li.uuid === product.uuid);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const locationQuery = useLocationQuery({ fetch, id: locationId });
  const productVariantQuery = useProductVariantQuery({ fetch, id: product.productVariantId });
  const orderQuery = useOrderQuery({ fetch, id: product.shopifyOrderLineItem?.orderId ?? null });
  const inventoryItemQuery = useInventoryItemQuery({
    fetch,
    id: productVariantQuery?.data?.inventoryItem?.id ?? null,
    locationId,
  });

  const productVariant = productVariantQuery?.data;
  const order = orderQuery?.data?.order;
  const inventoryItem = inventoryItemQuery?.data;
  const location = locationQuery?.data;

  const name = getProductVariantName(productVariant) ?? 'Product';

  const isLoading = inventoryItemQuery.isLoading || locationQuery.isLoading || orderQuery.isLoading;

  const isImmutable = savedProduct && savedProduct.availableQuantity > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={name}
      loading={isLoading}
      primaryAction={{
        content: 'Save',
        onAction: () => {
          onSave(product);
          setToastAction({ content: 'Saved product' });
          onClose();
        },
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
        {
          content: 'Remove',
          onAction: () => {
            onSave({ ...product, quantity: 0 as Int });
            setToastAction({ content: 'Removed product' });
            onClose();
          },
          disabled: isImmutable,
          destructive: true,
        },
      ]}
    >
      {order && (
        <Modal.Section>
          <Box>
            <Badge tone={'info'}>{order.name}</Badge>
          </Box>
        </Modal.Section>
      )}

      {location && inventoryItem?.inventoryLevel && (
        <Modal.Section>
          <InlineStack align={'center'}>
            <Text as={'h3'} fontWeight={'semibold'}>
              Current stock at {location.name}
            </Text>
          </InlineStack>
          <DataTable
            columnContentTypes={['text', 'numeric']}
            headings={['Status', 'Quantity']}
            rows={inventoryItem.inventoryLevel.quantities.map(({ name, quantity }) => [titleCase(name), quantity])}
          />
        </Modal.Section>
      )}

      <Modal.Section>
        <BlockStack gap={'400'}>
          <MoneyField
            label={'Unit Cost'}
            autoComplete={'off'}
            value={product.unitCost.toString()}
            onChange={value => setProduct(product => ({ ...product, unitCost: value as Money }))}
            min={0}
            requiredIndicator
            readOnly={isImmutable}
          />
          <IntegerField
            label={'Quantity'}
            autoComplete={'off'}
            value={product.quantity.toString()}
            onChange={value => setProduct(product => ({ ...product, quantity: Number(value) as Int }))}
            helpText={'The quantity that has been ordered'}
            min={isImmutable ? savedProduct.quantity : 1}
            requiredIndicator
          />
          <IntegerField
            label={'Available Quantity'}
            autoComplete={'off'}
            value={product.availableQuantity.toString()}
            onChange={value => setProduct(product => ({ ...product, availableQuantity: Number(value) as Int }))}
            min={savedProduct ? savedProduct.availableQuantity : 0}
            max={product.quantity}
            helpText={'The quantity that has been delivered'}
            requiredIndicator
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

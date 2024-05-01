import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderItem } from '../../types.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { useWorkOrderOrders } from '../../hooks/use-work-order-orders.js';
import { getProductServiceType } from '@work-orders/common/metafields/product-service-type.js';

export function ItemConfig({
  workOrderName,
  item: initialItem,
  onRemove,
  onUpdate,
  onAssignLabour,
}: {
  workOrderName: string | null;
  item: CreateWorkOrderItem;
  onRemove: () => void;
  onUpdate: (lineItem: CreateWorkOrderItem) => void;
  onAssignLabour: (lineItem: CreateWorkOrderItem) => void;
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [item, setItem] = useState<CreateWorkOrderItem>(initialItem);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: item?.productVariantId ?? null });
  const { workOrderQuery, getItemOrder } = useWorkOrderOrders(workOrderName);

  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(name ?? 'Product');
  screen.setIsLoading(productVariantQuery.isLoading || workOrderQuery.isLoading);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  if (!productVariant) {
    return null;
  }

  const readonly = getItemOrder(item)?.type === 'ORDER';

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={5}>
        <Stack direction="vertical">
          <Text variant="headingLarge">{name}</Text>
          <Text variant="body" color="TextSubdued">
            {productVariant.sku}
          </Text>
          <Text variant="body" color="TextSubdued">
            {currencyFormatter(productVariant.price)}
          </Text>
        </Stack>
        <Stack direction="vertical" spacing={2}>
          <Text variant="body" color="TextSubdued">
            Quantity
          </Text>
          <Stepper
            disabled={readonly}
            minimumValue={1}
            initialValue={item.quantity}
            onValueChanged={(value: Int) => {
              setItem({ ...item, quantity: value });
              setHasUnsavedChanges(true);
            }}
            value={item.quantity}
          />
        </Stack>
        <Stack direction="vertical" flex={1} alignment="flex-end">
          {readonly && <Button title="Back" onPress={() => router.popCurrent()} />}
          {!readonly && (
            <>
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  onRemove();
                  router.popCurrent();
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  onUpdate(item);
                  router.popCurrent();
                }}
              />
              {getProductServiceType(productVariant.product.serviceType?.value) !== 'Fixed-Price Service' && (
                <Button
                  title="Add Labour"
                  onPress={async () => {
                    await router.popCurrent();
                    onAssignLabour(item);
                  }}
                />
              )}
            </>
          )}
        </Stack>
      </Stack>
    </ScrollView>
  );
}

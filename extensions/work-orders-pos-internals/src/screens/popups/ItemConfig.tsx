import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { FIXED_PRICE_SERVICE, getProductServiceType } from '@work-orders/common/metafields/product-service-type.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CreateWorkOrderItem } from '../../types.js';
import { CustomFieldsList } from '@work-orders/common-pos/components/CustomFieldsList.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';

export function ItemConfig({
  itemUuid,
  createWorkOrder,
  dispatch,
}: {
  itemUuid: string;
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const initialItem = createWorkOrder.items.find(item => item.uuid === itemUuid);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [item, setItem] = useState<CreateWorkOrderItem | undefined>(initialItem);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery({
    fetch,
    ...pick(createWorkOrder, 'name', 'items', 'charges', 'discount', 'customerId'),
  });

  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(calculatedDraftOrderQuery.isLoading);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  if (!item) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Item not found
        </Text>
      </Stack>
    );
  }

  if (calculatedDraftOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(calculatedDraftOrderQuery.error, 'Error loading product details')}
        </Text>
      </Stack>
    );
  }

  if (calculatedDraftOrderQuery.isLoading) {
    return null;
  }

  const itemLineItemId = calculatedDraftOrder?.itemLineItemIds[item.uuid];
  const itemLineItem = calculatedDraftOrder?.lineItems.find(li => li.id === itemLineItemId);

  if (!calculatedDraftOrder || !itemLineItem) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Could not load product details
        </Text>
      </Stack>
    );
  }

  const readonly = !!itemLineItem.order;
  const canAddLabour = getProductServiceType(itemLineItem.variant?.product?.serviceType?.value) !== FIXED_PRICE_SERVICE;

  screen.setTitle(itemLineItem.name);

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={5}>
        <Stack direction="vertical">
          <Text variant="headingLarge">{itemLineItem.name}</Text>
          <Text variant="body" color="TextSubdued">
            {itemLineItem.sku}
          </Text>
          <Text variant="body" color="TextSubdued">
            {currencyFormatter(itemLineItem.unitPrice)}
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
        <Stack direction="vertical" spacing={2}>
          <Text variant="body" color="TextSubdued">
            Custom Fields
          </Text>
          <CustomFieldsList
            customFields={item.customFields}
            onSave={customFields => setItem({ ...item, customFields })}
            type={'LINE_ITEM'}
            useRouter={useRouter}
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
                  dispatch.removeItem({ uuid: item.uuid });
                  router.popCurrent();
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  dispatch.updateItem({ item });
                  router.popCurrent();
                }}
              />
              {canAddLabour && (
                <Button
                  title="Add Labour"
                  onPress={async () => {
                    await router.popCurrent();
                    router.push('ItemChargeConfig', { itemUuid: itemUuid, createWorkOrder, dispatch });
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

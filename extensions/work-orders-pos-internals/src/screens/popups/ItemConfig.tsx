import { Badge, Button, ScrollView, Stack, Stepper, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useMemo, useState } from 'react';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../../routes.js';
import { FIXED_PRICE_SERVICE, getProductServiceType } from '@work-orders/common/metafields/product-service-type.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CustomFieldsList } from '@work-orders/common-pos/components/CustomFieldsList.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/components/form/FormMoneyField.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { UUID } from '@work-orders/common/util/uuid.js';
import { keepPreviousData } from '@tanstack/react-query';

export function ItemConfig({
  item: { uuid: itemUuid, type: itemType },
  createWorkOrder,
  dispatch,
  onAddLabour,
}: {
  item: { type: 'product' | 'custom-item'; uuid: UUID };
  createWorkOrder: WIPCreateWorkOrder;
  onAddLabour: () => void;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const initialItem = createWorkOrder.items
    .filter(hasPropertyValue('type', itemType))
    .find(hasPropertyValue('uuid', itemUuid));

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [item, setItem] = useState(initialItem);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...createWorkOrder,
      items: [...createWorkOrder.items.filter(x => !(x.uuid === item?.uuid && x.type === item?.type)), item].filter(
        isNonNullable,
      ),
    },
    { placeholderData: keepPreviousData },
  );

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

  const itemLineItem = calculatedDraftOrderQuery.getItemLineItem(item);

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
  const canAddLabour =
    !item.serial &&
    (item.type === 'custom-item' ||
      getProductServiceType(itemLineItem.variant?.product?.serviceType?.value) !== FIXED_PRICE_SERVICE);

  const isService = getProductServiceType(itemLineItem.variant?.product?.serviceType?.value) !== null;

  const name = item.type === 'custom-item' ? item.name : itemLineItem.name;
  screen.setTitle(name);

  return (
    <Form>
      <ScrollView>
        <Stack direction="vertical" spacing={5}>
          <Stack direction={'vertical'} spacing={1}>
            <Text variant={'headingLarge'}>{name}</Text>
            {itemLineItem.order && <Badge text={itemLineItem.order.name} variant={'highlight'} />}

            <Text variant="body" color="TextSubdued">
              {itemLineItem.sku}
            </Text>
            <Text variant="body" color="TextSubdued">
              {currencyFormatter(item.type === 'product' ? itemLineItem.unitPrice : item.unitPrice)}
            </Text>
          </Stack>
          <Stack direction="vertical" spacing={2}>
            {item.type === 'custom-item' && (
              <>
                <Text variant="body" color="TextSubdued">
                  Name
                </Text>

                <FormStringField
                  label={'Name'}
                  type={'normal'}
                  value={item.name}
                  onChange={value => {
                    setHasUnsavedChanges(true);
                    setItem({ ...item, name: value.trim() || 'Unnamed item' });
                  }}
                  required
                />

                <Text variant="body" color="TextSubdued">
                  Unit Price
                </Text>

                <FormMoneyField
                  label={'Unit price'}
                  min={0}
                  value={item.unitPrice}
                  onChange={value => {
                    setHasUnsavedChanges(true);
                    setItem({ ...item, unitPrice: value || BigDecimal.ZERO.toMoney() });
                  }}
                  required
                />
              </>
            )}

            {!item.serial && (
              <>
                <Text variant="body" color="TextSubdued">
                  Quantity
                </Text>
                <Stepper
                  disabled={readonly}
                  minimumValue={1}
                  initialValue={item.quantity}
                  onValueChanged={(value: Int) => {
                    setHasUnsavedChanges(true);
                    setItem({ ...item, quantity: value });
                  }}
                  value={item.quantity}
                />
              </>
            )}
          </Stack>
          <Stack direction="vertical" spacing={2}>
            <Text variant="body" color="TextSubdued">
              {isService ? 'Service' : 'Product'} custom fields
            </Text>
            <CustomFieldsList
              title={isService ? 'Service custom fields' : 'Product custom fields'}
              customFields={item.customFields}
              onSave={customFields => {
                setHasUnsavedChanges(true);
                setItem({ ...item, customFields });
              }}
              type={'LINE_ITEM'}
              useRouter={useRouter}
            />
          </Stack>
          <Stack direction="vertical" flex={1} alignment="flex-end">
            {readonly && <Button title="Back" onPress={() => router.popCurrent()} />}
            {!readonly && (
              <>
                <FormButton
                  title="Remove"
                  type="destructive"
                  onPress={() => {
                    dispatch.removeItem({ item });
                    router.popCurrent();
                  }}
                />
                <FormButton
                  title="Save"
                  action={'submit'}
                  onPress={() => {
                    dispatch.updateItem({ item });
                    router.popCurrent();
                  }}
                />
                {canAddLabour && (
                  <FormButton
                    title="Add labour"
                    action={'submit'}
                    onPress={async () => {
                      dispatch.updateItem({ item });
                      await router.popCurrent();
                      onAddLabour();
                    }}
                  />
                )}
              </>
            )}
          </Stack>
        </Stack>
      </ScrollView>
    </Form>
  );
}

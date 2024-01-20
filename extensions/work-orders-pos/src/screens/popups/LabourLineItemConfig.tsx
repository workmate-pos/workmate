import { useScreen } from '../../hooks/use-screen.js';
import { Button, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderLineItem, CreateWorkOrderLabour } from '../routes.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { Money } from '@web/schemas/generated/create-work-order.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { parseMoney } from '@work-orders/common/util/money.js';
import { useUnsavedChangesDialog } from '../../providers/UnsavedChangesDialogProvider.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@work-orders/common/util/guards.js';
import { getLabourPrice } from '../../create-work-order/labour.js';
import { uuid } from '../../util/uuid.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export function LabourLineItemConfig() {
  const [readonly, setReadonly] = useState(false);
  const [lineItem, setLineItem] = useState<CreateWorkOrderLineItem | null>(null);
  const [labour, setLabour] = useState<DiscriminatedUnionOmit<CreateWorkOrderLabour, 'lineItemUuid'>[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { Screen, usePopup, closePopup, cancelPopup } = useScreen(
    'LabourLineItemConfig',
    ({ readonly, lineItem, labour }) => {
      setReadonly(readonly);
      setLineItem(lineItem);
      setLabour(labour);
      setUnsavedChanges(false);
    },
  );

  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    setUnsavedChanges(true);

    setLabour(labour => [
      ...result.map(id => {
        // For each selected employee, either keep the existing labour or create a new one
        // This does not support multiple labours per employee (yet?)

        return (
          labour.find(l => l.employeeId === id) ??
          ({
            type: 'fixed-price-labour',
            labourUuid: uuid(),
            employeeId: id,
            name: settingsQuery?.data?.settings?.labourLineItemName ?? 'Labour',
            amount: '0.00' as Money,
          } as const)
        );
      }),
      ...labour.filter(hasPropertyValue('employeeId', null)),
    ]);
  });

  const employeeConfigPopup = usePopup('EmployeeLabourConfig', result => {
    setUnsavedChanges(true);

    if (result.type === 'remove') {
      setLabour(labour => labour.filter(l => l.labourUuid !== result.labourUuid));
    } else if (result.type === 'update') {
      setLabour(
        labour.map(l =>
          l.labourUuid === result.labourUuid
            ? { ...result.labour, employeeId: result.employeeId, labourUuid: result.labourUuid }
            : l,
        ),
      );
    } else {
      return result satisfies never;
    }
  });

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });
  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem?.productVariantId ?? null });

  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  const labourPrice = getLabourPrice(labour);

  const productVariantPrice = productVariant ? parseMoney(productVariant.price) : 0;
  const totalPrice = productVariantPrice + parseMoney(labourPrice);

  const unsavedChangesDialog = useUnsavedChangesDialog();
  const { navigation } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <Screen
      title={name ?? 'Service'}
      overrideNavigateBack={() =>
        unsavedChangesDialog.show({
          onAction: navigation.pop,
          skipDialog: !unsavedChanges,
        })
      }
      isLoading={productVariantQuery.isLoading}
      presentation={{ sheet: true }}
    >
      <ScrollView>
        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <Button
            title={'Add employees'}
            type={'primary'}
            onPress={() => employeeSelectorPopup.navigate(labour.map(e => e.employeeId).filter(isNonNullable))}
            isDisabled={readonly}
          />
        </Stack>
        <EmployeeLabourList
          labour={labour.filter(hasNonNullableProperty('employeeId'))}
          readonly={readonly}
          onClick={labour =>
            employeeConfigPopup.navigate({ employeeId: labour.employeeId, labourUuid: labour.labourUuid, labour })
          }
        />

        <Stack direction={'horizontal'} alignment={'space-evenly'} flex={1} paddingVertical={'ExtraLarge'}>
          <Text variant={'captionMedium'}>Base Price: {currencyFormatter(productVariantPrice)}</Text>
          <Text variant={'captionMedium'}>Labour Price: {currencyFormatter(labourPrice)}</Text>
          <Text variant={'captionMedium'}>Total Price: {currencyFormatter(totalPrice)}</Text>
        </Stack>

        <Stack direction="vertical" flex={1} alignment="space-evenly">
          {readonly && (
            <Button
              title="Back"
              onPress={() => {
                cancelPopup();
              }}
            />
          )}
          {!readonly && (
            <>
              <Button
                title="Remove"
                type="destructive"
                disabled={!lineItem}
                onPress={() => {
                  if (!lineItem) return;
                  closePopup({ type: 'remove', lineItem, labour });
                }}
              />
              <Button
                title="Save"
                disabled={!lineItem}
                onPress={() => {
                  if (!lineItem) return;
                  closePopup({ type: 'update', lineItem, labour });
                }}
              />
            </>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}

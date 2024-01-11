import { useScreen } from '../../hooks/use-screen.js';
import { Button, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderEmployeeAssignment, CreateWorkOrderLineItem } from '../routes.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { EmployeeAssignmentList } from '../../components/EmployeeAssignmentsList.js';
import { Cents, parseMoney, toDollars } from '@work-orders/common/util/money.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { useUnsavedChangesDialog } from '../../providers/UnsavedChangesDialogProvider.js';

export function ServiceLineItemConfig() {
  const [readonly, setReadonly] = useState(false);
  const [lineItem, setLineItem] = useState<CreateWorkOrderLineItem | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = useState<
    Omit<CreateWorkOrderEmployeeAssignment, 'lineItemUuid'>[]
  >([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { Screen, usePopup, closePopup, cancelPopup } = useScreen(
    'ServiceLineItemConfig',
    ({ readonly, lineItem, employeeAssignments }) => {
      setReadonly(readonly);
      setLineItem(lineItem);
      setEmployeeAssignments(employeeAssignments);
      setUnsavedChanges(false);
    },
  );

  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    setUnsavedChanges(true);

    setEmployeeAssignments(employeeAssignments =>
      result.map(employeeId => {
        const existingAssignment = employeeAssignments.find(e => e.employeeId === employeeId);
        return existingAssignment ?? { employeeId, hours: 0 as Int };
      }),
    );
  });

  const employeeConfigPopup = usePopup('EmployeeAssignmentConfig', result => {
    setUnsavedChanges(true);

    if (result.type === 'remove') {
      setEmployeeAssignments(employeeAssignments.filter(e => e.employeeId !== result.employeeAssignment.employeeId));
    } else if (result.type === 'update') {
      setEmployeeAssignments(
        employeeAssignments.map(e =>
          e.employeeId === result.employeeAssignment.employeeId ? result.employeeAssignment : e,
        ),
      );
    } else {
      return result.type satisfies never;
    }
  });

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem?.productVariantId ?? null });
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeAssignments.map(e => e.employeeId) });

  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  const labourPrice = employeeAssignments.reduce(
    (total, { hours, employeeId }) =>
      total + hours * toDollars(employeeQueries[employeeId]?.data?.rate ?? (0 as Cents)),
    0,
  );
  const productVariantPrice = productVariant ? parseMoney(productVariant.price) : 0;
  const totalPrice = productVariantPrice + labourPrice;

  const unsavedChangesDialog = useUnsavedChangesDialog();
  const { navigation } = useExtensionApi<'pos.home.modal.render'>();

  // TODO: Make employee selector be for selecting just one employee???
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
            onPress={() => employeeSelectorPopup.navigate(employeeAssignments.map(e => e.employeeId))}
            isDisabled={readonly}
          />
        </Stack>
        <EmployeeAssignmentList
          employeeAssignments={employeeAssignments}
          readonly={readonly}
          onClick={employeeAssignment => employeeConfigPopup.navigate(employeeAssignment)}
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
                  closePopup({ type: 'remove', lineItem, employeeAssignments });
                }}
              />
              <Button
                title="Save"
                disabled={!lineItem}
                onPress={() => {
                  if (!lineItem) return;
                  closePopup({ type: 'update', lineItem, employeeAssignments });
                }}
              />
            </>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}

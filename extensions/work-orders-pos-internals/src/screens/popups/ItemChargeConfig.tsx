import { Badge, Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderCharge } from '../../types.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { uuid } from '../../util/uuid.js';
import { hasNonNullableProperty, hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { SegmentedLabourControl } from '../../components/SegmentedLabourControl.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useRouter } from '../../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CustomFieldsList } from '@work-orders/common-pos/components/CustomFieldsList.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';

export function ItemChargeConfig({
  itemUuid,
  createWorkOrder,
  dispatch,
}: {
  itemUuid: string;
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const item = createWorkOrder.items.find(item => item.uuid === itemUuid);
  const initialItemCharges = createWorkOrder.charges.filter(hasPropertyValue('workOrderItemUuid', itemUuid)) ?? [];

  const [employeeLabourCharges, setEmployeeLabourCharges] = useState(
    initialItemCharges.filter(hasNonNullableProperty('employeeId')),
  );
  const [generalLabourCharge, setGeneralLabourCharge] = useState(extractInitialGeneralLabour(initialItemCharges));

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery({
    fetch,
    ...pick(createWorkOrder, 'name', 'items', 'charges', 'discount', 'customerId'),
  });
  const settingsQuery = useSettingsQuery({ fetch });

  const settings = settingsQuery?.data?.settings;
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(calculatedDraftOrderQuery.isLoading || settingsQuery.isLoading);
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

  // TODO: once @remote-ui/react finally supports suspense, use suspense with an error boundary instead of constantly doing this
  if (calculatedDraftOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(calculatedDraftOrderQuery.error, 'Error loading product details')}
        </Text>
      </Stack>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(calculatedDraftOrderQuery.error, 'Error loading settings')}
        </Text>
      </Stack>
    );
  }

  if (calculatedDraftOrderQuery.isLoading || settingsQuery.isLoading) {
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

  if (!settings) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Could not load settings
        </Text>
      </Stack>
    );
  }

  screen.setTitle(itemLineItem.name);

  const itemCharges = [...employeeLabourCharges, ...(generalLabourCharge ? [generalLabourCharge] : [])].map(charge => ({
    ...charge,
    name: charge.name || 'Unnamed Labour',
  }));

  const employeeAssignmentsEnabled = settings.chargeSettings.employeeAssignments;
  const shouldShowEmployeeLabour = employeeAssignmentsEnabled || employeeLabourCharges.length > 0;

  const basePrice = calculatedDraftOrder.itemPrices[item.uuid] ?? BigDecimal.ZERO.toMoney();
  const chargePrices = itemCharges.map(charge => {
    if (charge.type === 'hourly-labour') {
      return calculatedDraftOrder.hourlyLabourChargePrices[charge.uuid] ?? BigDecimal.ZERO.toMoney();
    }

    if (charge.type === 'fixed-price-labour') {
      return calculatedDraftOrder.fixedPriceLabourChargePrices[charge.uuid] ?? BigDecimal.ZERO.toMoney();
    }

    return charge satisfies never;
  });
  const chargesPrice = BigDecimal.sum(...chargePrices.map(price => BigDecimal.fromMoney(price))).toMoney();
  const totalPrice = BigDecimal.sum(BigDecimal.fromMoney(basePrice), BigDecimal.fromMoney(chargesPrice)).toMoney();

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={1}>
        <Text variant={'headingLarge'}>{name}</Text>
        {itemLineItem.order && <Badge text={itemLineItem.order.name} variant={'highlight'} />}
      </Stack>
      <Stack direction={'vertical'} paddingVertical={'Small'} spacing={5}>
        <Text variant={'headingLarge'}>Labour Charge</Text>
        <SegmentedLabourControl
          types={['none', 'hourly-labour', 'fixed-price-labour']}
          disabled={
            generalLabourCharge ? !!calculatedDraftOrderQuery.getChargeLineItem(generalLabourCharge)?.order : false
          }
          charge={generalLabourCharge}
          onChange={charge =>
            charge !== null
              ? setGeneralLabourCharge({ ...charge, uuid: uuid(), employeeId: null })
              : setGeneralLabourCharge(null)
          }
        />

        {shouldShowEmployeeLabour && (
          <>
            <Text variant={'headingLarge'}>Employee Labour Charges</Text>
            <Stack direction={'vertical'} spacing={2}>
              <Button
                title={'Add employees'}
                type={'primary'}
                onPress={() =>
                  router.push('EmployeeSelector', {
                    selected: employeeLabourCharges.map(e => e.employeeId),
                    disabled: employeeLabourCharges
                      .filter(charge => !!calculatedDraftOrderQuery.getChargeLineItem(charge)?.order)
                      .map(e => e.employeeId),
                    onSelect: employeeId => {
                      setHasUnsavedChanges(true);

                      const defaultLabourCharge = {
                        employeeId,
                        type: 'fixed-price-labour',
                        uuid: uuid(),
                        name: settings?.labourLineItemName || 'Labour',
                        amount: BigDecimal.ZERO.toMoney(),
                        workOrderItemUuid: item.uuid,
                        amountLocked: false,
                        removeLocked: false,
                      } as const;

                      setEmployeeLabourCharges(current => [...current, defaultLabourCharge]);
                    },
                    onDeselect: employeeId => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabourCharges(current => current.filter(l => l.employeeId !== employeeId));
                    },
                  })
                }
                isDisabled={!employeeAssignmentsEnabled}
              />

              <EmployeeLabourList
                charges={employeeLabourCharges.filter(hasNonNullableProperty('employeeId'))}
                workOrderName={createWorkOrder.name}
                onClick={labour =>
                  router.push('EmployeeLabourConfig', {
                    labour,
                    onRemove: () => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabourCharges(employeeLabourCharges.filter(l => l !== labour));
                    },
                    onUpdate: updatedLabour => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabourCharges(
                        employeeLabourCharges.map(l =>
                          l === labour
                            ? {
                                uuid: l.uuid,
                                workOrderItemUuid: l.workOrderItemUuid,
                                ...updatedLabour,
                              }
                            : l,
                        ),
                      );
                    },
                  })
                }
              />
            </Stack>
          </>
        )}

        <Stack direction={'horizontal'} alignment={'center'} flex={1}>
          <ResponsiveStack
            direction={'horizontal'}
            alignment={'space-evenly'}
            flex={1}
            paddingVertical={'ExtraLarge'}
            sm={{ direction: 'vertical', alignment: 'center', paddingVertical: undefined }}
          >
            {BigDecimal.fromMoney(basePrice).compare(BigDecimal.ZERO) > 0 && (
              <Text variant={'headingSmall'} color={'TextSubdued'}>
                Base Price: {currencyFormatter(basePrice)}
              </Text>
            )}
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              Labour Price: {currencyFormatter(chargesPrice)}
            </Text>
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              Total Price: {currencyFormatter(totalPrice)}
            </Text>
          </ResponsiveStack>
        </Stack>

        <Stack direction={'vertical'} spacing={2}>
          <Text variant={'headingLarge'}>Custom Fields</Text>

          <CustomFieldsList
            customFields={item.customFields}
            onSave={customFields => dispatch.updateItemCustomFields({ uuid: itemUuid, customFields })}
            type={'LINE_ITEM'}
            useRouter={useRouter}
          />
        </Stack>
      </Stack>

      <Stack direction="vertical" flex={1} alignment="space-evenly">
        <Button
          title="Remove"
          type="destructive"
          isDisabled={!!itemLineItem.order}
          onPress={() => {
            dispatch.removeItem({ uuid: itemUuid });
            router.popCurrent();
          }}
        />
        <Button
          title="Save"
          onPress={() => {
            dispatch.updateItemCharges({
              uuid: itemUuid,
              charges: [...employeeLabourCharges, ...(generalLabourCharge ? [generalLabourCharge] : [])],
            });
            router.popCurrent();
          }}
        />
      </Stack>
    </ScrollView>
  );
}

function extractInitialGeneralLabour(labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'workOrderItemUuid'>[]) {
  const generalLabours = labour.filter(hasPropertyValue('employeeId', null));

  if (generalLabours.length === 1) {
    return generalLabours[0]!;
  }

  if (generalLabours.length > 1) {
    // pos only supports setting one general labour, so just use the total as fixed price
    return {
      type: 'fixed-price-labour',
      uuid: uuid(),
      employeeId: null,
      name: generalLabours[0]!.name,
      amount: getTotalPriceForCharges(generalLabours),
      amountLocked: false,
      removeLocked: false,
    } as const;
  }

  return null;
}

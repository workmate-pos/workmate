import { Badge, Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useMemo, useState } from 'react';
import { CreateWorkOrderCharge } from '../../types.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { uuid } from '@work-orders/common-pos/util/uuid.js';
import {
  hasNestedPropertyValue,
  hasNonNullableProperty,
  hasPropertyValue,
  isNonNullable,
} from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { SegmentedLabourControl } from '../../components/SegmentedLabourControl.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useRouter } from '../../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CustomFieldsList } from '@work-orders/common-pos/components/CustomFieldsList.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { UUID } from '@web/util/types.js';

export function ItemChargeConfig({
  item: { uuid: itemUuid },
  createWorkOrder,
  dispatch,
}: {
  item: { uuid: UUID };
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const initialItem = createWorkOrder.items.find(hasPropertyValue('uuid', itemUuid));

  const initialItemCharges = createWorkOrder.charges.filter(hasPropertyValue('workOrderItemUuid', itemUuid)) ?? [];

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [item, setItem] = useState(initialItem);
  const [employeeLabourCharges, setEmployeeLabourCharges] = useState(
    initialItemCharges.filter(hasNonNullableProperty('employeeId')),
  );
  const [generalLabourCharge, setGeneralLabourCharge] = useState(extractInitialGeneralLabour(initialItemCharges));

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...createWorkOrder,
      items: [...createWorkOrder.items.filter(x => !(x.uuid === item?.uuid && x.type === item?.type)), item].filter(
        isNonNullable,
      ),
      charges: [
        ...createWorkOrder.charges.filter(x => x.workOrderItemUuid !== item?.uuid),
        generalLabourCharge,
        ...employeeLabourCharges,
      ]
        .filter(isNonNullable)
        .map(charge => ({ ...charge, workOrderItemUuid: item?.uuid ?? null }))
        .filter(hasNonNullableProperty('workOrderItemUuid')),
    },
    { keepPreviousData: true },
  );
  const settingsQuery = useSettingsQuery({ fetch });

  const settings = settingsQuery?.data?.settings;
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(calculatedDraftOrderQuery.isLoading || settingsQuery.isLoading);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const { Form } = useForm();

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

  if (!settings) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Could not load settings
        </Text>
      </Stack>
    );
  }

  const name = item.type === 'custom-item' ? item.name : itemLineItem.name;

  screen.setTitle(name);

  const itemCharges = [...employeeLabourCharges, ...(generalLabourCharge ? [generalLabourCharge] : [])].map(charge => ({
    ...charge,
    name: charge.name || 'Unnamed Labour',
  }));

  const employeeAssignmentsEnabled = settings.chargeSettings.employeeAssignments;
  const shouldShowEmployeeLabour = employeeAssignmentsEnabled || employeeLabourCharges.length > 0;

  const basePrice = calculatedDraftOrderQuery.getItemPrice(item) ?? BigDecimal.ZERO.toMoney();

  const chargePrices = itemCharges.map(
    charge => calculatedDraftOrderQuery.getChargePrice(charge) ?? BigDecimal.ZERO.toMoney(),
  );
  const chargesPrice = BigDecimal.sum(...chargePrices.map(price => BigDecimal.fromMoney(price))).toMoney();
  const totalPrice = BigDecimal.sum(BigDecimal.fromMoney(basePrice), BigDecimal.fromMoney(chargesPrice)).toMoney();

  return (
    <Form>
      <ScrollView>
        <Stack direction={'vertical'} spacing={1}>
          <Text variant={'headingLarge'}>{name}</Text>
          {itemLineItem.order && <Badge text={itemLineItem.order.name} variant={'highlight'} />}
        </Stack>

        {item.type === 'custom-item' && (
          <Stack direction={'vertical'} paddingVertical={'Small'} spacing={2}>
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
              label={'Unit Price'}
              min={0}
              value={item.unitPrice}
              onChange={value => {
                setHasUnsavedChanges(true);
                setItem({ ...item, unitPrice: value || BigDecimal.ZERO.toMoney() });
              }}
              required
            />

            <Text variant="body" color="TextSubdued">
              Include labour in line item
            </Text>

            <FormButton
              title={item.absorbCharges ? 'Yes' : 'No'}
              onPress={() => {
                setHasUnsavedChanges(true);
                setItem({ ...item, absorbCharges: !item.absorbCharges });
              }}
            />
          </Stack>
        )}

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
                ? setGeneralLabourCharge({ ...charge, uuid: uuid() as UUID, employeeId: null })
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
                    router.push('MultiEmployeeSelector', {
                      initialSelection: employeeLabourCharges.map(e => e.employeeId),
                      disabled: employeeLabourCharges
                        .filter(charge => !!calculatedDraftOrderQuery.getChargeLineItem(charge)?.order)
                        .map(e => e.employeeId),
                      onSelect: employees => {
                        let changed = false;
                        setEmployeeLabourCharges(current => {
                          const currentEmployeeIds = current.map(e => e.employeeId);
                          const selectedEmployeeIds = employees.map(e => e.id);
                          const newEmployeeIds = selectedEmployeeIds.filter(id => !currentEmployeeIds.includes(id));

                          changed ||= newEmployeeIds.length > 0;
                          changed ||= currentEmployeeIds.length !== selectedEmployeeIds.length;

                          return [
                            ...newEmployeeIds.map(
                              employeeId =>
                                ({
                                  employeeId,
                                  type: 'fixed-price-labour',
                                  uuid: uuid() as UUID,
                                  name: settings?.labourLineItemName || 'Labour',
                                  amount: BigDecimal.ZERO.toMoney(),
                                  workOrderItemUuid: item.uuid,
                                  amountLocked: false,
                                  removeLocked: false,
                                }) as const,
                            ),
                            ...current.filter(charge => selectedEmployeeIds.includes(charge.employeeId)),
                          ];
                        });
                        setHasUnsavedChanges(changed);
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
                              ? { ...updatedLabour, uuid: l.uuid, workOrderItemUuid: l.workOrderItemUuid }
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
                  {item.type === 'product' && item.absorbCharges ? 'Quantity-Adjusting Labour Rounding' : 'Base Price'}:{' '}
                  {currencyFormatter(basePrice)}
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
              onSave={customFields => dispatch.updateItemCustomFields({ item, customFields })}
              type={'LINE_ITEM'}
              useRouter={useRouter}
            />
          </Stack>
        </Stack>

        <Stack direction="vertical" flex={1} alignment="space-evenly">
          <FormButton
            title="Remove"
            type="destructive"
            disabled={!!itemLineItem.order}
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
              dispatch.updateItemCharges({
                item,
                charges: [...employeeLabourCharges, ...(generalLabourCharge ? [generalLabourCharge] : [])],
              });
              router.popCurrent();
            }}
          />
        </Stack>
      </ScrollView>
    </Form>
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
      uuid: uuid() as UUID,
      employeeId: null,
      name: generalLabours[0]!.name,
      amount: getTotalPriceForCharges(generalLabours),
      amountLocked: false,
      removeLocked: false,
    } as const;
  }

  return null;
}

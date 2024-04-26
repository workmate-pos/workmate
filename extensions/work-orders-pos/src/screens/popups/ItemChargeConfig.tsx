import { Badge, Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderItem, CreateWorkOrderCharge } from '../../types.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { getTotalPriceForCharges } from '../../create-work-order/charges.js';
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
import { useWorkOrderOrders } from '../../hooks/use-work-order-orders.js';
import { WIPCreateWorkOrder } from '../../create-work-order/reducer.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';

export function ItemChargeConfig({
  item,
  createWorkOrder,
  initialCharges,
  onRemove,
  onUpdate,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  item: CreateWorkOrderItem;
  initialCharges: CreateWorkOrderCharge[];
  /**
   * Remove the item from the work order.
   */
  onRemove: () => void;
  /**
   * Override the charges for this line item.
   */
  onUpdate: (labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'workOrderItemUuid'>[]) => void;
}) {
  const initialItemCharges = initialCharges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

  const [employeeLabour, setEmployeeLabour] = useState(initialItemCharges.filter(hasNonNullableProperty('employeeId')));
  const [generalLabour, setGeneralLabour] = useState(extractInitialGeneralLabour(initialItemCharges));

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();

  const settingsQuery = useSettingsQuery({ fetch });
  const productVariantQuery = useProductVariantQuery({ fetch, id: item?.productVariantId ?? null });
  const { workOrderQuery, getChargeOrder, getItemOrder } = useWorkOrderOrders(createWorkOrder.name);

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  const settings = settingsQuery?.data?.settings;

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(name ?? 'Service');
  screen.setIsLoading(productVariantQuery.isLoading || settingsQuery.isLoading || workOrderQuery.isLoading);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  // TODO: Dont allow changing if locked

  if (!productVariant) {
    return null;
  }

  if (!settings) {
    return null;
  }

  const hasBasePrice = getProductServiceType(productVariant.product.serviceType?.value) !== QUANTITY_ADJUSTING_SERVICE;

  const charges = [
    ...employeeLabour,
    ...(generalLabour ? [{ ...generalLabour, name: generalLabour.name || 'Unnamed Labour' }] : []),
  ];

  const employeeAssignmentsEnabled = settings.chargeSettings.employeeAssignments;
  const shouldShowEmployeeLabour = employeeAssignmentsEnabled || employeeLabour.length > 0;

  const basePrice = hasBasePrice ? productVariant.price : BigDecimal.ZERO.toMoney();
  const chargesPrice = getTotalPriceForCharges(charges);
  const totalPrice = BigDecimal.sum(BigDecimal.fromMoney(basePrice), BigDecimal.fromMoney(chargesPrice)).toMoney();

  const itemOrder = getItemOrder(item);

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={1}>
        <Text variant={'headingLarge'}>{name}</Text>
        {itemOrder?.type === 'ORDER' && <Badge text={itemOrder.name} variant={'highlight'} />}
      </Stack>
      <Stack direction={'vertical'} paddingVertical={'Small'} spacing={5}>
        <Text variant={'headingLarge'}>Labour Charge</Text>
        <SegmentedLabourControl
          types={['none', 'hourly-labour', 'fixed-price-labour']}
          disabled={getChargeOrder(generalLabour)?.type === 'ORDER'}
          charge={generalLabour}
          onChange={charge =>
            charge ? setGeneralLabour({ ...charge, uuid: uuid(), employeeId: null }) : setGeneralLabour(charge)
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
                    selected: employeeLabour.map(e => e.employeeId),
                    disabled: employeeLabour
                      .filter(charge => getChargeOrder(charge)?.type === 'ORDER')
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

                      setEmployeeLabour(current => [...current, defaultLabourCharge]);
                    },
                    onDeselect: employeeId => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(current => current.filter(l => l.employeeId !== employeeId));
                    },
                  })
                }
                isDisabled={!employeeAssignmentsEnabled}
              />

              <EmployeeLabourList
                charges={employeeLabour.filter(hasNonNullableProperty('employeeId'))}
                workOrderName={createWorkOrder.name}
                onClick={labour =>
                  router.push('EmployeeLabourConfig', {
                    labour,
                    onRemove: () => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(employeeLabour.filter(l => l !== labour));
                    },
                    onUpdate: updatedLabour => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(employeeLabour.map(l => (l === labour ? { ...l, ...updatedLabour } : l)));
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
            {hasBasePrice && (
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
      </Stack>

      <Stack direction="vertical" flex={1} alignment="space-evenly">
        <Button
          title="Remove"
          type="destructive"
          isDisabled={getItemOrder(item)?.type === 'ORDER'}
          onPress={() => {
            onRemove();
            router.popCurrent();
          }}
        />
        <Button
          title="Save"
          onPress={() => {
            onUpdate([...employeeLabour, ...(generalLabour ? [generalLabour] : [])]);
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

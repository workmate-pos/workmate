import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderLineItem, CreateWorkOrderCharge } from '../../types.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { getChargesPrice } from '../../create-work-order/charges.js';
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

export function LabourLineItemConfig({
  readonly,
  hasBasePrice,
  lineItem,
  labour: initialLabour,
  onRemove,
  onUpdate,
}: {
  readonly: boolean;
  /**
   * Whether to include the product variant price in the shown price.
   * This should be false for mutable services, as they have no base price.
   */
  hasBasePrice: boolean;
  lineItem: CreateWorkOrderLineItem;
  labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[];
  onRemove: () => void;
  onUpdate: (labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[]) => void;
}) {
  const [employeeLabour, setEmployeeLabour] = useState(initialLabour.filter(hasNonNullableProperty('employeeId')));
  const [generalLabour, setGeneralLabour] = useState(extractInitialGeneralLabour(initialLabour));

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currencyFormatter = useCurrencyFormatter();
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;
  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem?.productVariantId ?? null });

  const productVariant = productVariantQuery?.data;
  const name = getProductVariantName(productVariant);

  const labour = [
    ...employeeLabour,
    ...(generalLabour ? [{ ...generalLabour, name: generalLabour.name || 'Unnamed Labour' }] : []),
  ];

  const employeeAssignmentsEnabled = settings?.chargeSettings.employeeAssignments;
  const shouldShowEmployeeLabour = employeeAssignmentsEnabled || employeeLabour.length > 0;

  const labourPrice = getChargesPrice(labour);

  const basePrice = productVariant && hasBasePrice ? productVariant.price : BigDecimal.ZERO.toMoney();
  const totalPrice = BigDecimal.sum(BigDecimal.fromMoney(basePrice), BigDecimal.fromMoney(labourPrice)).toMoney();

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(name ?? 'Service');
  screen.setIsLoading(productVariantQuery.isLoading);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  return (
    <ScrollView>
      <Stack direction={'vertical'} paddingVertical={'Small'} spacing={5}>
        <Text variant={'headingLarge'}>Labour Charge</Text>
        <SegmentedLabourControl
          types={['none', 'hourly-labour', 'fixed-price-labour']}
          disabled={readonly}
          charge={generalLabour}
          onChange={charge =>
            charge ? setGeneralLabour({ ...charge, chargeUuid: uuid(), employeeId: null }) : setGeneralLabour(charge)
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
                    onSelect: employeeId => {
                      setHasUnsavedChanges(true);

                      const defaultLabourCharge = {
                        employeeId,
                        type: 'fixed-price-labour',
                        chargeUuid: uuid(),
                        name: settings?.labourLineItemName || 'Labour',
                        amount: BigDecimal.ZERO.toMoney(),
                      } as const;

                      setEmployeeLabour(current => [...current, defaultLabourCharge]);
                    },
                    onDeselect: employeeId => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(employeeLabour.filter(l => l.employeeId !== employeeId));
                    },
                  })
                }
                isDisabled={readonly || !employeeAssignmentsEnabled}
              />

              <EmployeeLabourList
                labour={employeeLabour.filter(hasNonNullableProperty('employeeId'))}
                readonly={readonly}
                onClick={labour =>
                  router.push('EmployeeLabourConfig', {
                    labour,
                    onRemove: () => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(employeeLabour.filter(l => l.chargeUuid !== labour.chargeUuid));
                    },
                    onUpdate: () => {
                      setHasUnsavedChanges(true);
                      setEmployeeLabour(
                        employeeLabour.map(l => (l.chargeUuid === labour.chargeUuid ? { ...l, ...labour } : l)),
                      );
                    },
                  })
                }
              />
            </Stack>
          </>
        )}

        <Stack direction={'horizontal'} alignment={'space-evenly'} flex={1} paddingVertical={'ExtraLarge'}>
          {hasBasePrice && (
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              Base Price: {currencyFormatter(basePrice)}
            </Text>
          )}
          <Text variant={'headingSmall'} color={'TextSubdued'}>
            Labour Price: {currencyFormatter(labourPrice)}
          </Text>
          <Text variant={'headingSmall'} color={'TextSubdued'}>
            Total Price: {currencyFormatter(totalPrice)}
          </Text>
        </Stack>
      </Stack>

      <Stack direction="vertical" flex={1} alignment="space-evenly">
        {readonly && <Button title="Back" onPress={() => router.pop()} />}
        {!readonly && (
          <>
            <Button title="Remove" type="destructive" disabled={!lineItem} onPress={() => onRemove()} />
            <Button
              title="Save"
              onPress={() => onUpdate([...employeeLabour, ...(generalLabour ? [generalLabour] : [])])}
            />
          </>
        )}
      </Stack>
    </ScrollView>
  );
}

function extractInitialGeneralLabour(labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[]) {
  const generalLabours = labour.filter(hasPropertyValue('employeeId', null));

  if (generalLabours.length === 1) {
    return generalLabours[0]!;
  }

  if (generalLabours.length > 1) {
    // pos only supports setting one general labour, so just use the total as fixed price
    return {
      type: 'fixed-price-labour',
      chargeUuid: uuid(),
      employeeId: null,
      name: generalLabours[0]!.name,
      amount: getChargesPrice(generalLabours),
    } as const;
  }

  return null;
}

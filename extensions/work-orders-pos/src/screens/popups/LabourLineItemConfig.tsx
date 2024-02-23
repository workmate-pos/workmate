import { useScreen } from '../../hooks/use-screen.js';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderLineItem, CreateWorkOrderCharge } from '../routes.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { getChargesPrice } from '../../create-work-order/charges.js';
import { uuid } from '../../util/uuid.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { FixedPriceLabour, HourlyLabour } from '@web/schemas/generated/create-work-order.js';
import { SegmentedLabourControl } from '../../components/SegmentedLabourControl.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export function LabourLineItemConfig() {
  const [readonly, setReadonly] = useState(false);
  const [hasBasePrice, setHasBasePrice] = useState(false);
  const [lineItem, setLineItem] = useState<CreateWorkOrderLineItem | null>(null);
  const [employeeLabour, setEmployeeLabour] = useState<
    DiscriminatedUnionOmit<
      CreateWorkOrderCharge & { employeeId: ID } & (FixedPriceLabour | HourlyLabour),
      'lineItemUuid'
    >[]
  >([]);
  const [generalLabour, setGeneralLabour] = useState<DiscriminatedUnionOmit<
    CreateWorkOrderCharge & { employeeId: null } & (FixedPriceLabour | HourlyLabour),
    'lineItemUuid'
  > | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { Screen, usePopup, closePopup, cancelPopup } = useScreen(
    'LabourLineItemConfig',
    ({ readonly, hasBasePrice, lineItem, labour }) => {
      setReadonly(readonly);
      setHasBasePrice(hasBasePrice);
      setLineItem(lineItem);
      setEmployeeLabour(labour.filter(hasNonNullableProperty('employeeId')));
      setHasUnsavedChanges(false);

      const generalLabours = labour.filter(hasPropertyValue('employeeId', null));
      if (generalLabours.length === 1) {
        setGeneralLabour(generalLabours[0]!);
      } else if (generalLabours.length > 1) {
        // pos only supports setting one general labour, so calculate it and use a fixed price
        setGeneralLabour({
          type: 'fixed-price-labour',
          chargeUuid: uuid(),
          employeeId: null,
          name: generalLabours[0]!.name,
          amount: getChargesPrice(generalLabours),
        });
      } else {
        setGeneralLabour(null);
      }
    },
  );

  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    setHasUnsavedChanges(true);

    setEmployeeLabour(employeeLabour => [
      ...result.map(id => {
        // For each selected employee, either keep the existing labour or create a new one

        return (
          employeeLabour.find(l => l.employeeId === id) ??
          ({
            type: 'fixed-price-labour',
            chargeUuid: uuid(),
            employeeId: id,
            name: settings?.labourLineItemName || 'Labour',
            amount: BigDecimal.ZERO.toMoney(),
          } as const)
        );
      }),
    ]);
  });

  const employeeConfigPopup = usePopup('EmployeeLabourConfig', result => {
    setHasUnsavedChanges(true);

    if (result.type === 'remove') {
      setEmployeeLabour(labour => labour.filter(l => l.chargeUuid !== result.chargeUuid));
    } else if (result.type === 'update') {
      setEmployeeLabour(
        employeeLabour.map(l =>
          l.chargeUuid === result.chargeUuid
            ? { ...result.labour, employeeId: result.employeeId, chargeUuid: result.chargeUuid }
            : l,
        ),
      );
    } else {
      return result satisfies never;
    }
  });

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

  return (
    <Screen
      title={name ?? 'Service'}
      overrideNavigateBack={unsavedChangesDialog.show}
      isLoading={productVariantQuery.isLoading}
      presentation={{ sheet: true }}
    >
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
                    employeeSelectorPopup.navigate(employeeLabour.map(e => e.employeeId).filter(isNonNullable))
                  }
                  isDisabled={readonly || !employeeAssignmentsEnabled}
                />

                <EmployeeLabourList
                  labour={employeeLabour.filter(hasNonNullableProperty('employeeId'))}
                  readonly={readonly}
                  onClick={labour =>
                    employeeConfigPopup.navigate({
                      employeeId: labour.employeeId,
                      chargeUuid: labour.chargeUuid,
                      labour,
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
                  closePopup({ type: 'remove', lineItem });
                }}
              />
              <Button
                title="Save"
                disabled={!lineItem}
                onPress={() => {
                  if (!lineItem) return;
                  closePopup({
                    type: 'update',
                    lineItem,
                    labour,
                  });
                }}
              />
            </>
          )}
        </Stack>
      </ScrollView>
    </Screen>
  );
}

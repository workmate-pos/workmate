import { useScreen } from '../../hooks/use-screen.js';
import {
  Button,
  ScrollView,
  SegmentedControl,
  Stack,
  Stepper,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { CreateWorkOrderLineItem, CreateWorkOrderLabour } from '../routes.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { EmployeeLabourList } from '../../components/EmployeeLabourList.js';
import { useUnsavedChangesDialog } from '../../providers/UnsavedChangesDialogProvider.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { getLabourPrice } from '../../create-work-order/labour.js';
import { uuid } from '../../util/uuid.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export function LabourLineItemConfig() {
  const [readonly, setReadonly] = useState(false);
  const [lineItem, setLineItem] = useState<CreateWorkOrderLineItem | null>(null);
  const [employeeLabour, setEmployeeLabour] = useState<
    DiscriminatedUnionOmit<CreateWorkOrderLabour & { employeeId: ID }, 'lineItemUuid'>[]
  >([]);
  const [generalLabour, setGeneralLabour] = useState<DiscriminatedUnionOmit<
    CreateWorkOrderLabour & { employeeId: null },
    'lineItemUuid'
  > | null>(null);

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // TODO: Arbitrary amount charged for labour that is only added if non zero

  const { Screen, usePopup, closePopup, cancelPopup } = useScreen(
    'LabourLineItemConfig',
    ({ readonly, lineItem, labour }) => {
      setReadonly(readonly);
      setLineItem(lineItem);
      setEmployeeLabour(labour.filter(hasNonNullableProperty('employeeId')));
      setUnsavedChanges(false);

      const generalLabours = labour.filter(hasPropertyValue('employeeId', null));
      if (generalLabours.length === 1) {
        setGeneralLabour(generalLabours[0]!);
      } else if (generalLabours.length > 1) {
        // pos only supports setting one general labour, so calculate it and use a fixed price
        setGeneralLabour({
          type: 'fixed-price-labour',
          labourUuid: uuid(),
          employeeId: null,
          name: settingsQuery?.data?.settings?.labourLineItemName ?? 'Labour',
          amount: getLabourPrice(generalLabours),
        });
      } else {
        setGeneralLabour(null);
      }
    },
  );

  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    setUnsavedChanges(true);

    setEmployeeLabour(employeeLabour => [
      ...result.map(id => {
        // For each selected employee, either keep the existing labour or create a new one

        return (
          employeeLabour.find(l => l.employeeId === id) ??
          ({
            type: 'fixed-price-labour',
            labourUuid: uuid(),
            employeeId: id,
            name: settingsQuery?.data?.settings?.labourLineItemName ?? 'Labour',
            amount: BigDecimal.ZERO.toMoney(),
          } as const)
        );
      }),
    ]);
  });

  const employeeConfigPopup = usePopup('EmployeeLabourConfig', result => {
    setUnsavedChanges(true);

    if (result.type === 'remove') {
      setEmployeeLabour(labour => labour.filter(l => l.labourUuid !== result.labourUuid));
    } else if (result.type === 'update') {
      setEmployeeLabour(
        employeeLabour.map(l =>
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

  const labour = [...employeeLabour, ...(generalLabour ? [generalLabour] : [])];

  const labourPrice = getLabourPrice(labour);

  const productVariantPrice = productVariant ? productVariant.price : BigDecimal.ZERO.toMoney();
  const totalPrice = BigDecimal.sum(
    BigDecimal.fromMoney(productVariantPrice),
    BigDecimal.fromMoney(labourPrice),
  ).toMoney();

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
        <Stack direction={'vertical'} paddingVertical={'Small'} spacing={5}>
          <Text variant={'headingLarge'}>General Labour</Text>
          <Stack direction={'vertical'} spacing={2}>
            <SegmentedControl
              segments={[
                { id: 'none', label: 'None', disabled: readonly },
                { id: 'hourly-labour' satisfies CreateWorkOrderLabour['type'], label: 'Hourly', disabled: readonly },
                {
                  id: 'fixed-price-labour' satisfies CreateWorkOrderLabour['type'],
                  label: 'Fixed Price',
                  disabled: readonly,
                },
              ]}
              selected={generalLabour?.type ?? 'none'}
              onSelect={(id: CreateWorkOrderLabour['type'] | 'none') => {
                if (id === 'none') {
                  setGeneralLabour(null);
                  return;
                }

                if (id === 'hourly-labour') {
                  setGeneralLabour(generalLabour => ({
                    type: 'hourly-labour',
                    labourUuid: uuid(),
                    employeeId: null,
                    name: settingsQuery?.data?.settings?.labourLineItemName ?? 'Labour',
                    rate: getLabourPrice(generalLabour ? [generalLabour] : []),
                    hours: BigDecimal.ONE.toDecimal(),
                  }));
                  return;
                }

                if (id === 'fixed-price-labour') {
                  setGeneralLabour(generalLabour => ({
                    type: 'fixed-price-labour',
                    labourUuid: uuid(),
                    employeeId: null,
                    name: settingsQuery?.data?.settings?.labourLineItemName ?? 'Labour',
                    amount: getLabourPrice(generalLabour ? [generalLabour] : []),
                  }));
                  return;
                }
              }}
            ></SegmentedControl>

            {generalLabour?.type === 'hourly-labour' && (
              <>
                <Stack direction={'horizontal'}>
                  <Text color={'TextSubdued'} variant={'headingSmall'}>
                    Hourly Rate
                  </Text>
                </Stack>
                <Stepper
                  disabled={readonly}
                  initialValue={Number(generalLabour.rate)}
                  value={Number(generalLabour.rate)}
                  minimumValue={0}
                  onValueChanged={(rate: number) => {
                    if (!BigDecimal.isValid(rate.toFixed(2))) return;

                    setGeneralLabour({
                      ...generalLabour,
                      rate: BigDecimal.fromString(rate.toFixed(2)).toMoney(),
                    });
                  }}
                ></Stepper>

                <Stack direction={'horizontal'}>
                  <Text color={'TextSubdued'} variant={'headingSmall'}>
                    Hours
                  </Text>
                </Stack>
                <Stepper
                  disabled={readonly}
                  initialValue={Number(generalLabour.hours)}
                  value={Number(generalLabour.hours)}
                  minimumValue={0}
                  onValueChanged={(hours: number) => {
                    if (!BigDecimal.isValid(hours.toFixed(2))) return;

                    setGeneralLabour({
                      ...generalLabour,
                      hours: BigDecimal.fromString(hours.toFixed(2)).toDecimal(),
                    });
                  }}
                ></Stepper>
                <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
                  <Text variant={'headingSmall'} color={'TextSubdued'}>
                    {generalLabour.hours} hours × {currencyFormatter(generalLabour.rate)}/hour ={' '}
                    {currencyFormatter(
                      BigDecimal.fromDecimal(generalLabour.hours)
                        .multiply(BigDecimal.fromMoney(generalLabour.rate))
                        .toMoney(),
                    )}
                  </Text>
                </Stack>
              </>
            )}

            {generalLabour?.type === 'fixed-price-labour' && (
              <>
                <Stack direction={'horizontal'} flexChildren>
                  <Text color={'TextSubdued'} variant={'headingSmall'}>
                    Price
                  </Text>
                </Stack>
                <Stack direction={'horizontal'} alignment={'space-between'} flexChildren>
                  <Stepper
                    disabled={readonly}
                    initialValue={Number(generalLabour.amount)}
                    value={Number(generalLabour.amount)}
                    minimumValue={0}
                    onValueChanged={(amount: number) => {
                      if (!BigDecimal.isValid(amount.toFixed(2))) return;

                      setGeneralLabour({
                        ...generalLabour,
                        amount: BigDecimal.fromString(amount.toFixed(2)).toMoney(),
                      });
                    }}
                  ></Stepper>
                </Stack>
                <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
                  <Text variant={'headingSmall'} color={'TextSubdued'}>
                    {currencyFormatter(generalLabour.amount)}
                  </Text>
                </Stack>
              </>
            )}
          </Stack>

          <Text variant={'headingLarge'}>Employee Labour</Text>
          <Stack direction={'vertical'} spacing={2}>
            <Button
              title={'Add employees'}
              type={'primary'}
              onPress={() =>
                employeeSelectorPopup.navigate(employeeLabour.map(e => e.employeeId).filter(isNonNullable))
              }
              isDisabled={readonly}
            />

            <EmployeeLabourList
              labour={employeeLabour.filter(hasNonNullableProperty('employeeId'))}
              readonly={readonly}
              onClick={labour =>
                employeeConfigPopup.navigate({ employeeId: labour.employeeId, labourUuid: labour.labourUuid, labour })
              }
            />
          </Stack>

          <Stack direction={'horizontal'} alignment={'space-evenly'} flex={1} paddingVertical={'ExtraLarge'}>
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              Base Price: {currencyFormatter(productVariantPrice)}
            </Text>
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

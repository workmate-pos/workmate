import {
  Button,
  ScrollView,
  SegmentedControl,
  Selectable,
  Stack,
  Stepper,
  Text,
  TextField,
} from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderLabour } from '../routes.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { uuid } from '../../util/uuid.js';
import { getLabourPrice } from '../../create-work-order/labour.js';

export function EmployeeLabourConfig() {
  const [employeeId, setEmployeeId] = useState<ID | null>(null);

  const [labour, setLabour] = useState<DiscriminatedUnionOmit<
    CreateWorkOrderLabour,
    'lineItemUuid' | 'employeeId' | 'labourUuid'
  > | null>(null);

  const [labourUuid, setLabourUuid] = useState<string | null>(null);

  const { Screen, closePopup } = useScreen('EmployeeLabourConfig', ({ employeeId, labourUuid, labour }) => {
    setEmployeeId(employeeId);
    setLabourUuid(labourUuid);
    setLabour(labour);
  });

  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQuery = useEmployeeQuery({ fetch, id: employeeId });
  const settingsQuery = useSettingsQuery({ fetch });

  useEffect(() => {
    if (!employeeQuery.data) return;
    if (!settingsQuery.data) return;

    const { rate } = employeeQuery.data;
    const { labourLineItemName } = settingsQuery.data.settings;

    setLabour(
      hourlyLabour =>
        hourlyLabour ??
        ({
          type: 'hourly-labour',
          hours: BigDecimal.ZERO.toDecimal(),
          name: labourLineItemName || 'Labour',
          rate,
        } as const),
    );
  }, [labour, employeeQuery.data, settingsQuery.data]);

  // TODO: Dedup segmentedcontrol with LabourLineItemConfig

  const canResetLabour =
    labour?.type === 'hourly-labour' &&
    employeeQuery.data?.rate &&
    !BigDecimal.fromMoney(employeeQuery.data.rate).equals(BigDecimal.fromMoney(labour.rate));

  return (
    <Screen
      title={employeeQuery?.data?.name ?? 'Employee'}
      isLoading={!labourUuid || !employeeId || !labour || employeeQuery.isLoading}
      presentation={{ sheet: true }}
    >
      {labourUuid && employeeId && labour && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={5}>
            <Text variant={'headingLarge'}>{employeeQuery?.data?.name ?? 'Unknown Employee'}</Text>

            <Stack direction={'vertical'} spacing={2}>
              <SegmentedControl
                segments={[
                  {
                    id: 'hourly-labour' satisfies CreateWorkOrderLabour['type'],
                    label: 'Hourly',
                    disabled: false,
                  },
                  {
                    id: 'fixed-price-labour' satisfies CreateWorkOrderLabour['type'],
                    label: 'Fixed Price',
                    disabled: false,
                  },
                ]}
                selected={labour.type ?? 'none'}
                onSelect={(id: CreateWorkOrderLabour['type']) => {
                  if (id === 'hourly-labour') {
                    let rate = BigDecimal.fromMoney(
                      employeeQuery?.data?.rate ?? getLabourPrice(labour ? [labour] : []),
                    );

                    if (rate.equals(BigDecimal.ZERO)) {
                      rate = BigDecimal.ONE;
                    }

                    setLabour(labour => ({
                      type: 'hourly-labour',
                      labourUuid: uuid(),
                      employeeId: null,
                      name: labour?.name ?? (settingsQuery?.data?.settings?.labourLineItemName || 'Labour'),
                      rate: rate.toMoney(),
                      hours: BigDecimal.fromMoney(getLabourPrice(labour ? [labour] : []))
                        .divide(rate, 2)
                        .toDecimal(),
                    }));
                    return;
                  }

                  if (id === 'fixed-price-labour') {
                    setLabour(labour => ({
                      type: 'fixed-price-labour',
                      labourUuid: uuid(),
                      employeeId: null,
                      name: labour?.name ?? (settingsQuery?.data?.settings?.labourLineItemName || 'Labour'),
                      amount: getLabourPrice(labour ? [labour] : []),
                    }));
                    return;
                  }
                }}
              ></SegmentedControl>

              <TextField
                label={'Labour Name'}
                value={labour.name}
                onChange={(name: string) => setLabour({ ...labour, name })}
                isValid={labour.name.length > 0}
                errorMessage={labour.name.length === 0 ? 'Labour name is required' : undefined}
              />

              {labour.type === 'hourly-labour' && (
                <>
                  <Stack direction={'horizontal'} alignment={'space-between'}>
                    <Text color={'TextSubdued'} variant={'headingSmall'}>
                      Hourly Rate
                    </Text>
                    <Selectable
                      disabled={!canResetLabour}
                      onPress={() => {
                        if (!canResetLabour) return;
                        if (!employeeQuery.data?.rate) return;

                        setLabour({
                          ...labour,
                          rate: employeeQuery.data.rate,
                        });
                      }}
                    >
                      <Text color={canResetLabour ? 'TextInteractive' : 'TextSubdued'}>Reset</Text>
                    </Selectable>
                  </Stack>
                  <Stepper
                    initialValue={Number(labour.rate)}
                    value={Number(labour.rate)}
                    minimumValue={0}
                    onValueChanged={(rate: number) => {
                      if (!BigDecimal.isValid(rate.toFixed(2))) return;

                      setLabour({
                        ...labour,
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
                    initialValue={Number(labour.hours)}
                    value={Number(labour.hours)}
                    minimumValue={0}
                    onValueChanged={(hours: number) => {
                      if (!BigDecimal.isValid(hours.toFixed(2))) return;

                      setLabour({
                        ...labour,
                        hours: BigDecimal.fromString(hours.toFixed(2)).toDecimal(),
                      });
                    }}
                  ></Stepper>
                  <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
                    <Text variant={'headingSmall'} color={'TextSubdued'}>
                      {labour.hours} hours × {currencyFormatter(labour.rate)}/hour ={' '}
                      {currencyFormatter(
                        BigDecimal.fromDecimal(labour.hours).multiply(BigDecimal.fromMoney(labour.rate)).toMoney(),
                      )}
                    </Text>
                  </Stack>
                </>
              )}

              {labour.type === 'fixed-price-labour' && (
                <>
                  <Stack direction={'horizontal'} flexChildren>
                    <Text color={'TextSubdued'} variant={'headingSmall'}>
                      Price
                    </Text>
                  </Stack>
                  <Stack direction={'horizontal'} alignment={'space-between'} flexChildren>
                    <Stepper
                      initialValue={Number(labour.amount)}
                      value={Number(labour.amount)}
                      minimumValue={0}
                      onValueChanged={(amount: number) => {
                        if (!BigDecimal.isValid(amount.toFixed(2))) return;

                        setLabour({
                          ...labour,
                          amount: BigDecimal.fromString(amount.toFixed(2)).toMoney(),
                        });
                      }}
                    ></Stepper>
                  </Stack>
                  <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
                    <Text variant={'headingSmall'} color={'TextSubdued'}>
                      {currencyFormatter(labour.amount)}
                    </Text>
                  </Stack>
                </>
              )}
            </Stack>

            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', labourUuid });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({
                    type: 'update',
                    labourUuid,
                    employeeId,
                    labour: {
                      ...labour,
                      name: labour.name || 'Unnamed labour',
                    },
                  });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}

import {
  Button,
  ScrollView,
  Selectable,
  Stack,
  Stepper,
  Text,
  TextField,
  useExtensionApi,
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

export function EmployeeLabourConfig() {
  const [employeeId, setEmployeeId] = useState<ID | null>(null);

  const [hourlyLabour, setHourlyLabour] = useState<
    | ({ type: 'hourly-labour' } & DiscriminatedUnionOmit<
        CreateWorkOrderLabour,
        'lineItemUuid' | 'employeeId' | 'labourUuid'
      >)
    | null
  >(null);

  // TODO: Support fixed price labour for individual employees (same as in LabourLineItemConfig)
  const [fixedPriceLabour, setFixedPriceLabour] = useState<
    | ({ type: 'fixed-price-labour' } & DiscriminatedUnionOmit<
        CreateWorkOrderLabour,
        'lineItemUuid' | 'employeeId' | 'labourUuid'
      >)
    | null
  >(null);

  const [labourUuid, setLabourUuid] = useState<string | null>(null);

  const api = useExtensionApi();

  const { Screen, closePopup } = useScreen('EmployeeLabourConfig', ({ employeeId, labourUuid, labour }) => {
    if (labour.type === 'fixed-price-labour') {
      api.toast.show('Fixed price labour is not yet supported for individual employees');
      closePopup({ type: 'remove', labourUuid });
      return;
    }

    setEmployeeId(employeeId);
    setLabourUuid(labourUuid);
    setHourlyLabour(labour);
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

    setHourlyLabour(
      hourlyLabour =>
        hourlyLabour ??
        ({
          type: 'hourly-labour',
          hours: BigDecimal.ZERO.toDecimal(),
          name: labourLineItemName || 'Labour',
          rate,
        } as const),
    );
  }, [hourlyLabour, employeeQuery.data, settingsQuery.data]);

  // TODO: Configurable rate, with as default the employee's rate (and a reset button?)

  return (
    <Screen
      title={employeeQuery?.data?.name ?? 'Employee'}
      isLoading={!labourUuid || employeeQuery.isLoading}
      presentation={{ sheet: true }}
    >
      {labourUuid && employeeId && hourlyLabour && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={5}>
            <Text variant={'headingLarge'}>{employeeQuery?.data?.name ?? 'Unknown Employee'}</Text>
            <TextField
              title={'Labour Name'}
              initialValue={hourlyLabour.name}
              onChangeText={(name: string) => setHourlyLabour({ ...hourlyLabour, name })}
              isValid={hourlyLabour.name.length > 0}
              errorMessage={hourlyLabour.name.length === 0 ? 'Labour name is required' : undefined}
            />
            <Text variant={'headingSmall'}>Hours</Text>
            <Stepper
              minimumValue={0}
              onValueChanged={(hours: number) => {
                if (!BigDecimal.isValid(hours.toFixed(2))) return;

                setHourlyLabour({
                  ...hourlyLabour,
                  hours: BigDecimal.fromString(hours.toFixed(2)).toDecimal(),
                });
              }}
              initialValue={Number(hourlyLabour.hours)}
              value={Number(hourlyLabour.hours)}
            />
            <Stack direction={'horizontal'} alignment={'space-between'}>
              <Text variant={'headingSmall'}>Hourly rate</Text>
              <Selectable
                disabled={
                  !employeeQuery.data ||
                  BigDecimal.fromMoney(hourlyLabour.rate).equals(BigDecimal.fromMoney(employeeQuery.data.rate))
                }
                onPress={() => {
                  if (!employeeQuery.data) return;
                  setHourlyLabour({ ...hourlyLabour, rate: employeeQuery.data.rate });
                }}
              >
                <Text color={'TextInteractive'}>Reset</Text>
              </Selectable>
            </Stack>
            <Stepper
              minimumValue={1}
              initialValue={Number(hourlyLabour.rate)}
              value={Number(hourlyLabour.rate)}
              onValueChanged={(rate: number) => {
                if (!BigDecimal.isValid(rate.toFixed(2))) return;

                setHourlyLabour({ ...hourlyLabour, rate: BigDecimal.fromString(rate.toFixed(2)).toMoney() });
              }}
            />
            <Stack direction={'horizontal'} flex={1} alignment={'space-evenly'}>
              <Text variant={'headingSmall'} color={'TextSubdued'}>
                {hourlyLabour.hours} hours × {currencyFormatter(hourlyLabour.rate)}/hour ={' '}
                {currencyFormatter(
                  BigDecimal.fromDecimal(hourlyLabour.hours)
                    .multiply(BigDecimal.fromMoney(hourlyLabour.rate))
                    .toMoney(),
                )}
              </Text>
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
                      ...hourlyLabour,
                      name: hourlyLabour.name || 'Unnamed labour',
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

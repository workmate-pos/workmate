import { Button, ScrollView, Selectable, Stack, Stepper, Text, TextField } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { Dollars, parseMoney, toCents, toDollars, toMoney } from '@work-orders/common/util/money.js';
import { ID, Int } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderLabour } from '../routes.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export function EmployeeLabourConfig() {
  const [employeeId, setEmployeeId] = useState<ID | null>(null);

  const [hourlyLabour, setHourlyLabour] = useState<
    | ({ type: 'hourly-labour' } & DiscriminatedUnionOmit<
        CreateWorkOrderLabour,
        'lineItemUuid' | 'employeeId' | 'labourUuid'
      >)
    | null
  >(null);

  // TODO: Support fixed price labour
  const [fixedPriceLabour, setFixedPriceLabour] = useState<
    | ({ type: 'fixed-price-labour' } & DiscriminatedUnionOmit<
        CreateWorkOrderLabour,
        'lineItemUuid' | 'employeeId' | 'labourUuid'
      >)
    | null
  >(null);

  const [labourUuid, setLabourUuid] = useState<string | null>(null);

  const { Screen, closePopup } = useScreen('EmployeeLabourConfig', ({ employeeId, labourUuid, labour }) => {
    setEmployeeId(employeeId);
    setLabourUuid(labourUuid);
    setHourlyLabour(labour?.type === 'hourly-labour' ? labour : null);
    setFixedPriceLabour(labour?.type === 'fixed-price-labour' ? labour : null);
  });

  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQuery = useEmployeeQuery({ fetch, id: employeeId });
  const settingsQuery = useSettingsQuery({ fetch });

  useEffect(() => {
    if (!employeeQuery.data) return;
    if (!settingsQuery.data) return;

    setHourlyLabour(
      hourlyLabour ??
        ({
          type: 'hourly-labour',
          hours: 0 as Int,
          name: settingsQuery.data.settings.labourLineItemName ?? 'Labour',
          rate: toMoney(toDollars(employeeQuery.data.rate)),
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
              onValueChanged={(hours: Int) => setHourlyLabour({ ...hourlyLabour, hours })}
              initialValue={hourlyLabour.hours}
              value={hourlyLabour.hours}
            />
            <Stack direction={'horizontal'} alignment={'space-between'}>
              <Text variant={'headingSmall'}>Hourly rate</Text>
              <Selectable
                disabled={!employeeQuery.data || toCents(parseMoney(hourlyLabour.rate)) === employeeQuery.data.rate}
                onPress={() => {
                  if (!employeeQuery.data) return;
                  setHourlyLabour({ ...hourlyLabour, rate: toMoney(toDollars(employeeQuery.data.rate)) });
                }}
              >
                <Text color={'TextInteractive'}>Reset</Text>
              </Selectable>
            </Stack>
            <Stepper
              minimumValue={1}
              initialValue={Number(hourlyLabour.rate)}
              value={Number(hourlyLabour.rate)}
              onValueChanged={(rate: number) =>
                setHourlyLabour({ ...hourlyLabour, rate: toMoney(Math.floor(rate) as Dollars) })
              }
            />
            <Stack direction={'horizontal'} flex={1} alignment={'space-evenly'}>
              <Text variant={'headingSmall'} color={'TextSubdued'}>
                {hourlyLabour.hours} hours × {currencyFormatter(hourlyLabour.rate)}/hour ={' '}
                {currencyFormatter((hourlyLabour.hours * parseMoney(hourlyLabour.rate)) as Dollars)}
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

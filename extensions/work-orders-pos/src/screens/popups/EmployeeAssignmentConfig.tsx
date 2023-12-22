import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { CreateWorkOrderEmployeeAssignment } from '../routes.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { Cents, toDollars } from '@work-orders/common/util/money.js';
import { Int } from '@web/schemas/generated/create-work-order.js';

export function EmployeeAssignmentConfig() {
  const [employeeAssignment, setEmployeeAssignment] = useState<Omit<
    CreateWorkOrderEmployeeAssignment,
    'lineItemUuid'
  > | null>(null);
  const { Screen, closePopup } = useScreen('EmployeeAssignmentConfig', setEmployeeAssignment);
  const currencyFormatter = useCurrencyFormatter();

  const fetch = useAuthenticatedFetch();
  const employeeQuery = useEmployeeQuery({ fetch, id: employeeAssignment?.employeeId ?? null });

  return (
    <Screen
      title={employeeQuery?.data?.name ?? 'Employee'}
      isLoading={!employeeAssignment || employeeQuery.isLoading}
      presentation={{ sheet: true }}
    >
      {employeeAssignment && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={5}>
            <Text variant={'headingLarge'}>{employeeQuery?.data?.name ?? 'Unknown Employee'}</Text>
            <Text variant={'body'} color={'TextSubdued'}>
              {employeeQuery?.data?.rate
                ? currencyFormatter(toDollars(employeeQuery.data.rate)) + '/hour'
                : 'Unknown Rate'}
            </Text>
            <Stepper
              minimumValue={0}
              initialValue={employeeAssignment.hours}
              onValueChanged={(hours: Int) => setEmployeeAssignment({ ...employeeAssignment, hours })}
              value={employeeAssignment.hours}
            />
            <Stack direction={'horizontal'} flex={1} alignment={'space-evenly'}>
              <Text variant={'captionMedium'}>
                {employeeQuery?.data?.rate
                  ? currencyFormatter(toDollars((employeeQuery.data.rate * employeeAssignment.hours) as Cents))
                  : 'Unknown Price'}
              </Text>
            </Stack>
            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', employeeAssignment });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({ type: 'update', employeeAssignment });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}

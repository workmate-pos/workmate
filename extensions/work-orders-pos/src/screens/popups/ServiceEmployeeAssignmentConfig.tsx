import { useScreen } from '../../hooks/use-screen';
import { useState } from 'react';
import { WorkOrderServiceEmployeeAssignment } from '../../types/work-order';
import { Button, ScrollView, Stack, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter';

export function ServiceEmployeeAssignmentConfig() {
  const [assignment, setAssignment] = useState<WorkOrderServiceEmployeeAssignment | null>(null);
  const { Screen, closePopup } = useScreen('ServiceEmployeeAssignmentConfig', setAssignment);
  const currencyFormatter = useCurrencyFormatter();

  return (
    <Screen title={assignment?.name ?? 'Employee'} isLoading={!assignment} presentation={{ sheet: true }}>
      {assignment && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={5}>
            <Text variant={'headingLarge'}>{assignment.name}</Text>
            <Text variant={'body'} color={'TextSubdued'}>
              {currencyFormatter(assignment.employeeRate)}/hour
            </Text>
            <Stepper
              minimumValue={0}
              initialValue={assignment.hours}
              onValueChanged={hours => setAssignment({ ...assignment, hours })}
              value={assignment.hours}
            />
            <Stack direction={'horizontal'} flex={1} alignment={'space-evenly'}>
              <Text variant={'captionMedium'}>{currencyFormatter(assignment.employeeRate * assignment.hours)}</Text>
            </Stack>
            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', assignment });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({ type: 'update', assignment });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}

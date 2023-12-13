import { Button, List, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import type { WorkOrderService, WorkOrderServiceEmployeeAssignment } from '../../types/work-order';

export function ServiceConfig() {
  const [service, setService] = useState<WorkOrderService | null>(null);
  const [query, setQuery] = useState('');
  // TODO
  // <SearchBar
  //   placeholder={'Search employees'}
  //   initialValue={query}
  //   onTextChange={setQuery}
  //   onSearch={() => {}}
  // />

  const { Screen, closePopup, usePopup } = useScreen('ServiceConfig', item => {
    // TODO: make sure every pop up resets like this
    setService(item);
    setQuery('');
  });

  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    if (!service) return;

    const newEmployeeAssignments: WorkOrderServiceEmployeeAssignment[] = [];
    for (const { employeeId, name, employeeRate } of result) {
      const assignment = service.employeeAssignments.find(e => e.employeeId === employeeId);
      newEmployeeAssignments.push(assignment ?? { employeeId, name, employeeRate, hours: 0 });
    }

    setService({
      ...service,
      employeeAssignments: newEmployeeAssignments,
    });
  });

  const employeeConfigPopup = usePopup('ServiceEmployeeAssignmentConfig', result => {
    if (!service) return;

    if (result.type === 'remove') {
      setService({
        ...service,
        employeeAssignments: service.employeeAssignments.filter(e => e.employeeId !== result.assignment.employeeId),
      });
    } else if (result.type === 'update') {
      setService({
        ...service,
        employeeAssignments: service.employeeAssignments.map(e =>
          e.employeeId === result.assignment.employeeId ? result.assignment : e,
        ),
      });
    } else {
      return result.type satisfies never;
    }
  });

  const currencyFormatter = useCurrencyFormatter();

  const employeePrice =
    service?.employeeAssignments.reduce((total, employee) => total + employee.hours * employee.employeeRate, 0) ?? 0;

  // TODO: List of employees, including their number of hours
  return (
    <Screen title={service?.name ?? 'Service'} isLoading={!service} presentation={{ sheet: true }}>
      {service && (
        <ScrollView>
          <Stack direction="vertical">
            <Button
              title={'Assign employees'}
              type={'primary'}
              onPress={() =>
                employeeSelectorPopup.navigate({
                  selectedEmployeeIds: service.employeeAssignments.map(e => e.employeeId),
                })
              }
            />
            <List
              data={service.employeeAssignments.map(e => ({
                id: e.employeeId,
                onPress: () => {
                  employeeConfigPopup.navigate(e);
                },
                leftSide: {
                  label: e.name,
                  subtitle: [`${e.hours} hours`, `${currencyFormatter(e.employeeRate)}/hour`],
                },
                rightSide: {
                  showChevron: true,
                  label: currencyFormatter(e.hours * e.employeeRate),
                },
              }))}
            />
            {service.employeeAssignments.length === 0 && (
              <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
                <Text variant="body" color="TextSubdued">
                  No employees assigned
                </Text>
              </Stack>
            )}
            <Stack direction={'horizontal'} alignment={'space-evenly'} flex={1} paddingVertical={'ExtraLarge'}>
              <Text variant={'captionMedium'}>Base Price: {currencyFormatter(service.basePrice)}</Text>
              <Text variant={'captionMedium'}>Labour Price: {currencyFormatter(employeePrice)}</Text>
              <Text variant={'captionMedium'}>Total Price: {currencyFormatter(service.basePrice + employeePrice)}</Text>
            </Stack>
            <Stack direction="vertical" flex={1} alignment="space-evenly">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', service });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({ type: 'update', service });
                }}
              />
            </Stack>
          </Stack>
        </ScrollView>
      )}
    </Screen>
  );
}

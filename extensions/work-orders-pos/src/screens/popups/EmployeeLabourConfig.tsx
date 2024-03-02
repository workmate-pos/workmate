import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { SegmentedLabourControl } from '../../components/SegmentedLabourControl.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { CreateWorkOrderCharge } from '../../types.js';

export function EmployeeLabourConfig({
  labour: initialLabour,
  onRemove,
  onUpdate,
}: {
  labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid' | 'chargeUuid'> & { employeeId: ID };
  onRemove: () => void;
  onUpdate: (
    labour: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid' | 'employeeId' | 'chargeUuid'>,
  ) => void;
}) {
  const [labour, setLabour] = useState(initialLabour);

  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;
  const employeeQuery = useEmployeeQuery({ fetch, id: labour.employeeId });

  useEffect(() => {
    if (!employeeQuery.data) return;
    if (!settings) return;

    const { rate } = employeeQuery.data;
    const { labourLineItemName } = settings;

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
  }, [labour, employeeQuery.data]);

  const screen = useScreen();
  screen.setTitle(employeeQuery?.data?.name ?? 'Employee');
  screen.setIsLoading(employeeQuery.isLoading);

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={5}>
        <Text variant={'headingLarge'}>{employeeQuery?.data?.name ?? 'Unknown Employee'}</Text>

        <SegmentedLabourControl
          types={['hourly-labour', 'fixed-price-labour']}
          charge={labour}
          onChange={labour => setLabour(current => ({ ...current, ...labour }))}
          defaultHourlyRate={employeeQuery?.data?.rate}
        />

        <Stack direction="vertical" flex={1} alignment="flex-end">
          <Button title="Remove" type="destructive" onPress={() => onRemove()} />
          <Button
            title="Save"
            onPress={() =>
              onUpdate({
                ...labour,
                name: labour.name || 'Unnamed labour',
              })
            }
          />
        </Stack>
      </Stack>
    </ScrollView>
  );
}

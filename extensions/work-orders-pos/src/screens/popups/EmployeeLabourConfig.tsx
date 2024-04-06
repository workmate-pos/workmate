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
import { useRouter } from '../../routes.js';

type LabourCharge = CreateWorkOrderCharge & { type: 'hourly-labour' | 'fixed-price-labour' };

export function EmployeeLabourConfig({
  labour: initialLabour,
  onRemove,
  onUpdate,
}: {
  labour: DiscriminatedUnionOmit<LabourCharge, 'workOrderItemUuid' | 'uuid'> & { employeeId: ID };
  onRemove: () => void;
  onUpdate: (labour: DiscriminatedUnionOmit<LabourCharge, 'workOrderItemUuid' | 'uuid'> & { employeeId: ID }) => void;
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

  const router = useRouter();
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
          onChange={labour => setLabour(current => ({ employeeId: current.employeeId, ...labour }))}
          defaultHourlyRate={employeeQuery?.data?.rate}
        />

        <Stack direction="vertical" flex={1} alignment="flex-end">
          <Button
            title="Remove"
            type="destructive"
            onPress={() => {
              onRemove();
              router.popCurrent();
            }}
          />
          <Button
            title="Save"
            onPress={() => {
              onUpdate({
                ...labour,
                name: labour.name || 'Unnamed labour',
              });
              router.popCurrent();
            }}
          />
        </Stack>
      </Stack>
    </ScrollView>
  );
}

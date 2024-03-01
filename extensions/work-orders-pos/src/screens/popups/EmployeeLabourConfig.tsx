import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { ID } from '@web/schemas/generated/create-work-order.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { CreateWorkOrderCharge } from '../routes.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { SegmentedLabourControl } from '../../components/SegmentedLabourControl.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

export function EmployeeLabourConfig() {
  const [employeeId, setEmployeeId] = useState<ID | null>(null);

  const [labour, setLabour] = useState<DiscriminatedUnionOmit<
    CreateWorkOrderCharge,
    'lineItemUuid' | 'employeeId' | 'chargeUuid'
  > | null>(null);

  const [chargeUuid, setChargeUuid] = useState<string | null>(null);

  const { Screen, closePopup } = useScreen('EmployeeLabourConfig', ({ employeeId, chargeUuid, labour }) => {
    setEmployeeId(employeeId);
    setChargeUuid(chargeUuid);
    setLabour(labour);
  });

  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;
  const employeeQuery = useEmployeeQuery({ fetch, id: employeeId });

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

  return (
    <Screen
      title={employeeQuery?.data?.name ?? 'Employee'}
      isLoading={!chargeUuid || !employeeId || !labour || employeeQuery.isLoading}
      presentation={{ sheet: true }}
    >
      {chargeUuid && employeeId && labour && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={5}>
            <Text variant={'headingLarge'}>{employeeQuery?.data?.name ?? 'Unknown Employee'}</Text>

            <SegmentedLabourControl
              types={['hourly-labour', 'fixed-price-labour']}
              charge={labour}
              onChange={setLabour}
              defaultHourlyRate={employeeQuery?.data?.rate}
            />

            <Stack direction="vertical" flex={1} alignment="flex-end">
              <Button
                title="Remove"
                type="destructive"
                onPress={() => {
                  closePopup({ type: 'remove', chargeUuid });
                }}
              />
              <Button
                title="Save"
                onPress={() => {
                  closePopup({
                    type: 'update',
                    chargeUuid,
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

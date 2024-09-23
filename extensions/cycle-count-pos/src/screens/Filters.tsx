import { useEffect, useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { Button, ScrollView, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../routes.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function Filters({
  status: initialStatus,
  locationId: initialLocationId,
  employeeId: initialEmployeeId,

  onStatusChange,
  onLocationIdChange,
  onEmployeeIdChange,
}: {
  status: string | undefined;
  locationId: ID | undefined;
  employeeId: ID | undefined;

  onStatusChange: (status: string | undefined) => void;
  onLocationIdChange: (locationId: ID | undefined) => void;
  onEmployeeIdChange: (employeeId: ID | undefined) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [locationId, setLocationId] = useState(initialLocationId);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);

  useEffect(() => onStatusChange(status), [status]);
  useEffect(() => onLocationIdChange(locationId), [locationId]);
  useEffect(() => onEmployeeIdChange(employeeId), [employeeId]);

  const activeFilterCount = [status, locationId, employeeId].filter(Boolean).length;

  const fetch = useAuthenticatedFetch();

  const locationQuery = useLocationQuery({ fetch, id: locationId! }, { enabled: !!locationId });
  const location = locationQuery.data;

  const employeeQuery = useEmployeeQuery({ fetch, id: employeeId ?? null });
  const employee = employeeQuery.data;

  const router = useRouter();

  return (
    <ScrollView>
      <ResponsiveGrid columns={1} spacing={2}>
        <ResponsiveStack direction={'horizontal'} alignment={'center'}>
          <Text variant="headingLarge">Filters</Text>
        </ResponsiveStack>

        <ResponsiveGrid columns={2} smColumns={1}>
          <Button
            title={'Filter by status' + (status ? ` (${status})` : '')}
            onPress={() =>
              router.push('StatusSelector', {
                onSelect: setStatus,
                onClear: () => setStatus(undefined),
              })
            }
          />
          <Button
            title={'Location' + (locationId ? `: ${location?.name ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('LocationSelector', {
                onSelect: location => setLocationId(location.id),
                onClear: () => setLocationId(undefined),
              })
            }
          />
          <Button
            title={'Employee' + (employeeId ? `: ${employee?.name ?? 'loading...'}` : '')}
            onPress={() =>
              router.push('EmployeeSelector', {
                onSelect: employee => setEmployeeId(employee.id),
                onClear: () => setEmployeeId(undefined),
              })
            }
          />
        </ResponsiveGrid>

        <Button
          title={'Clear'}
          onPress={() => {
            setStatus(undefined);
            setLocationId(undefined);
            setEmployeeId(undefined);
          }}
          type={'destructive'}
          isDisabled={activeFilterCount === 0}
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}

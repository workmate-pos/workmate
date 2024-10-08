import { useEffect, useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../routes.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { Button, ScrollView, Text } from '@shopify/ui-extensions-react/point-of-sale';

const SORT_MODES = ['name', 'created-date', 'due-date'] as const;
const SORT_ORDERS = ['descending', 'ascending'] as const;

export type SortMode = (typeof SORT_MODES)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export function Filters({
  status: initialStatus,
  locationId: initialLocationId,
  employeeId: initialEmployeeId,
  sortMode: initialSortMode,
  sortOrder: initialSortOrder,

  defaultSortMode,
  defaultSortOrder,

  onStatusChange,
  onLocationIdChange,
  onEmployeeIdChange,
  onSortModeChange,
  onSortOrderChange,
}: {
  status: string | undefined;
  locationId: ID | undefined;
  employeeId: ID | undefined;
  sortMode: SortMode;
  sortOrder: SortOrder;

  defaultSortMode: SortMode;
  defaultSortOrder: SortOrder;

  onStatusChange: (status: string | undefined) => void;
  onLocationIdChange: (locationId: ID | undefined) => void;
  onEmployeeIdChange: (employeeId: ID | undefined) => void;
  onSortModeChange: (sortMode: SortMode) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [locationId, setLocationId] = useState(initialLocationId);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [sortMode, setSortMode] = useState(initialSortMode);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  useEffect(() => onStatusChange(status), [status]);
  useEffect(() => onLocationIdChange(locationId), [locationId]);
  useEffect(() => onEmployeeIdChange(employeeId), [employeeId]);
  useEffect(() => onSortModeChange(sortMode), [sortMode]);
  useEffect(() => onSortOrderChange(sortOrder), [sortOrder]);

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

          <ResponsiveGrid columns={2} smColumns={2} grow>
            <Button
              title={`Sort by ${sentenceCase(sortMode).toLowerCase()}`}
              onPress={() =>
                setSortMode(current => SORT_MODES[(SORT_MODES.indexOf(sortMode) + 1) % SORT_MODES.length] ?? current)
              }
            />
            <Button
              title={sentenceCase(sortOrder)}
              onPress={() =>
                setSortOrder(
                  current => SORT_ORDERS[(SORT_ORDERS.indexOf(sortOrder) + 1) % SORT_ORDERS.length] ?? current,
                )
              }
            />
          </ResponsiveGrid>
        </ResponsiveGrid>

        <Button
          title={'Clear'}
          onPress={() => {
            setStatus(undefined);
            setLocationId(undefined);
            setEmployeeId(undefined);
            setSortMode(defaultSortMode);
            setSortOrder(defaultSortOrder);
          }}
          type={'destructive'}
          isDisabled={activeFilterCount === 0}
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}

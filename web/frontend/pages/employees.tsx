import {
  BlockStack,
  Box,
  Button,
  ChoiceList,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  InlineStack,
  Link,
  Page,
  Select,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useId, useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useEmployeeMutation } from '@work-orders/common/queries/use-employee-mutation.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { ContextualSaveBar, TitleBar } from '@shopify/app-bridge-react';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { NumberField } from '@web/frontend/components/NumberField.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { uniqueBy } from '@teifi-digital/shopify-app-toolbox/array';
import { LocationMajor } from '@shopify/polaris-icons';
import { MultiLocationSelector } from '@web/frontend/components/selectors/MultiLocationSelector.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';

export default function () {
  return (
    <Frame>
      <Page fullWidth>
        <PermissionBoundary permissions={['read_employees', 'read_settings']}>
          <Employees />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Employees() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [role, setRole] = useState<string>();
  const [superuser, setSuperuser] = useState<boolean>();
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);

  const settingsQuery = useSettingsQuery({ fetch });

  const roles = Object.keys(settingsQuery.data?.settings.roles ?? {});
  const franchiseModeEnabled = settingsQuery.data?.settings.franchises.enabled ?? false;
  const shouldShowLocations = franchiseModeEnabled;

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const canWriteEmployees =
    !!currentEmployeeQuery.data?.superuser || currentEmployeeQuery.data?.permissions.includes('write_employees');

  const [lastSavedEmployeeRates, setLastSavedEmployeeRates] = useState<Record<ID, Money | null>>({});
  const [lastSavedEmployeeRoles, setLastSavedEmployeeRoles] = useState<Record<ID, string>>({});
  const [lastSavedEmployeeSuperuser, setLastSavedEmployeeSuperuser] = useState<Record<ID, boolean>>({});
  const [lastSavedEmployeeLocationIds, setLastSavedEmployeeLocationIds] = useState<Record<ID, ID[]>>({});

  const [employeeRates, setEmployeeRates] = useState<Record<ID, Money | null>>({});
  const [employeeRoles, setEmployeeRoles] = useState<Record<ID, string>>({});
  const [employeeSuperuser, setEmployeeSuperuser] = useState<Record<ID, boolean>>({});
  const [employeeLocationIds, setEmployeeLocationIds] = useState<Record<ID, ID[]>>({});

  const hasUnsavedChanges =
    hash(employeeRates) !== hash(lastSavedEmployeeRates) ||
    hash(employeeRoles) !== hash(lastSavedEmployeeRoles) ||
    hash(employeeSuperuser) !== hash(lastSavedEmployeeSuperuser) ||
    hash(employeeLocationIds) !== hash(lastSavedEmployeeLocationIds);

  const employeePageSize = 50;
  const employeesQuery = useEmployeesQuery({ fetch, params: { first: employeePageSize, query, role, superuser } });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, employeesQuery);
  const page = employeesQuery.data?.pages[pageIndex];

  const employeeMutation = useEmployeeMutation(
    { fetch },
    {
      onSuccess() {
        setLastSavedEmployeeRates(employeeRates);
        setLastSavedEmployeeRoles(employeeRoles);
        setLastSavedEmployeeSuperuser(employeeSuperuser);
        setLastSavedEmployeeLocationIds(employeeLocationIds);
        setToastAction({ content: 'Saved employees!' });
      },
      onError() {
        setToastAction({ content: 'Error while saving' });
      },
    },
  );

  const currencyFormatter = useCurrencyFormatter({ fetch });

  const [locationModalEmployeeId, setLocationModalEmployeeId] = useState<ID>();
  const allTabId = useId();
  const superuserTabId = useId();

  return (
    <>
      <ContextualSaveBar
        visible={hasUnsavedChanges}
        saveAction={{
          onAction: () => {
            const relevantEmployeeIds = new Set([
              ...Object.keys(employeeRates),
              ...Object.keys(employeeRoles),
              ...Object.keys(employeeSuperuser),
              ...Object.keys(employeeLocationIds),
            ]);

            const relevantEmployees = employeesQuery.data?.pages
              .flat(1)
              .filter(employee => relevantEmployeeIds.has(employee.id));

            if (!relevantEmployees) {
              return;
            }

            employeeMutation.mutate({
              employees: relevantEmployees.map(employee => ({
                staffMemberId: employee.id,
                role: employeeRoles[employee.id] ?? employee.role,
                rate:
                  employee.id in employeeRates
                    ? (employeeRates[employee.id] ?? null)
                    : employee.isDefaultRate
                      ? null
                      : employee.rate,
                superuser: employeeSuperuser[employee.id] ?? employee.superuser,
                locationIds: employeeLocationIds[employee.id] ?? employee.locationIds,
              })),
            });
          },
          loading: employeeMutation.isPending,
          disabled: employeeMutation.isPending || !canWriteEmployees || !employeesQuery.data,
        }}
        discardAction={{
          onAction: () => {
            setEmployeeRates(lastSavedEmployeeRates);
            setEmployeeRoles(lastSavedEmployeeRoles);
            setEmployeeSuperuser(lastSavedEmployeeSuperuser);
            setEmployeeLocationIds(lastSavedEmployeeLocationIds);
          },
        }}
      />

      <TitleBar title="Employees" />

      <BlockStack gap="800">
        <Text as="p" variant="bodyLg">
          Employee permissions are restricted using a role-based system. Roles and their permissions can be configured
          through the <Link url="/settings?tab=Roles">settings page</Link>.
        </Text>

        <Box>
          <IndexFilters
            mode={mode}
            setMode={setMode}
            filters={[]}
            selected={
              typeof role !== 'string'
                ? superuser
                  ? 1
                  : 0
                : 2 + Object.keys(settingsQuery.data?.settings.roles ?? {}).indexOf(role)
            }
            tabs={[
              {
                id: allTabId,
                content: 'All',
                selected: role === undefined,
                onAction: () => {
                  setRole(undefined);
                  setSuperuser(undefined);
                },
              },
              {
                id: superuserTabId,
                content: 'Superuser',
                selected: superuser,
                onAction: () => {
                  setRole(undefined);
                  setSuperuser(true);
                },
              },
              ...(settingsQuery.isSuccess
                ? Object.keys(settingsQuery.data.settings.roles).map(name => ({
                    id: name,
                    content: name,
                    selected: role === name,
                    onAction: () => {
                      // this is not called if the tab is in the "More views" dropdown. polaris bug ?
                      setRole(name);
                      setSuperuser(false);
                    },
                  }))
                : []),
            ]}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => {
              setQuery('', true);
              setRole(undefined);
            }}
            queryValue={optimisticQuery}
            queryPlaceholder={'Search employees'}
            canCreateNewView={false}
          />

          <IndexTable
            headings={[
              { title: 'Employee' },
              { title: 'Hourly Rate' },
              { title: 'Role' },
              ...(shouldShowLocations ? [{ title: 'Locations' }] : []),
            ]}
            itemCount={employeesQuery.isLoading ? employeePageSize : (page?.length ?? 0)}
            loading={employeesQuery.isLoading || settingsQuery.isLoading}
            hasMoreItems={employeesQuery.hasNextPage}
            selectable={false}
            pagination={{
              hasNext: pagination.hasNextPage,
              onNext: pagination.next,
              hasPrevious: pagination.hasPreviousPage,
              onPrevious: pagination.previous,
            }}
            resourceName={{ singular: 'employee', plural: 'employees' }}
          >
            {!page &&
              Array.from({ length: employeePageSize }).map((_, i) => (
                <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
                  <IndexTable.Cell>
                    <SkeletonBodyText lines={1} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <NumberField type="number" label="Rate" labelHidden autoComplete="off" decimals={2} disabled />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Select label={'Role'} labelHidden disabled />
                  </IndexTable.Cell>
                  {shouldShowLocations && (
                    <IndexTable.Cell>
                      <Button icon={LocationMajor} variant="plain" disabled>
                        0 locations
                      </Button>
                    </IndexTable.Cell>
                  )}
                </IndexTable.Row>
              ))}

            {page?.map((employee, i) => (
              <IndexTable.Row key={employee.id} id="employee-id" position={i}>
                <IndexTable.Cell>{employee.name}</IndexTable.Cell>
                <IndexTable.Cell>
                  <NumberField
                    type={'number'}
                    decimals={2}
                    min={0.01}
                    step={0.01}
                    largeStep={1}
                    inputMode={'decimal'}
                    label={'Rate'}
                    labelHidden
                    value={employeeRates[employee.id]?.toString()}
                    onChange={value => {
                      if (value.trim().length === 0) {
                        setEmployeeRates({ ...employeeRates, [employee.id]: null });
                        return;
                      }

                      if (BigDecimal.isValid(value)) {
                        setEmployeeRates({ ...employeeRates, [employee.id]: BigDecimal.fromString(value).toMoney() });
                      }
                    }}
                    prefix={currencyFormatter.prefix}
                    suffix={currencyFormatter.suffix}
                    autoComplete={'off'}
                    disabled={!canWriteEmployees}
                    placeholder={settingsQuery.data?.settings.defaultRate}
                  />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Select
                    label={'Role'}
                    labelHidden
                    value={
                      (employeeSuperuser[employee.id] ?? employee.superuser)
                        ? 'this-is-superuser-xd'
                        : (employeeRoles[employee.id] ?? employee.role)
                    }
                    disabled={!canWriteEmployees}
                    requiredIndicator
                    options={[
                      ...uniqueBy(
                        [
                          {
                            label: employee.role,
                            value: employee.role,
                            disabled: !roles.includes(employee.role),
                          },
                          ...roles.map(role => ({
                            label: role,
                            value: role,
                          })),
                        ],
                        role => role.value,
                      ),
                      {
                        title: 'Danger Zone',
                        options: [
                          {
                            label: 'Superuser',
                            value: 'this-is-superuser-xd',
                          },
                        ],
                      },
                    ]}
                    onChange={role => {
                      if (role === 'this-is-superuser-xd') {
                        setEmployeeSuperuser(current => ({ ...current, [employee.id]: true }));
                        return;
                      }

                      setEmployeeSuperuser(current => ({ ...current, [employee.id]: false }));
                      setEmployeeRoles(current => ({ ...current, [employee.id]: role }));
                    }}
                  />
                </IndexTable.Cell>
                {shouldShowLocations && (
                  <IndexTable.Cell>
                    <InlineStack>
                      <Button
                        icon={LocationMajor}
                        variant="plain"
                        disabled={!canWriteEmployees}
                        onClick={() => setLocationModalEmployeeId(employee.id)}
                      >
                        {String(employeeLocationIds[employee.id]?.length ?? employee.locationIds.length)} locations
                      </Button>
                    </InlineStack>
                  </IndexTable.Cell>
                )}
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Box>
      </BlockStack>

      <MultiLocationSelector
        open={!!locationModalEmployeeId}
        onClose={() => setLocationModalEmployeeId(undefined)}
        selected={
          locationModalEmployeeId
            ? (employeeLocationIds[locationModalEmployeeId] ??
              page?.find(employee => employee.id === locationModalEmployeeId)?.locationIds ??
              [])
            : []
        }
        onChange={locationIds => {
          if (!locationModalEmployeeId) {
            return;
          }

          setEmployeeLocationIds(current => ({
            ...current,
            [locationModalEmployeeId]: locationIds,
          }));
        }}
      />

      {toast}
    </>
  );
}

function hash(obj: object): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

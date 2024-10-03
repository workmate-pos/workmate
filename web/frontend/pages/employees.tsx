import {
  BlockStack,
  Frame,
  IndexTable,
  Link,
  Page,
  Select,
  SkeletonBodyText,
  SkeletonDisplayText,
  Text,
} from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { EmployeeWithDatabaseInfo } from '@web/controllers/api/employee.js';
import { useEffect, useState } from 'react';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { useEmployeeMutation } from '@work-orders/common/queries/use-employee-mutation.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { ContextualSaveBar, TitleBar } from '@shopify/app-bridge-react';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { NumberField } from '@web/frontend/components/NumberField.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export default function () {
  return (
    <Frame>
      <Page>
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

  const settingsQuery = useSettingsQuery({ fetch });

  const roles = Object.keys(settingsQuery.data?.settings.roles ?? {});

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const canWriteEmployees =
    currentEmployeeQuery.data?.superuser ?? currentEmployeeQuery.data?.permissions.includes('write_employees');

  const [employeeRates, setEmployeeRates] = useState<Record<ID, Money | null>>({});
  const [employeeRoles, setEmployeeRoles] = useState<Record<ID, string>>({});
  const [employeeSuperuser, setEmployeeSuperuser] = useState<Record<ID, boolean>>({});

  const employeePageSize = 50;
  const employeesQuery = useEmployeesQuery({ fetch, params: { first: employeePageSize } });

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, employeesQuery);
  const page = employeesQuery.data?.pages[pageIndex];

  const employeeMutation = useEmployeeMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({ content: 'Saved employees!' });
      },
      onError() {
        setToastAction({ content: 'Error while saving' });
      },
    },
  );

  const currencyFormatter = useCurrencyFormatter({ fetch });

  // TODO: Contextual save bar

  return (
    <>
      <ContextualSaveBar
        visible={
          Object.keys(employeeRates).length > 0 ||
          Object.keys(employeeRoles).length > 0 ||
          Object.keys(employeeSuperuser).length > 0
        }
        saveAction={{
          onAction: () => {
            const relevantEmployeeIds = new Set([
              ...Object.keys(employeeRates),
              ...Object.keys(employeeRoles),
              ...Object.keys(employeeSuperuser),
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
              })),
            });
          },
          loading: employeeMutation.isPending,
          disabled: employeeMutation.isPending || !canWriteEmployees || !employeesQuery.data,
        }}
        discardAction={{
          onAction: () => {
            setEmployeeRates({});
            setEmployeeRoles({});
            setEmployeeSuperuser({});
          },
        }}
      />

      <TitleBar title="Employees" />

      <BlockStack gap="800">
        <Text as="p" variant="bodyLg">
          Employee permissions are restricted using a role-based system. Roles and their permissions can be configured
          through the <Link url="/settings">settings page</Link>.
        </Text>

        <IndexTable
          headings={[{ title: 'Employee' }, { title: 'Hourly Rate' }, { title: 'Role' }]}
          itemCount={employeesQuery.isLoading ? employeePageSize : (page?.length ?? 0)}
          loading={employeesQuery.isLoading || settingsQuery.isLoading}
          hasMoreItems={employeesQuery.hasNextPage}
          selectable={false}
          pagination={{
            hasNext: employeesQuery.hasNextPage,
            onNext: employeesQuery.fetchNextPage,
            hasPrevious: employeesQuery.hasPreviousPage,
            onPrevious: employeesQuery.fetchPreviousPage,
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
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Select label={'Role'} labelHidden disabled />
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}

          {page?.map((employee, i) => (
            <IndexTable.Row key={employee.id} id="employee-id" position={i}>
              <IndexTable.Cell>{employee.name}</IndexTable.Cell>
              <IndexTable.Cell>
                <NumberField
                  variant={'borderless'}
                  type={'number'}
                  decimals={2}
                  min={0.01}
                  step={0.01}
                  largeStep={1}
                  inputMode={'decimal'}
                  label={'Rate'}
                  labelHidden={true}
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
                  options={[
                    ...roles.map(role => ({
                      label: role,
                      value: role,
                    })),
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
                    console.log(role, employeeRoles, employeeSuperuser);

                    if (role === 'this-is-superuser-xd') {
                      setEmployeeSuperuser(current => ({ ...current, [employee.id]: true }));
                      return;
                    }

                    setEmployeeSuperuser(current => ({ ...current, [employee.id]: false }));
                    setEmployeeRoles(current => ({ ...current, [employee.id]: role }));
                  }}
                />
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </BlockStack>

      {toast}
    </>
  );
}

import { Frame, IndexTable, Page, SkeletonBodyText } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { NumberField } from '../components/NumberField.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useEmployeeMutation } from '@work-orders/common/queries/use-employee-mutation.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Int } from '@web/schemas/generated/pagination-options.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_employees', 'read_settings']}>
          <EmployeeRates />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function EmployeeRates() {
  const [toast, setToastAction] = useToast();

  const [employeeRates, setEmployeeRates] = useState<Record<ID, Money | null>>({});

  const fetch = useAuthenticatedFetch({ setToastAction });
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const superuser = currentEmployeeQuery.data?.superuser ?? false;
  const canWriteEmployees = superuser || !!currentEmployeeQuery?.data?.permissions?.includes('write_employees');

  const employeePageSize = 20 as Int;
  const [pageIndex, setPageIndex] = useState(0);
  const employeesQuery = useEmployeesQuery({
    fetch,
    params: { first: employeePageSize },
    options: {
      onSuccess(data) {
        // when a new page is loaded, add those employees to the permissions state if they don't already exist

        const employees = data.pages.flat(1);
        const employeePermissions = Object.fromEntries(
          employees.map(employee => [employee.id, employee.isDefaultRate ? null : employee.rate]),
        );

        setEmployeeRates(ep => ({ ...employeePermissions, ...ep }));
      },
    },
  });

  const employeeMutation = useEmployeeMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({
          content: 'Saved rates',
        });
      },
      onError() {
        setToastAction({
          content: 'An error occurred while saving rates',
        });
      },
    },
  );

  const settingsQuery = useSettingsQuery({ fetch });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const currentPage = employeesQuery.data?.pages[pageIndex];

  return (
    <>
      <TitleBar
        title={'Employee Rates'}
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: employeeMutation.isLoading,
          disabled: employeeMutation.isLoading || !canWriteEmployees,
          onAction() {
            employeeMutation.mutate({
              employees:
                employeesQuery.data?.pages.flatMap(employees =>
                  employees.map(employee => ({
                    employeeId: employee.id,
                    permissions: employee.permissions ?? [],
                    superuser: employee.superuser ?? false,
                    rate: employeeRates[employee.id] ?? null,
                  })),
                ) ?? [],
            });
          },
        }}
      />

      <IndexTable
        headings={[{ title: 'Employee' }, { title: 'Hourly Rate' }]}
        itemCount={employeesQuery.data?.pages.length ?? 0}
        loading={employeesQuery.isLoading}
        hasMoreItems={employeesQuery.hasNextPage}
        selectable={false}
        pagination={{
          hasNext: pageIndex < (employeesQuery.data?.pages?.length ?? 0) - 1 || employeesQuery.hasNextPage,
          onNext: () => {
            if (pageIndex === (employeesQuery.data?.pages?.length ?? 0) - 1) {
              employeesQuery.fetchNextPage();
            }

            setPageIndex(pageIndex + 1);
          },
          hasPrevious: pageIndex > 0,
          onPrevious: () => setPageIndex(pageIndex - 1),
        }}
      >
        {!currentPage &&
          Array.from({ length: employeePageSize }).map((_, i) => (
            <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
              <IndexTable.Cell>
                <SkeletonBodyText lines={1} />
              </IndexTable.Cell>
              <IndexTable.Cell flush={true}>
                <NumberField
                  label={'Rate'}
                  labelHidden
                  autoComplete={'off'}
                  variant={'borderless'}
                  disabled
                  decimals={2}
                />
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}

        {currentPage?.map((employee, i) => {
          return (
            <IndexTable.Row key={employee.id} id={employee.id} selected={false} position={i}>
              <IndexTable.Cell>{employee.name || 'Unnamed employee'}</IndexTable.Cell>
              <IndexTable.Cell flush={true}>
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
                  value={employeeRates[employee.id] ? String(employeeRates[employee.id]!) : undefined}
                  onChange={value => {
                    if (value.trim().length === 0) {
                      setEmployeeRates({ ...employeeRates, [employee.id]: null });
                      return;
                    }

                    if (BigDecimal.isValid(value)) {
                      setEmployeeRates({ ...employeeRates, [employee.id]: BigDecimal.fromString(value).toMoney() });
                      return;
                    }
                  }}
                  prefix={currencyFormatter.prefix}
                  suffix={currencyFormatter.suffix}
                  autoComplete={'off'}
                  disabled={!canWriteEmployees}
                  placeholder={settingsQuery.data?.settings.defaultRate}
                />
              </IndexTable.Cell>
            </IndexTable.Row>
          );
        })}
      </IndexTable>
      {toast}
    </>
  );
}

import { Frame, IndexTable, Page } from '@shopify/polaris';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
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

  const employeesQuery = useEmployeesQuery({
    fetch,
    params: {},
    options: {
      onSuccess(data) {
        setEmployeeRates(
          Object.fromEntries(
            data.pages.filter(employee => !employee.isDefaultRate).map(employee => [employee.id, employee.rate]),
          ),
        );
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

  if (!employeesQuery.data) {
    return <Loading />;
  }

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
              employees: employeesQuery.data.pages.map(employee => ({
                employeeId: employee.id,
                permissions: employee.permissions ?? [],
                superuser: employee.superuser ?? false,
                rate: employeeRates[employee.id] ?? null,
              })),
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
      >
        {employeesQuery.data?.pages.map((employee, i) => {
          return (
            <IndexTable.Row key={employee.id} id={employee.id} selected={false} position={i}>
              <IndexTable.Cell>{employee.name}</IndexTable.Cell>
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

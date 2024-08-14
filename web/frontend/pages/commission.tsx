import { Frame, IndexTable, Page, SkeletonBodyText } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { NumberField } from '../components/NumberField.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { BigDecimal, Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PermissionBoundary } from '../components/PermissionBoundary.js';
import { Int } from '@web/schemas/generated/pagination-options.js';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';

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

  const [employeeCommission, setEmployeeCommission] = useState<Record<ID, Decimal | null>>({});

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
          employees.map(employee => [employee.id, determineDefaultCommissionRate(employee.name)]),
        );

        setEmployeeCommission(ep => ({
          ...employeePermissions,
          ...ep,
        }));
      },
    },
  });

  const currentPage = employeesQuery.data?.pages[pageIndex];

  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <TitleBar
        title={'Employee Commission Rates'}
        primaryAction={{
          content: 'Save',
          target: 'APP',
          disabled: !canWriteEmployees,
          loading: isLoading,
          async onAction() {
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsLoading(false);
            setToastAction({
              content: 'Saved employee commission',
            });
          },
        }}
      />

      <IndexTable
        headings={[{ title: 'Employee' }, { title: 'Commission' }]}
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
                  label={'Commission'}
                  labelHidden
                  autoComplete={'off'}
                  variant={'borderless'}
                  disabled
                  decimals={1}
                />
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}

        {currentPage?.map((employee, i) => {
          return (
            <IndexTable.Row key={employee.id} id={employee.id} selected={false} position={i}>
              <IndexTable.Cell>{employee.name || 'Unnamed employee'}</IndexTable.Cell>
              <IndexTable.Cell>
                <NumberField
                  variant={'borderless'}
                  type={'number'}
                  decimals={1}
                  min={0}
                  max={100}
                  step={0.1}
                  largeStep={1}
                  inputMode={'decimal'}
                  label={'Rate'}
                  labelHidden={true}
                  value={employeeCommission[employee.id] ? String(employeeCommission[employee.id]) : undefined}
                  onChange={value => {
                    if (value.trim().length === 0) {
                      setEmployeeCommission({ ...employeeCommission, [employee.id]: null });
                      return;
                    }

                    if (BigDecimal.isValid(value)) {
                      setEmployeeCommission({
                        ...employeeCommission,
                        [employee.id]: BigDecimal.max(
                          BigDecimal.ZERO,
                          BigDecimal.min(BigDecimal.fromString('100'), BigDecimal.fromString(value)),
                        ).toMoney(),
                      });
                    }
                  }}
                  suffix={'%'}
                  autoComplete={'off'}
                  disabled={!canWriteEmployees}
                  placeholder={'0.0'}
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

// algorithm to determine a commission rate based on a rate.
// just for display purposes.
function determineDefaultCommissionRate(name: string) {
  function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  const hashValue = hashString(name);
  const commissionRate = Math.abs(hashValue) % 16;

  return commissionRate;
}

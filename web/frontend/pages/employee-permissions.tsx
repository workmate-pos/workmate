import { Checkbox, Frame, IndexTable, Page } from '@shopify/polaris';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useEmployeeMutation } from '@work-orders/common/queries/use-employee-mutation.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';

import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_employees']}>
          <EmployeePermissions />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function EmployeePermissions() {
  const [toast, setToastAction] = useToast();

  const [employeePermissions, setEmployeePermissions] = useState<
    Record<ID, { superuser: boolean; permissions: string[] }>
  >({});

  const fetch = useAuthenticatedFetch({ setToastAction });
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const superuser = currentEmployeeQuery.data?.superuser ?? false;
  const permissions = currentEmployeeQuery.data?.permissions ?? [];
  const canWriteEmployees = superuser || permissions.includes('write_employees');

  const employeesQuery = useEmployeesQuery({
    fetch,
    params: {},
    options: {
      refetchOnWindowFocus: false,
      onSuccess(data) {
        setEmployeePermissions(
          Object.fromEntries(
            data.pages.map(employee => [
              employee.id,
              { superuser: employee.superuser ?? false, permissions: employee.permissions ?? [] },
            ]),
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
          content: 'Saved permissions',
        });
      },
      onError() {
        setToastAction({
          content: 'An error occurred while saving permissions',
        });
      },
    },
  );

  // TODO: Save on changes
  // useEffect(() => {
  //   if (!employeesQuery.data) return;
  //
  //   employeeMutation.mutate({
  //     employees: employeesQuery.data.pages.map(employee => ({
  //       employeeId: employee.id,
  //       permissions: employeePermissions[employee.id]?.permissions ?? [],
  //       superuser: employeePermissions[employee.id]?.superuser ?? false,
  //       rate: employee.rate,
  //     })),
  //   });
  // }, [JSON.stringify(employeePermissions)]);

  if (!employeesQuery.data) {
    return <Loading />;
  }

  const permissionNodes = [
    'read_settings',
    'write_settings',
    'read_employees',
    'write_employees',
    'read_work_orders',
    'write_work_orders',
    'read_app_plan',
    'write_app_plan',
    'read_purchase_orders',
    'write_purchase_orders',
  ] as const satisfies readonly PermissionNode[];

  return (
    <>
      <TitleBar
        title={'Employee Permissions'}
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: employeeMutation.isLoading,
          disabled: employeeMutation.isLoading || !canWriteEmployees,
          onAction() {
            employeeMutation.mutate({
              employees: employeesQuery.data.pages.map(employee => ({
                employeeId: employee.id,
                permissions: employeePermissions[employee.id]?.permissions ?? [],
                superuser: employeePermissions[employee.id]?.superuser ?? false,
                rate: employee.isDefaultRate ? null : employee.rate,
              })),
            });
          },
        }}
      />

      <IndexTable
        headings={[{ title: 'Employee' }, { title: 'superuser' }, ...permissionNodes.map(p => ({ title: p }))]}
        itemCount={employeesQuery.data?.pages.length ?? 0}
        loading={employeesQuery.isLoading}
        hasMoreItems={employeesQuery.hasNextPage}
        selectable={false}
      >
        {employeesQuery.data?.pages.map((employee, i) => {
          const e = employeePermissions[employee.id];

          return (
            <IndexTable.Row key={employee.id} id={employee.id} selected={false} position={i}>
              <IndexTable.Cell>{employee.name}</IndexTable.Cell>
              <IndexTable.Cell>
                <Checkbox
                  label={'superuser'}
                  labelHidden
                  checked={e?.superuser}
                  disabled={!e}
                  onChange={value =>
                    setEmployeePermissions(ep => ({
                      ...ep,
                      [employee.id]: {
                        superuser: value,
                        permissions: ep[employee.id]?.permissions ?? [],
                      },
                    }))
                  }
                />
              </IndexTable.Cell>
              {permissionNodes.map(p => {
                const superuser = e?.superuser ?? false;
                const permissions = e?.permissions ?? [];

                return (
                  <IndexTable.Cell key={p}>
                    <Checkbox
                      label={p}
                      labelHidden
                      checked={superuser || permissions?.includes(p) || false}
                      disabled={superuser || !e}
                      onChange={value => {
                        setEmployeePermissions(ep => ({
                          ...ep,
                          [employee.id]: {
                            superuser,
                            permissions: permissionNodes.filter(p2 => (p === p2 ? value : permissions.includes(p2))),
                          },
                        }));
                      }}
                    />
                  </IndexTable.Cell>
                );
              })}
            </IndexTable.Row>
          );
        })}
      </IndexTable>
      {toast}
    </>
  );
}

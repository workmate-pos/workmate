import { Frame, IndexTable, Page, SkeletonBodyText, Text } from '@shopify/polaris';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import { useEmployeesQuery } from '../queries/use-employees-query';
import { useEmployeeRateQueries } from '../queries/use-employee-rate-queries';
import { useCurrencyFormatter } from '@common/hooks/use-currency-formatter';
import { useSettingsQuery } from '@common/queries/use-settings-query';
import { NumberField } from '../components/NumberField';
import { useState } from 'react';
import { useEmployeeRatesMutation } from '../queries/use-employee-rates-mutation';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export default function Rates() {
  const [toast, setToastAction] = useToast();

  const [employeeRates, setEmployeeRates] = useState<Record<string, number | null>>({});

  const fetch = useAuthenticatedFetch({ setToastAction });
  const employeesQuery = useEmployeesQuery({ fetch, params: {} });
  const employeeIds = employeesQuery.data?.pages.map(employee => employee.id) ?? [];
  const employeeRateQueries = useEmployeeRateQueries(employeeIds, {
    refetchOnWindowFocus: false,
    onSuccess(data) {
      setEmployeeRates(prev => ({
        ...prev,
        [data.id]: data.rate,
      }));
    },
  });
  const employeeRatesMutation = useEmployeeRatesMutation({
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
  });
  const settingsQuery = useSettingsQuery({ fetch });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  if (!employeesQuery.data) {
    return (
      <Frame>
        <Page>
          <Loading />
        </Page>
      </Frame>
    );
  }

  return (
    <Frame>
      <Page>
        <TitleBar
          title={'Rates'}
          primaryAction={{
            content: 'Save',
            target: 'APP',
            loading: employeeRatesMutation.isLoading,
            disabled: employeeRatesMutation.isLoading,
            onAction() {
              employeeRatesMutation.mutate(employeeRates);
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
            const query = employeeRateQueries[employee.id];

            return (
              <IndexTable.Row key={employee.id} id={employee.id} selected={false} position={i}>
                <IndexTable.Cell>{employee.name}</IndexTable.Cell>
                <IndexTable.Cell flush={true}>
                  {(query?.isLoading ?? true) && <SkeletonBodyText lines={1} />}
                  {query?.isSuccess && (
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
                      value={employeeRates[employee.id] ? String(employeeRates[employee.id]) : undefined}
                      onChange={value =>
                        setEmployeeRates({ ...employeeRates, [employee.id]: value ? Number(value) : null })
                      }
                      prefix={currencyFormatter.prefix}
                      suffix={currencyFormatter.suffix}
                      autoComplete={'off'}
                      placeholder={settingsQuery.data?.settings.defaultRate?.toFixed(2)}
                    />
                  )}
                  {query?.isError && (
                    <Text as={'p'} tone={'critical'}>
                      Something went wrong
                    </Text>
                  )}
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
      </Page>
      {toast}
    </Frame>
  );
}

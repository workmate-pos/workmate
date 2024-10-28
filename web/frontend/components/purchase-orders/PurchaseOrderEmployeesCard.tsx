import { CreatePurchaseOrder } from '../../../schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { BlockStack, Button, Card, InlineStack, ResourceList, SkeletonBodyText, Text } from '@shopify/polaris';

export function PurchaseOrderEmployeesCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onAssignEmployeesClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onAssignEmployeesClick: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const assignedEmployeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);
  const employeeQueries = useEmployeeQueries({ fetch, ids: assignedEmployeeIds });

  return (
    <>
      <Card>
        <BlockStack gap={'400'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            Employees
          </Text>

          {createPurchaseOrder.employeeAssignments.some(employee => employeeQueries[employee.employeeId]?.isLoading) ? (
            <SkeletonBodyText lines={4} />
          ) : (
            <>
              <ResourceList
                items={createPurchaseOrder.employeeAssignments}
                renderItem={employee => {
                  const query = employeeQueries[employee.employeeId];

                  return (
                    <InlineStack gap={'200'} align={'space-between'}>
                      <Text as={'p'}>{query?.data?.name ?? 'Unknown employee'}</Text>
                      <Button
                        variant={'plain'}
                        tone={'critical'}
                        onClick={() =>
                          dispatch.setPartial({
                            employeeAssignments: createPurchaseOrder.employeeAssignments.filter(
                              e => e.employeeId !== employee.employeeId,
                            ),
                          })
                        }
                        disabled={disabled}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  );
                }}
              />
              <Button onClick={onAssignEmployeesClick} disabled={disabled}>
                Assign employees
              </Button>
            </>
          )}
        </BlockStack>
      </Card>

      {toast}
    </>
  );
}

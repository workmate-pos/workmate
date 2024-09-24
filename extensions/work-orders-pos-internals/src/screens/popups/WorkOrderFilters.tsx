import { Button, ScrollView, Selectable, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useRouter } from '../../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';
import { PaymentStatus, PurchaseOrderStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { OverdueStatus } from '@work-orders/common/queries/use-work-order-info-query.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { getCustomFieldFilterText } from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export type WorkOrderFiltersObj = {
  status?: string;
  customerId?: ID;
  employeeIds: ID[];
  paymentStatus?: PaymentStatus;
  overdueStatus?: OverdueStatus;
  purchaseOrderStatus?: PurchaseOrderStatus;
  customFieldFilters: CustomFieldFilter[];
};

export function WorkOrderFilters({
  filters: initialFilters,
  onChange,
}: {
  filters: WorkOrderFiltersObj;
  onChange: Dispatch<SetStateAction<WorkOrderFiltersObj>>;
}) {
  const [filters, _setFilters] = useState<WorkOrderFiltersObj>(initialFilters);

  const setFilters: Dispatch<SetStateAction<WorkOrderFiltersObj>> = arg => {
    let newFilters;

    if (typeof arg === 'function') {
      newFilters = arg(filters);
    } else {
      newFilters = arg;
    }

    _setFilters(newFilters);
    onChange(newFilters);
  };

  const { status, paymentStatus, purchaseOrderStatus, overdueStatus, employeeIds, customFieldFilters, customerId } =
    filters;

  const router = useRouter();

  return (
    <ScrollView>
      <ResponsiveStack direction={'horizontal'} flexWrap={'wrap'} sm={{ direction: 'vertical', flexWrap: undefined }}>
        <Button
          title={'Filter status'}
          type={'plain'}
          onPress={() =>
            router.push('StatusSelector', {
              onSelect: status => setFilters(f => ({ ...f, status })),
            })
          }
        />
        <Button
          title={'Filter payment status'}
          type={'plain'}
          onPress={() =>
            router.push('PaymentStatusSelector', {
              onSelect: status => setFilters(f => ({ ...f, paymentStatus: status })),
            })
          }
        />
        <Button
          title={'Filter overdue status'}
          type={'plain'}
          onPress={() =>
            router.push('OverdueStatusSelector', {
              onSelect: status => setFilters(f => ({ ...f, overdueStatus: status })),
            })
          }
        />
        <Button
          title={'Filter purchase order status'}
          type={'plain'}
          onPress={() =>
            router.push('PurchaseOrderFilterStatusSelector', {
              onSelect: status => setFilters(f => ({ ...f, purchaseOrderStatus: status })),
            })
          }
        />
        <Button
          title={'Filter customer'}
          type={'plain'}
          onPress={() =>
            router.push('CustomerSelector', {
              onSelect: customer => setFilters(f => ({ ...f, customerId: customer.id })),
            })
          }
        />
        <Button
          title={'Filter employees'}
          type={'plain'}
          onPress={() =>
            router.push('MultiEmployeeSelector', {
              initialSelection: employeeIds,
              onSelect: employees => setFilters(f => ({ ...f, employeeIds: employees.map(e => e.id) })),
            })
          }
        />
        <Button
          title={'Filter custom fields'}
          type={'plain'}
          onPress={() =>
            router.push('CustomFieldFilterConfig', {
              onSave: customFieldFilters => setFilters(f => ({ ...f, customFieldFilters })),
              initialFilters: customFieldFilters,
            })
          }
        />
      </ResponsiveStack>
      <ResponsiveStack direction={'horizontal'} flexWrap={'wrap'} sm={{ direction: 'vertical', flexWrap: undefined }}>
        {status && (
          <Selectable onPress={() => setFilters(f => ({ ...f, status: undefined }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear status</Text>
            </Stack>
          </Selectable>
        )}
        {paymentStatus && (
          <Selectable onPress={() => setFilters(f => ({ ...f, paymentStatus: undefined }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear payment status</Text>
            </Stack>
          </Selectable>
        )}
        {overdueStatus && (
          <Selectable onPress={() => setFilters(f => ({ ...f, overdueStatus: undefined }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear overdue status</Text>
            </Stack>
          </Selectable>
        )}
        {purchaseOrderStatus && (
          <Selectable onPress={() => setFilters(f => ({ ...f, purchaseOrderStatus: undefined }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear purchase order status</Text>
            </Stack>
          </Selectable>
        )}
        {customerId && (
          <Selectable onPress={() => setFilters(f => ({ ...f, customerId: undefined }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear customer</Text>
            </Stack>
          </Selectable>
        )}
        {employeeIds.length > 0 && (
          <Selectable onPress={() => setFilters(f => ({ ...f, employeeIds: [] }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear employees</Text>
            </Stack>
          </Selectable>
        )}
        {customFieldFilters.length > 0 && (
          <Selectable onPress={() => setFilters(f => ({ ...f, customFieldFilters: [] }))}>
            <Stack direction="horizontal" spacing={2} alignment={'center'} paddingVertical={'ExtraLarge'}>
              <Text color={'TextCritical'}>Clear custom fields</Text>
            </Stack>
          </Selectable>
        )}
      </ResponsiveStack>
      <WorkOrderFiltersDisplay filters={filters} />
    </ScrollView>
  );
}

export function WorkOrderFiltersDisplay({ filters }: { filters: WorkOrderFiltersObj }) {
  const { status, paymentStatus, purchaseOrderStatus, overdueStatus, customerId, customFieldFilters, employeeIds } =
    filters;

  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });
  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });

  const data: ([string, string] | null)[] = [
    status ? ['Status', titleCase(status)] : null,
    paymentStatus ? ['Payment Status', titleCase(paymentStatus)] : null,
    overdueStatus ? ['Overdue Status', titleCase(overdueStatus)] : null,
    purchaseOrderStatus ? ['Purchase Order Status', titleCase(purchaseOrderStatus)] : null,
    customerId ? ['Customer', customerQuery.data?.displayName ?? 'Unknown customer'] : null,
    employeeIds.length
      ? ['Employees', employeeIds.map(id => employeeQueries[id]?.data?.name ?? 'Unknown employee').join(', ')]
      : null,
    customFieldFilters.length
      ? ['Custom Fields', customFieldFilters.map(f => getCustomFieldFilterText(f)).join(', ')]
      : null,
  ];

  return (
    <ResponsiveGrid columns={1} spacing={1} paddingVertical={'Medium'}>
      {data.filter(isNonNullable).map(([label, value]) => (
        <>
          <Text key={label} variant={'sectionHeader'}>
            {label}:
          </Text>
          <Text key={value} variant={'captionRegular'} color={'TextSubdued'}>
            {value}
          </Text>
        </>
      ))}
    </ResponsiveGrid>
  );
}

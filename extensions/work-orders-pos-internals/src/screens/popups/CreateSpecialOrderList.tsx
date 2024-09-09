import { useForm } from '@teifi-digital/pos-tools/form';
import { UnsourcedItemList, UnsourcedItemListProps } from './UnsourcedItemList.js';
import { useSpecialOrderMutation } from '@work-orders/common/queries/use-special-order-mutation.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { DatePicker, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useState } from 'react';
import { DateTime } from '@web/schemas/generated/create-special-order.js';
import { useRouter } from '../../routes.js';
import { uuid } from '@work-orders/common/util/uuid.js';

export function CreateSpecialOrderList({
  workOrder,
  ...props
}: { workOrder: DetailedWorkOrder } & Omit<UnsourcedItemListProps, 'title' | 'primaryAction'>) {
  const fetch = useAuthenticatedFetch();
  const specialOrderMutation = useSpecialOrderMutation({ fetch });
  const router = useRouter();

  const { Form } = useForm();
  const { session, toast } = useExtensionApi<'pos.home.modal.render'>();

  const [note, setNote] = useState('');
  const [requiredBy, setRequiredBy] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  return (
    <Form disabled={specialOrderMutation.isLoading}>
      <UnsourcedItemList
        title="Create Special Order"
        primaryAction={{
          title: 'Create Special Order',
          allowEmptySelection: false,
          onAction: selectedItems =>
            specialOrderMutation.mutate(
              {
                name: null,
                customerId: workOrder.customerId,
                locationId: createGid('Location', session.currentSession.locationId),
                companyId: workOrder.companyId,
                companyLocationId: workOrder.companyLocationId,
                companyContactId: workOrder.companyContactId,
                note,
                requiredBy: requiredBy ? (requiredBy.toISOString() as DateTime) : null,
                lineItems: selectedItems.map(item => ({
                  uuid: uuid(),
                  shopifyOrderLineItem: {
                    id: item.shopifyOrderLineItem.id,
                    orderId: item.shopifyOrderLineItem.orderId,
                  },
                  quantity: item.quantity,
                  productVariantId: item.productVariantId,
                })),
              },
              {
                onSuccess(specialOrder) {
                  toast.show(`Special order ${specialOrder.name} created!`);
                  router.popCurrent();
                },
              },
            ),
          loading: specialOrderMutation.isLoading,
        }}
        {...props}
      >
        <FormStringField label={'Note'} value={note} type={'area'} onChange={setNote} />

        <FormStringField
          label={'Required By'}
          value={requiredBy?.toLocaleDateString() ?? ''}
          onFocus={() => setIsDatePickerOpen(true)}
          disabled={isDatePickerOpen}
        />

        <DatePicker
          visibleState={[isDatePickerOpen, setIsDatePickerOpen]}
          inputMode={'spinner'}
          selected={requiredBy?.toISOString()}
          onChange={(date: string) => setRequiredBy(new Date(date))}
        />
      </UnsourcedItemList>
    </Form>
  );
}

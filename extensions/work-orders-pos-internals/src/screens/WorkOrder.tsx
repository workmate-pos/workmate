import {
  BadgeProps,
  Banner,
  DateField,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import {
  CreateWorkOrderDispatchProxy,
  WIPCreateWorkOrder,
  useCreateWorkOrderReducer,
} from '../create-work-order/reducer.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { Money } from '@web/services/gql/queries/generated/schema.js';
import { getTotalPriceForCharges } from '../create-work-order/charges.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { useWorkOrderOrders } from '../hooks/use-work-order-orders.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { getPurchaseOrderBadge } from '../util/badges.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';

export type WorkOrderProps = {
  initial: WIPCreateWorkOrder;
};

export function WorkOrder({ initial }: WorkOrderProps) {
  const [createWorkOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreateWorkOrderReducer(initial);

  const router = useRouter();
  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.setTitle(createWorkOrder.name ?? 'New Work Order');
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const fetch = useAuthenticatedFetch();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const saveWorkOrderMutation = useSaveWorkOrderMutation(
    { fetch },
    {
      onMutate() {
        toast.show('Saving work order', { duration: 1000 });
      },
      onError() {
        toast.show('Error saving work order');
      },
      onSuccess(workOrder) {
        dispatch.set(workOrderToCreateWorkOrder(workOrder));
        setHasUnsavedChanges(false);
        router.push('WorkOrderSaved', { workOrder });
      },
    },
  );

  const { Form } = useForm();

  return (
    <ScrollView>
      <Form disabled={saveWorkOrderMutation.isLoading}>
        <ResponsiveStack direction={'vertical'} spacing={2}>
          {saveWorkOrderMutation.error && (
            <Banner
              title={`Error saving work order: ${extractErrorMessage(saveWorkOrderMutation.error)}`}
              variant={'error'}
              visible
            />
          )}

          <WorkOrderProperties createWorkOrder={createWorkOrder} dispatch={dispatch} />
          <WorkOrderCustomFields createWorkOrder={createWorkOrder} dispatch={dispatch} />

          <ResponsiveGrid columns={1}>
            <WorkOrderItems createWorkOrder={createWorkOrder} dispatch={dispatch} />

            <ResponsiveGrid columns={1}>
              <FormStringField
                label={'Note'}
                type={'area'}
                value={createWorkOrder.note}
                onChange={(value: string) => dispatch.setPartial({ note: value })}
              />
              <FormStringField
                label={'Hidden Note'}
                type={'area'}
                value={createWorkOrder.internalNote}
                onChange={(value: string) => dispatch.setPartial({ internalNote: value })}
              />
              <DateField
                label={'Due Date'}
                value={createWorkOrder.dueDate}
                onChange={(date: string) => {
                  // TODO: Do we actually want to convert everything to UTC? (for display we need utc, but we can just do that in value)
                  const dueDate = new Date(date);
                  const dueDateUtc = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60 * 1000);
                  dispatch.setPartial({ dueDate: dueDateUtc.toISOString() as DateTime });
                }}
                disabled={saveWorkOrderMutation.isLoading}
              />
              <WorkOrderMoneySummary createWorkOrder={createWorkOrder} dispatch={dispatch} />
            </ResponsiveGrid>
          </ResponsiveGrid>

          <ResponsiveGrid columns={4} smColumns={2} grow>
            <FormButton
              title={'Manage payments'}
              type={'basic'}
              action={'button'}
              disabled={!createWorkOrder.name || hasUnsavedChanges}
              onPress={() => {
                if (createWorkOrder.name) {
                  router.push('PaymentOverview', {
                    name: createWorkOrder.name,
                  });
                }
              }}
            />

            <FormButton
              title={'Print'}
              type={'basic'}
              action={'button'}
              disabled={!createWorkOrder.name || hasUnsavedChanges}
              onPress={() => {
                if (createWorkOrder.name) {
                  router.push('PrintOverview', {
                    name: createWorkOrder.name,
                  });
                }
              }}
            />

            <FormButton
              title={createWorkOrder.name ? 'Update Work Order' : 'Create Work Order'}
              type="primary"
              action={'submit'}
              disabled={!hasUnsavedChanges}
              loading={saveWorkOrderMutation.isLoading}
              onPress={() => saveWorkOrderMutation.mutate(createWorkOrder)}
            />
          </ResponsiveGrid>

          {!createWorkOrder.name ||
            (hasUnsavedChanges && (
              <Text color="TextSubdued" variant="body">
                You must save your work order before you can manage payments/print
              </Text>
            ))}
        </ResponsiveStack>
      </Form>
    </ScrollView>
  );
}

function WorkOrderProperties({
  createWorkOrder,
  dispatch,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name: createWorkOrder.name });
  const { workOrder } = workOrderQuery.data ?? {};

  const derivedFromOrderQuery = useOrderQuery({ fetch, id: createWorkOrder.derivedFromOrderId });
  const derivedFromOrder = derivedFromOrderQuery.data?.order;

  const customerQuery = useCustomerQuery({ fetch, id: createWorkOrder.customerId });
  const customer = customerQuery.data;

  // TODO: Make Previous Order and Previous Work Orders clickable to view history (wrap in selectable or make it a button?)

  const router = useRouter();

  return (
    <ResponsiveGrid columns={4} grow>
      {createWorkOrder.name && <FormStringField label="Work Order ID" disabled value={createWorkOrder.name} />}
      {createWorkOrder.derivedFromOrderId && (
        <FormStringField
          label="Previous Order"
          disabled
          value={derivedFromOrder ? derivedFromOrder.name : 'Loading...'}
        />
      )}
      {derivedFromOrder && derivedFromOrder.workOrders?.length > 0 && (
        <FormStringField
          label="Previous Work Orders"
          disabled
          value={derivedFromOrder.workOrders.map(workOrder => workOrder.name).join(' • ')}
        />
      )}
      <FormStringField
        label={'Status'}
        required
        onFocus={() => router.push('StatusSelector', { onSelect: status => dispatch.setPartial({ status }) })}
        value={createWorkOrder.status}
      />
      <FormStringField
        label={'Customer'}
        required
        onFocus={() => router.push('CustomerSelector', { onSelect: customerId => dispatch.setPartial({ customerId }) })}
        disabled={workOrder?.orders.some(order => order.type === 'ORDER') ?? false}
        value={
          createWorkOrder.customerId === null
            ? ''
            : customerQuery.isLoading
              ? 'Loading...'
              : customer?.displayName ?? 'Unknown customer'
        }
      />
    </ResponsiveGrid>
  );
}

function WorkOrderItems({
  createWorkOrder,
  dispatch,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const rows = useItemRows(createWorkOrder, dispatch, query);

  return (
    <ResponsiveGrid columns={1}>
      <ResponsiveGrid columns={2}>
        <FormButton
          title="Add Product"
          type="primary"
          action={'button'}
          onPress={() =>
            router.push('ProductSelector', {
              onSelect: ({ item, charges }) => {
                dispatch.updateItemCharges({ item, charges });
                dispatch.addItems({ items: [item] });
              },
            })
          }
        />

        <FormButton
          title="Add Service"
          type="primary"
          action={'button'}
          onPress={() =>
            router.push('ServiceSelector', {
              createWorkOrder,
              onSelect: ({ type, item, charges }) => {
                const createWorkOrderCharges = [...(createWorkOrder.charges ?? []), ...charges];

                dispatch.updateItemCharges({ item, charges });
                dispatch.addItems({ items: [item] });

                if (type === QUANTITY_ADJUSTING_SERVICE) {
                  router.push('ItemChargeConfig', {
                    item,
                    createWorkOrder,
                    initialCharges: createWorkOrderCharges,
                    onRemove: () => dispatch.removeItems({ items: [item] }),
                    onUpdate: charges => dispatch.updateItemCharges({ item, charges }),
                  });
                }
              },
              onAddLabourToItem: item => {
                router.push('ItemChargeConfig', {
                  item,
                  createWorkOrder,
                  initialCharges: createWorkOrder.charges,
                  onRemove: () => dispatch.removeItems({ items: [item] }),
                  onUpdate: charges => dispatch.updateItemCharges({ item, charges }),
                });
              },
            })
          }
        />
      </ResponsiveGrid>

      <ControlledSearchBar placeholder="Search items" value={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length ? (
        <List data={rows} imageDisplayStrategy={'always'}></List>
      ) : (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No products or services added to work order
          </Text>
        </ResponsiveStack>
      )}
    </ResponsiveGrid>
  );
}

function WorkOrderCustomFields({
  createWorkOrder,
  dispatch,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const router = useRouter();

  return (
    <ResponsiveGrid columns={4}>
      {Object.entries(createWorkOrder.customFields).map(([key, value]) => (
        <FormStringField
          key={key}
          label={key}
          value={value}
          onChange={(value: string) =>
            dispatch.setPartial({ customFields: { ...createWorkOrder.customFields, [key]: value } })
          }
        />
      ))}

      <FormButton
        title={'Custom Fields'}
        onPress={() => {
          router.push('CustomFieldConfig', {
            initialCustomFields: createWorkOrder.customFields,
            onSave: customFields => dispatch.setPartial({ customFields }),
            type: 'WORK_ORDER',
          });
        }}
      />
    </ResponsiveGrid>
  );
}

function WorkOrderEmployees({ createWorkOrder }: { createWorkOrder: WIPCreateWorkOrder }) {
  const employeeIds = unique(createWorkOrder.charges.map(charge => charge.employeeId).filter(isNonNullable));

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const isLoading = Object.values(employeeQueries).some(query => query.isLoading);
  const employeeNames = employeeIds.map(id => {
    let label = employeeQueries[id]?.data?.name ?? 'Unknown Employee';

    const employeeHours = BigDecimal.sum(
      ...createWorkOrder.charges
        .filter(hasPropertyValue('employeeId', id))
        .filter(hasPropertyValue('type', 'hourly-labour'))
        .map(charge => BigDecimal.fromDecimal(charge.hours)),
    );

    if (employeeHours.compare(BigDecimal.ZERO) > 0) {
      label = `${label} (${employeeHours.round(2).trim().toDecimal()})`;
    }

    return label;
  });

  const totalHours = BigDecimal.sum(
    ...createWorkOrder.charges
      .filter(hasPropertyValue('type', 'hourly-labour'))
      .map(charge => BigDecimal.fromDecimal(charge.hours)),
  );

  const nonEmployeeHours = BigDecimal.sum(
    ...createWorkOrder.charges
      .filter(hasPropertyValue('type', 'hourly-labour'))
      .filter(hasPropertyValue('employeeId', null))
      .map(charge => BigDecimal.fromDecimal(charge.hours)),
  );

  let totalHoursLabel = 'Total Hours';

  if (nonEmployeeHours.compare(BigDecimal.ZERO) > 0) {
    totalHoursLabel = `${totalHoursLabel} (${nonEmployeeHours.round(2).trim().toDecimal()} hours unassigned)`;
  }

  return (
    <ResponsiveGrid columns={2}>
      <FormStringField
        label={'Assigned Employees'}
        type={'area'}
        disabled
        value={isLoading ? 'Loading...' : employeeNames.join(', ')}
      />
      {totalHours.compare(BigDecimal.ZERO) > 0 && (
        <FormStringField
          label={totalHoursLabel}
          type={'decimal'}
          disabled
          value={totalHours.round(2).trim().toDecimal()}
          formatter={hours => `${hours} hours`}
        />
      )}
    </ResponsiveGrid>
  );
}

function WorkOrderMoneySummary({
  createWorkOrder,
  dispatch,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
}) {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();
  const formatter = (value: Money | null) => (value !== null ? currencyFormatter(value) : '-');

  // this calculation automatically accounts for paid-for items
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      name: createWorkOrder.name,
      items: createWorkOrder.items,
      charges: createWorkOrder.charges,
      customerId: createWorkOrder.customerId!,
      discount: createWorkOrder.discount,
    },
    { enabled: createWorkOrder.customerId !== null },
  );
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  let appliedDiscount = BigDecimal.ZERO;

  if (calculatedDraftOrder) {
    appliedDiscount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.applied).add(
      BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.applied),
    );
  }

  const router = useRouter();

  return (
    <ResponsiveGrid columns={1}>
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Text variant={'headingLarge'}>Summary</Text>
      </Stack>

      {calculatedDraftOrderQuery.error && (
        <Banner
          title={`Error calculating work order: ${extractErrorMessage(calculatedDraftOrderQuery.error)}`}
          variant={'error'}
          visible
        />
      )}

      <WorkOrderEmployees createWorkOrder={createWorkOrder} />

      <ResponsiveGrid columns={2} grow>
        <FormStringField
          label={'Discount'}
          value={(() => {
            if (!createWorkOrder.discount) return '';

            if (createWorkOrder.discount.type === 'FIXED_AMOUNT') {
              return currencyFormatter(createWorkOrder.discount.value);
            }

            if (createWorkOrder.discount.type === 'PERCENTAGE') {
              let value = `${createWorkOrder.discount.value}%`;

              if (calculatedDraftOrder) {
                const discount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.total).add(
                  BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.total),
                );

                const amount = discount.subtract(appliedDiscount);

                value += ` (${currencyFormatter(amount.round(2).toMoney())})`;
              }

              return value;
            }

            return createWorkOrder.discount satisfies never;
          })()}
          onFocus={() => router.push('DiscountSelector', { onSelect: discount => dispatch.setPartial({ discount }) })}
        />
        {appliedDiscount.compare(BigDecimal.ZERO) > 0 && (
          <FormMoneyField
            label={'Applied Discount'}
            disabled
            value={appliedDiscount.round(2).toMoney()}
            formatter={formatter}
          />
        )}
        <FormMoneyField label={'Subtotal'} disabled value={calculatedDraftOrder?.subtotal} formatter={formatter} />
        <FormMoneyField label={'Tax'} disabled value={calculatedDraftOrder?.tax} formatter={formatter} />
        <FormMoneyField label={'Total'} disabled value={calculatedDraftOrder?.total} formatter={formatter} />

        <FormMoneyField label={'Paid'} disabled value={calculatedDraftOrder?.paid} formatter={formatter} />
        <FormMoneyField
          label={'Balance Due'}
          disabled
          value={calculatedDraftOrder?.outstanding}
          formatter={formatter}
        />
      </ResponsiveGrid>
    </ResponsiveGrid>
  );
}

function useItemRows(createWorkOrder: WIPCreateWorkOrder, dispatch: CreateWorkOrderDispatchProxy, query: string) {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();

  const productVariantIds = unique(createWorkOrder.items.map(item => item.productVariantId).filter(isNonNullable));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const { workOrderQuery, getItemOrdersIncludingCharges } = useWorkOrderOrders(createWorkOrder.name);

  const isLoading = [workOrderQuery, ...Object.values(productVariantQueries)].some(query => query.isLoading);

  const router = useRouter();
  const screen = useScreen();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  screen.setIsLoading(isLoading);

  function queryFilter(productVariant?: ProductVariant | null) {
    return (
      !productVariant || !query || getProductVariantName(productVariant)?.toLowerCase().includes(query.toLowerCase())
    );
  }

  return createWorkOrder.items
    .map(item => {
      return {
        item,
        productVariant: productVariantQueries[item.productVariantId]?.data,
        purchaseOrders: workOrderQuery.data?.workOrder?.items.find(i => i.uuid === item.uuid)?.purchaseOrders ?? [],
      };
    })
    .filter(({ productVariant }) => queryFilter(productVariant))
    .map<ListRow>(({ item, productVariant, purchaseOrders }) => {
      const isMutableService =
        getProductServiceType(productVariant?.product?.serviceType?.value) === QUANTITY_ADJUSTING_SERVICE;
      const charges = createWorkOrder.charges?.filter(hasPropertyValue('workOrderItemUuid', item.uuid)) ?? [];
      const hasCharges = charges.length > 0;

      const basePrice = isMutableService
        ? BigDecimal.ZERO.toMoney()
        : productVariant?.price ?? BigDecimal.ZERO.toMoney();

      const chargesPrice = getTotalPriceForCharges(charges);

      const totalPrice = BigDecimal.fromMoney(basePrice)
        .multiply(BigDecimal.fromString(item.quantity.toFixed(0)))
        .add(BigDecimal.fromMoney(chargesPrice));

      const orders = getItemOrdersIncludingCharges(item).filter(order => order.type === 'ORDER');

      return {
        id: item.uuid,
        leftSide: {
          label: getProductVariantName(productVariant) ?? 'Unknown item',
          subtitle: productVariant?.sku ? [productVariant.sku] : undefined,
          image: {
            source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
            badge: (!isMutableService && !hasCharges) || item.quantity > 1 ? item.quantity : undefined,
          },
          badges: [
            ...unique(orders.map(order => order.name)).map<BadgeProps>(orderName => ({
              text: orderName,
              variant: 'highlight',
            })),
            ...purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true)),
          ],
        },
        rightSide: {
          label: currencyFormatter(totalPrice.toMoney()),
          showChevron: true,
        },
        onPress() {
          if (!productVariant) {
            toast.show('Cannot edit item - product variant not found');
            return;
          }

          if (hasCharges || isMutableService) {
            router.push('ItemChargeConfig', {
              item,
              createWorkOrder,
              initialCharges: charges,
              onRemove: () => dispatch.removeItems({ items: [item] }),
              onUpdate: charges => dispatch.updateItemCharges({ item, charges }),
            });
            return;
          }

          router.push('ItemConfig', {
            workOrderName: createWorkOrder.name,
            item,
            onRemove: () => dispatch.removeItems({ items: [item] }),
            onUpdate: item => dispatch.updateItem({ item }),
            onAssignLabour: item => {
              dispatch.updateItem({ item });
              router.push('ItemChargeConfig', {
                item,
                initialCharges: charges,
                createWorkOrder,
                onRemove: () => dispatch.removeItems({ items: [item] }),
                onUpdate: charges => dispatch.updateItemCharges({ item, charges }),
              });
            },
          });
        },
      };
    });
}
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
import { useEffect, useState } from 'react';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import {
  CreateWorkOrderDispatchProxy,
  WIPCreateWorkOrder,
  useCreateWorkOrderReducer,
} from '../create-work-order/reducer.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { Money } from '@web/services/gql/queries/generated/schema.js';
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
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { getPurchaseOrderBadge } from '../util/badges.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';

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
    <Form disabled={saveWorkOrderMutation.isLoading}>
      <ScrollView>
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
                value={(() => {
                  const dueDateUtc = new Date(createWorkOrder.dueDate);
                  const dueDateLocal = new Date(dueDateUtc.getTime() + dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS);
                  return dueDateLocal.toISOString();
                })()}
                onChange={(date: string) => {
                  const dueDateLocal = new Date(date);
                  const dueDateUtc = new Date(dueDateLocal.getTime() - dueDateLocal.getTimezoneOffset() * MINUTE_IN_MS);
                  dispatch.setPartial({ dueDate: dueDateUtc.toISOString() as DateTime });
                }}
                disabled={saveWorkOrderMutation.isLoading}
              />
              <WorkOrderMoneySummary createWorkOrder={createWorkOrder} dispatch={dispatch} />
            </ResponsiveGrid>
          </ResponsiveGrid>
        </ResponsiveStack>
      </ScrollView>

      <ResponsiveStack
        direction={'vertical'}
        spacing={0.5}
        paddingHorizontal={'HalfPoint'}
        paddingVertical={'HalfPoint'}
        flex={0}
      >
        <ResponsiveGrid columns={4} smColumns={2} grow flex={0}>
          <FormButton
            title={'Manage payments'}
            type={'basic'}
            action={'button'}
            disabled={
              !createWorkOrder.name ||
              hasUnsavedChanges ||
              createWorkOrder.items.length + createWorkOrder.charges.length === 0
            }
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
                  dueDate: new Date(createWorkOrder.dueDate),
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
            <Stack direction="horizontal" alignment="center">
              <Text color="TextSubdued" variant="body">
                You must save your work order before you can manage payments/print
              </Text>
            </Stack>
          ))}
      </ResponsiveStack>
    </Form>
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

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      name: createWorkOrder.name,
      items: createWorkOrder.items,
      charges: createWorkOrder.charges,
      customerId: createWorkOrder.customerId!,
      discount: createWorkOrder.discount,
    },
    { enabled: !!createWorkOrder.customerId },
  );

  const [openChargeConfigPopupItemUuid, setOpenChargeConfigPopup] = useState<string | null>(null);

  useEffect(() => {
    if (openChargeConfigPopupItemUuid) {
      setOpenChargeConfigPopup(null);
      router.push('ItemChargeConfig', {
        itemUuid: openChargeConfigPopupItemUuid,
        createWorkOrder,
        dispatch,
      });
    }
  }, [openChargeConfigPopupItemUuid]);

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
                dispatch.addItems({ items: [item] });
                dispatch.updateItemCharges({ uuid: item.uuid, charges });
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
              onSelect: ({ item, charges }) => {
                dispatch.updateItemCharges({ uuid: item.uuid, charges });
                dispatch.addItems({ items: [item] });

                if (item.absorbCharges) {
                  setOpenChargeConfigPopup(item.uuid);
                }
              },
              onAddLabourToItem: item => {
                router.push('ItemChargeConfig', {
                  itemUuid: item.uuid,
                  createWorkOrder,
                  dispatch,
                });
              },
            })
          }
        />
      </ResponsiveGrid>

      {(calculatedDraftOrderQuery.data?.missingProductVariantIds?.length ?? 0) > 0 && (
        <Banner
          title={
            'This work order contains products which have likely been deleted. Please remove them to save this work order'
          }
          variant={'alert'}
          visible
        />
      )}

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

      {unique(calculatedDraftOrderQuery.data?.warnings ?? []).map(warning => (
        <Banner title={warning} variant={'alert'} visible />
      ))}

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

        <FormMoneyField
          label={'Paid'}
          disabled
          value={(() => {
            if (!calculatedDraftOrder) return null;
            return BigDecimal.fromMoney(calculatedDraftOrder.total)
              .subtract(BigDecimal.fromMoney(calculatedDraftOrder.outstanding))
              .toMoney();
          })()}
          formatter={formatter}
        />
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

  const workOrderQuery = useWorkOrderQuery({ fetch, name: createWorkOrder.name });
  const calculatedWorkOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      name: createWorkOrder.name,
      items: createWorkOrder.items,
      charges: createWorkOrder.charges,
      customerId: createWorkOrder.customerId!,
      discount: createWorkOrder.discount,
    },
    { enabled: !!createWorkOrder.customerId, keepPreviousData: true },
  );

  const router = useRouter();
  const screen = useScreen();

  screen.setIsLoading(workOrderQuery.isLoading || calculatedWorkOrderQuery.isLoading);

  const queryFilter = (lineItem?: CalculateDraftOrderResponse['lineItems'][number] | null) => {
    if (!lineItem || !query) {
      return true;
    }

    return lineItem.name.toLowerCase().includes(query.toLowerCase());
  };

  return createWorkOrder.items
    .map(item => {
      return {
        item,
        lineItem: calculatedWorkOrderQuery.getItemLineItem(item.uuid),
      };
    })
    .filter(({ lineItem }) => queryFilter(lineItem))
    .map<ListRow>(({ item, lineItem }) => {
      if (!lineItem?.order && calculatedWorkOrderQuery.data?.missingProductVariantIds.includes(item.productVariantId)) {
        return {
          id: item.uuid,
          leftSide: {
            label: 'Deleted product',
            subtitle: ['This product has been deleted.', 'Click to delete this line item from the work order.'],
          },
          rightSide: {
            showChevron: true,
          },
          onPress() {
            dispatch.removeItem({ uuid: item.uuid });
          },
        };
      }

      const isMutableService =
        getProductServiceType(lineItem?.variant?.product?.serviceType?.value) === QUANTITY_ADJUSTING_SERVICE;

      const purchaseOrders =
        workOrderQuery.data?.workOrder?.items.find(i => i.uuid === item.uuid)?.purchaseOrders ?? [];

      const charges = createWorkOrder.charges?.filter(hasPropertyValue('workOrderItemUuid', item.uuid)) ?? [];

      const itemPrice = calculatedWorkOrderQuery.data?.itemPrices[item.uuid];
      const chargePrices = charges.map(charge => {
        if (charge.type === 'hourly-labour') {
          return calculatedWorkOrderQuery.data?.hourlyLabourChargePrices[charge.uuid];
        } else if (charge.type === 'fixed-price-labour') {
          return calculatedWorkOrderQuery.data?.fixedPriceLabourChargePrices[charge.uuid];
        }

        return charge satisfies never;
      });

      const totalPrice = BigDecimal.sum(
        ...[itemPrice, ...chargePrices].filter(isNonNullable).map(price => BigDecimal.fromMoney(price)),
      );

      const chargeLineItems = charges
        .map(charge => calculatedWorkOrderQuery.getChargeLineItem(charge))
        .filter(isNonNullable);

      const orderNames = unique(
        [lineItem, ...chargeLineItems].map(lineItem => lineItem?.order?.name).filter(isNonNullable),
      );

      return {
        id: item.uuid,
        leftSide: {
          label: lineItem?.name ?? 'Unknown item',
          subtitle: lineItem?.sku ? [lineItem.sku] : undefined,
          image: {
            source:
              lineItem?.image?.url ?? lineItem?.variant?.image?.url ?? lineItem?.variant?.product?.featuredImage?.url,
            badge: !isMutableService ? item.quantity : undefined,
          },
          badges: [
            ...orderNames.map<BadgeProps>(orderName => ({ text: orderName, variant: 'highlight' })),
            ...purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true)),
          ],
        },
        rightSide: {
          label: currencyFormatter(totalPrice.toMoney()),
          showChevron: true,
        },
        onPress() {
          if (charges.length > 0 || isMutableService) {
            router.push('ItemChargeConfig', {
              itemUuid: item.uuid,
              createWorkOrder,
              dispatch,
            });
            return;
          }

          router.push('ItemConfig', {
            itemUuid: item.uuid,
            createWorkOrder,
            dispatch,
          });
        },
      };
    });
}

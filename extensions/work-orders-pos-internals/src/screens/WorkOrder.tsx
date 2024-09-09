import {
  BadgeProps,
  Banner,
  Button,
  DateField,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from 'react';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { Money } from '@web/services/gql/queries/generated/schema.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
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
import { DateTime, WorkOrderPaymentTerms } from '@web/schemas/generated/create-work-order.js';
import { getPurchaseOrderBadge, getSpecialOrderBadge, getTransferOrderBadge } from '../util/badges.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { DAY_IN_MS, MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import {
  CreateWorkOrderDispatchProxy,
  useCreateWorkOrderReducer,
  WIPCreateWorkOrder,
} from '@work-orders/common/create-work-order/reducer.js';
import { useCompanyQuery } from '@work-orders/common/queries/use-company-query.js';
import { useCompanyLocationQuery } from '@work-orders/common/queries/use-company-location-query.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { usePaymentTermsTemplatesQueries } from '@work-orders/common/queries/use-payment-terms-templates-query.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { paymentTermTypes } from '@work-orders/common/util/payment-terms-types.js';
import { CustomField } from '@work-orders/common-pos/components/CustomField.js';
import { UUID } from '@web/util/types.js';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { SHOPIFY_B2B_PLANS } from '@work-orders/common/util/shopify-plans.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';

export type WorkOrderProps = {
  initial: WIPCreateWorkOrder;
};

type OpenConfigPopup = {
  configType: 'item' | 'charge';
  type: 'product' | 'custom-item';
  uuid: UUID;
};

export function WorkOrder({ initial }: WorkOrderProps) {
  const fetch = useAuthenticatedFetch();
  const [name, setName] = useState(initial.name);
  const workOrderQuery = useWorkOrderQuery({ fetch, name });

  const [createWorkOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreateWorkOrderReducer(
    initial,
    !workOrderQuery.isFetching ? workOrderQuery.data?.workOrder : undefined,
    { useRef, useState, useReducer },
  );

  if (name !== createWorkOrder.name) {
    setName(createWorkOrder.name);
  }

  const router = useRouter();
  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.setTitle(createWorkOrder.name ?? 'New Work Order');
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

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
            title={'Sourcing'}
            type={'basic'}
            action={'button'}
            disabled={!createWorkOrder.name || hasUnsavedChanges}
            onPress={() => {
              const { name } = createWorkOrder;

              if (!name) {
                toast.show('You must save your work order before you can manage payments/print');
                return;
              }

              router.push('WorkOrderItemSourcing', { name });
            }}
          />
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
                router.push('WorkOrderPrintOverview', {
                  name: createWorkOrder.name,
                  dueDateUtc: new Date(createWorkOrder.dueDate),
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

  const companyQuery = useCompanyQuery(
    { fetch, id: createWorkOrder.companyId! },
    { enabled: !!createWorkOrder.companyId },
  );
  const company = companyQuery.data;

  const customerQuery = useCustomerQuery({ fetch, id: createWorkOrder.customerId });
  const customer = customerQuery.data;

  const companyLocationQuery = useCompanyLocationQuery(
    { fetch, id: createWorkOrder.companyLocationId! },
    { enabled: !!createWorkOrder.companyLocationId },
  );
  const companyLocation = companyLocationQuery.data;

  const paymentTermsQueries = usePaymentTermsTemplatesQueries({
    fetch,
    types: [...paymentTermTypes],
  });
  const paymentTermsTemplates = Object.values(paymentTermsQueries)
    .flatMap(query => query.data)
    .filter(isNonNullable);

  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const storeProperties = storePropertiesQuery.data?.storeProperties;

  // TODO: Make Previous Order and Previous Work Orders clickable to view history (wrap in selectable or make it a button?)

  const hasOrder = workOrder?.orders.some(order => order.type === 'ORDER') ?? false;

  const router = useRouter();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const openCompanySelector = () => {
    router.push('CompanySelector', {
      onSelect: company => {
        if (!company.mainContact) {
          toast.show('No company contact found');
          return;
        }

        dispatch.setCompany({
          companyId: company.id,
          customerId: company.mainContact.customer.id,
          companyContactId: company.mainContact.id,
          companyLocationId: null,
          paymentTerms: null,
        });
        openCompanyLocationSelector(company.id);
      },
    });
  };

  const openCompanyLocationSelector = (companyId: ID | null = createWorkOrder.companyId) => {
    if (!companyId) return;

    router.push('CompanyLocationSelector', {
      companyId,
      onSelect: location => {
        const paymentTerms: WorkOrderPaymentTerms | null = (() => {
          if (!location.buyerExperienceConfiguration?.paymentTermsTemplate) {
            return null;
          }

          return {
            templateId: location.buyerExperienceConfiguration.paymentTermsTemplate.id,
            date: new Date(Date.now() + 30 * DAY_IN_MS).toISOString() as DateTime,
          };
        })();

        return dispatch.setPartial({
          companyLocationId: location.id,
          paymentTerms,
        });
      },
    });
  };

  const canSelectCompany = storeProperties && SHOPIFY_B2B_PLANS.includes(storeProperties.plan);

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
      {derivedFromOrder && derivedFromOrder.workOrders.length > 0 && (
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
      {canSelectCompany && (
        <FormStringField
          label={'Company'}
          onFocus={() => openCompanySelector()}
          disabled={hasOrder}
          value={
            createWorkOrder.companyId === null
              ? ''
              : companyQuery.isLoading
                ? 'Loading...'
                : company?.name ?? 'Unknown company'
          }
        />
      )}
      {createWorkOrder.companyId && (
        <FormStringField
          label={'Location'}
          required
          onFocus={() => openCompanyLocationSelector()}
          disabled={hasOrder}
          value={
            !createWorkOrder.companyLocationId
              ? 'No location selected'
              : companyLocationQuery.isLoading
                ? 'Loading...'
                : companyLocation?.name ?? 'Unknown location'
          }
        />
      )}
      {!!createWorkOrder.companyId && (
        <FormStringField
          label={'Payment Terms'}
          required
          onFocus={() => {
            router.push('PaymentTermsSelector', {
              companyLocationId: createWorkOrder.companyLocationId,
              initialPaymentTerms: createWorkOrder.paymentTerms,
              onSelect: paymentTerms => dispatch.setPartial({ paymentTerms }),
              disabled: hasOrder,
            });
          }}
          disabled={hasOrder}
          value={((): string => {
            if (createWorkOrder.paymentTerms === null) {
              return 'No terms';
            }

            const isLoading = Object.values(paymentTermsQueries).some(query => query.isLoading);

            const template = paymentTermsTemplates.find(
              hasPropertyValue('id', createWorkOrder.paymentTerms.templateId),
            );

            if (!template && isLoading) {
              return 'Loading...';
            }

            if (!template) {
              return 'Unknown';
            }

            if (template.paymentTermsType === 'FIXED') {
              return createWorkOrder.paymentTerms.date
                ? `Due ${new Date(createWorkOrder.paymentTerms.date).toLocaleDateString()}`
                : 'Due on unknown date';
            }

            return template.name;
          })()}
        />
      )}
      <FormStringField
        label={'Customer'}
        required
        onFocus={() =>
          router.push('CustomerSelector', {
            onSelect: customer => dispatch.setCustomer({ customerId: customer.id }),
          })
        }
        disabled={hasOrder}
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
  const fetch = useAuthenticatedFetch();

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    { fetch, ...createWorkOrder },
    { enabled: router.isCurrent },
  );

  const [openConfigPopup, setOpenConfigPopup] = useState<OpenConfigPopup | null>(null);

  useEffect(() => {
    if (openConfigPopup) {
      setOpenConfigPopup(null);

      if (openConfigPopup.configType === 'item') {
        router.push('ItemConfig', {
          item: openConfigPopup,
          createWorkOrder,
          dispatch,
          onAddLabour: () =>
            setOpenConfigPopup({ configType: 'charge', type: openConfigPopup.type, uuid: openConfigPopup.uuid }),
        });
        return;
      }

      if (openConfigPopup.configType === 'charge') {
        router.push('ItemChargeConfig', {
          item: openConfigPopup,
          createWorkOrder,
          dispatch,
        });
        return;
      }

      return openConfigPopup.configType satisfies never;
    }
  }, [openConfigPopup, createWorkOrder]);

  const rows = useItemRows(createWorkOrder, dispatch, query, setOpenConfigPopup);

  const { session } = useExtensionApi<'pos.home.modal.render'>();
  const [inventoryLocationIds, setInventoryLocationIds] = useState<ID[]>([
    createGid('Location', session.currentSession.locationId),
  ]);

  return (
    <ResponsiveGrid columns={1}>
      <ResponsiveGrid columns={2}>
        <FormButton
          title="Add Product"
          type="primary"
          action={'button'}
          onPress={() =>
            router.push('ProductSelector', {
              onSelect: ({ items, charges }) => {
                dispatch.addItems({ items });

                const chargesByItem = groupBy(
                  charges.filter(hasNonNullableProperty('workOrderItemUuid')),
                  charge => charge.workOrderItemUuid,
                );

                for (const charges of Object.values(chargesByItem)) {
                  const [charge] = charges;
                  if (!charge) continue;
                  dispatch.updateItemCharges({ item: { uuid: charge.workOrderItemUuid }, charges });
                }

                const customItem = items.find(hasPropertyValue('type', 'custom-item'));
                if (customItem) {
                  setOpenConfigPopup({ type: customItem.type, uuid: customItem.uuid, configType: 'item' });
                }
              },
              companyLocationId: createWorkOrder.companyLocationId,
              onInventoryLocationIdsChange: setInventoryLocationIds,
              inventoryLocationIds,
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
                dispatch.updateItemCharges({ item, charges });
                dispatch.addItems({ items: [item] });

                if (item.absorbCharges) {
                  setOpenConfigPopup({ type: item.type, uuid: item.uuid, configType: 'charge' });
                }
              },
              onAddLabourToItem: item => {
                router.push('ItemChargeConfig', {
                  item,
                  createWorkOrder,
                  dispatch,
                });
              },
            })
          }
        />
      </ResponsiveGrid>

      {!!calculatedDraftOrderQuery.data?.missingProductVariantIds?.length && (
        <Banner
          title={
            'This work order contains products which have likely been deleted. Please remove them to save this work order'
          }
          variant={'alert'}
          visible
        />
      )}

      <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="HalfPoint">
        <Text variant="body" color="TextSubdued">
          {calculatedDraftOrderQuery.isFetching ? 'Loading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar placeholder="Search items" value={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length > 0 ? (
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
      {Object.keys(createWorkOrder.customFields).map(key => (
        <CustomField
          key={key}
          name={key}
          value={createWorkOrder.customFields[key] ?? ''}
          onChange={(value: string) =>
            dispatch.setPartial({ customFields: { ...createWorkOrder.customFields, [key]: value } })
          }
          useRouter={useRouter}
        />
      ))}

      <FormButton
        title={'Custom Fields'}
        onPress={() =>
          router.push('CustomFieldConfig', {
            initialCustomFields: createWorkOrder.customFields,
            onSave: customFields => dispatch.setPartial({ customFields }),
            type: 'WORK_ORDER',
          })
        }
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
  const router = useRouter();
  const currencyFormatter = useCurrencyFormatter();
  const formatter = (value: Money | null) => (value !== null ? currencyFormatter(value) : '-');

  // this calculation automatically accounts for paid-for items
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    { fetch, ...createWorkOrder },
    { enabled: router.isCurrent },
  );
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  let appliedDiscount = BigDecimal.ZERO;

  if (calculatedDraftOrder) {
    appliedDiscount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.applied).add(
      BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.applied),
    );
  }

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

function useItemRows(
  createWorkOrder: WIPCreateWorkOrder,
  dispatch: CreateWorkOrderDispatchProxy,
  query: string,
  setOpenConfigPopup: Dispatch<SetStateAction<OpenConfigPopup | null>>,
) {
  const fetch = useAuthenticatedFetch();
  const router = useRouter();
  const currencyFormatter = useCurrencyFormatter();

  const workOrderQuery = useWorkOrderQuery({ fetch, name: createWorkOrder.name });
  const productVariantQueries = useProductVariantQueries({
    fetch,
    ids: createWorkOrder.items.filter(hasPropertyValue('type', 'product')).map(item => item.productVariantId),
  });
  const calculatedWorkOrderQuery = useCalculatedDraftOrderQuery(
    { fetch, ...createWorkOrder },
    { enabled: router.isCurrent },
  );

  const screen = useScreen();

  screen.setIsLoading(workOrderQuery.isFetching);

  const queryFilter = (lineItem?: { name?: string | null } | null) => {
    if (!lineItem?.name || !query) {
      return true;
    }

    return lineItem.name.toLowerCase().includes(query.toLowerCase());
  };

  return createWorkOrder.items
    .map(item => {
      return {
        item,
        productVariant: item.type === 'product' ? productVariantQueries[item.productVariantId]?.data : null,
        lineItem: calculatedWorkOrderQuery.getItemLineItem(item),
      };
    })
    .filter(({ productVariant, lineItem }) => queryFilter({ name: lineItem?.name ?? productVariant?.title }))
    .map<ListRow>(({ item, lineItem, productVariant }) => {
      const variant = lineItem?.variant ?? productVariant;

      if (
        item.type === 'product' &&
        !lineItem?.order &&
        calculatedWorkOrderQuery.data?.missingProductVariantIds.includes(item.productVariantId)
      ) {
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
            dispatch.removeItem({ item });
          },
        };
      }

      const isMutableService =
        getProductServiceType(variant?.product?.serviceType?.value) === QUANTITY_ADJUSTING_SERVICE;

      const specialOrders =
        workOrderQuery.data?.workOrder?.items
          .filter(hasPropertyValue('type', item.type))
          .find(hasPropertyValue('uuid', item.uuid))?.specialOrders ?? [];

      const purchaseOrders =
        workOrderQuery.data?.workOrder?.items
          .filter(hasPropertyValue('type', item.type))
          .find(hasPropertyValue('uuid', item.uuid))?.purchaseOrders ?? [];

      const transferOrders =
        workOrderQuery.data?.workOrder?.items
          .filter(hasPropertyValue('type', item.type))
          .find(hasPropertyValue('uuid', item.uuid))?.transferOrders ?? [];

      const charges = createWorkOrder.charges?.filter(hasPropertyValue('workOrderItemUuid', item.uuid)) ?? [];

      const fallbackItemPrice =
        !createWorkOrder.companyId && productVariant?.price
          ? BigDecimal.fromMoney(productVariant.price)
              .multiply(BigDecimal.fromString(item.quantity.toString()))
              .toMoney()
          : undefined;

      const itemPrice = calculatedWorkOrderQuery.getItemPrice(item) ?? fallbackItemPrice;
      const chargePrices = calculatedWorkOrderQuery
        ? charges.map(calculatedWorkOrderQuery.getChargePrice)
        : createWorkOrder.companyId
          ? []
          : [getTotalPriceForCharges(charges)];
      const totalPrice = BigDecimal.sum(
        ...[itemPrice, ...chargePrices].filter(isNonNullable).map(price => BigDecimal.fromMoney(price)),
      );

      const chargeLineItems = charges
        .map(charge => calculatedWorkOrderQuery.getChargeLineItem(charge))
        .filter(isNonNullable);

      const orderNames = unique(
        [lineItem, ...chargeLineItems].map(lineItem => lineItem?.order?.name).filter(isNonNullable),
      );

      const label =
        lineItem?.name ??
        getProductVariantName(variant) ??
        (calculatedWorkOrderQuery.isFetching ? 'Loading...' : 'Unknown item');
      const sku = lineItem?.sku ?? variant?.sku;
      const imageUrl = lineItem?.image?.url ?? variant?.image?.url ?? variant?.product?.featuredImage?.url;

      return {
        id: item.uuid,
        leftSide: {
          label,
          subtitle: sku ? [sku] : undefined,
          image: {
            source: imageUrl,
            badge: !isMutableService ? item.quantity : undefined,
          },
          badges: [
            ...orderNames.map<BadgeProps>(orderName => ({ text: orderName, variant: 'highlight' })),
            ...specialOrders.map<BadgeProps>(so => getSpecialOrderBadge(so, true)),
            ...purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true)),
            ...transferOrders.map<BadgeProps>(to => getTransferOrderBadge(to, true)),
          ],
        },
        rightSide: {
          label: currencyFormatter(totalPrice.toMoney()),
          showChevron: true,
        },
        onPress() {
          if (charges.length > 0 || isMutableService) {
            router.push('ItemChargeConfig', {
              item,
              createWorkOrder,
              dispatch,
            });
            return;
          }

          router.push('ItemConfig', {
            item,
            createWorkOrder,
            dispatch,
            onAddLabour: () => setOpenConfigPopup({ configType: 'charge', type: item.type, uuid: item.uuid }),
          });
        },
      };
    });
}

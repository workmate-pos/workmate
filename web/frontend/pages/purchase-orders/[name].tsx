import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useCreatePurchaseOrderReducer } from '@work-orders/common/create-purchase-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import {
  BlockStack,
  Box,
  Card,
  EmptyState,
  Frame,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  Tooltip,
} from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { PurchaseOrderPrintModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderPrintModal.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { VendorSelectorModal } from '@web/frontend/components/shared-orders/modals/VendorSelectorModal.js';
import { AddEmployeeModal } from '@web/frontend/components/shared-orders/modals/AddEmployeeModal.js';
import { CustomFieldPresetsModal } from '@web/frontend/components/shared-orders/modals/CustomFieldPresetsModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SaveCustomFieldPresetModal.js';
import { NewCustomFieldModal } from '@web/frontend/components/shared-orders/modals/NewCustomFieldModal.js';
import { PurchaseOrderGeneralCard } from '@web/frontend/components/purchase-orders/PurchaseOrderGeneralCard.js';
import { PurchaseOrderShippingCard } from '@web/frontend/components/purchase-orders/PurchaseOrderShippingCard.js';
import { PurchaseOrderEmployeesCard } from '@web/frontend/components/purchase-orders/PurchaseOrderEmployeesCard.js';
import { PurchaseOrderProductsCard } from '@web/frontend/components/purchase-orders/PurchaseOrderProductsCard.js';
import { PurchaseOrderSummary } from '@web/frontend/components/purchase-orders/PurchaseOrderSummary.js';
import { AddProductModal } from '@web/frontend/components/shared-orders/modals/AddProductModal.js';
import { Int } from '@web/schemas/generated/create-product.js';
import type { DetailedPurchaseOrder as PurchaseOrderType } from '@web/services/purchase-orders/types.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { PurchaseOrderCustomFieldsCard } from '@web/frontend/components/purchase-orders/PurchaseOrderCustomFieldsCard.js';
import { EditCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/EditCustomFieldPresetModal.js';
import { CustomFieldValuesSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomFieldValuesSelectorModal.js';
import { LinkedTasks, NewLinkedTaskButton, BaseNewTaskButton } from '@web/frontend/components/tasks/LinkedTasks.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import {
  BaseNewPurchaseOrderReceiptButton,
  NewPurchaseOrderReceiptButton,
  PurchaseOrderReceipts,
} from '@web/frontend/components/purchase-orders/PurchaseOrderReceipts.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_purchase_orders', 'read_settings']}>
          <PurchaseOrderLoader />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function PurchaseOrderLoader() {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderQuery = usePurchaseOrderQuery(
    { fetch, name },
    {
      enabled: name !== 'new',
      retry: false,
    },
  );

  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });

  const app = useAppBridge();
  if (!name) {
    Redirect.create(app).dispatch(Redirect.Action.APP, '/purchase-orders');
    return null;
  }

  if (purchaseOrderQuery.isError || settingsQuery.isError || customFieldsPresetsQuery.isError) {
    return (
      <>
        <Card>
          <EmptyState image={emptyState} heading={'An error occurred'}>
            <Text as={'p'} variant={'bodyLg'} fontWeight={'bold'} tone={'critical'}>
              {extractErrorMessage(
                purchaseOrderQuery.error ?? settingsQuery.error ?? customFieldsPresetsQuery.error,
                'An error occurred while loading purchase order',
              )}
            </Text>
          </EmptyState>
        </Card>
        {toast}
      </>
    );
  }

  if ((name !== 'new' && !purchaseOrderQuery.data) || !settingsQuery.data || !customFieldsPresetsQuery.data) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  let createPurchaseOrder;

  if (purchaseOrderQuery.data) {
    createPurchaseOrder = createPurchaseOrderFromPurchaseOrder(purchaseOrderQuery.data);
  } else {
    const { purchaseOrders } = settingsQuery.data.settings;
    createPurchaseOrder = defaultCreatePurchaseOrder({ status: purchaseOrders.defaultStatus });

    createPurchaseOrder.customFields = {
      ...customFieldsPresetsQuery.data.defaultCustomFields,
      ...createPurchaseOrder.customFields,
    };
  }

  return (
    <>
      <PurchaseOrder initialCreatePurchaseOrder={createPurchaseOrder} purchaseOrder={purchaseOrderQuery.data ?? null} />
      {toast}
    </>
  );
}

export type Location = ReturnType<typeof useLocationQuery>['data'];

function PurchaseOrder({
  initialCreatePurchaseOrder,
  purchaseOrder,
}: {
  initialCreatePurchaseOrder: CreatePurchaseOrder;
  purchaseOrder: PurchaseOrderType | null;
}) {
  const app = useAppBridge();

  const [createPurchaseOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreatePurchaseOrderReducer(
    initialCreatePurchaseOrder,
    { useReducer, useState, useRef },
  );

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderMutation = usePurchaseOrderMutation(
    { fetch },
    {
      onSuccess: ({ purchaseOrder }) => {
        const message = createPurchaseOrder.name ? 'Purchase order updated' : 'Purchase order created';
        setToastAction({ content: message });
        dispatch.set(createPurchaseOrderFromPurchaseOrder(purchaseOrder));
        setHasUnsavedChanges(false);
        Redirect.create(app).dispatch(
          Redirect.Action.APP,
          `/purchase-orders/${encodeURIComponent(purchaseOrder.name)}`,
        );
      },
    },
  );

  const settingsQuery = useSettingsQuery({ fetch });

  const selectedLocationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const selectedLocation = selectedLocationQuery.data;

  // Default "Ship to" to selected location's address
  useEffect(() => {
    if (!selectedLocation) return;
    if (createPurchaseOrder.shipTo) return;
    dispatch.setPartial({ shipTo: selectedLocation.address?.formatted?.join('\n') ?? null });
  }, [selectedLocation]);

  const vendorsQuery = useVendorsQuery({ fetch });
  const vendorCustomer = vendorsQuery?.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName)?.customer;

  // Default "Ship from" to vendor's default address
  useEffect(() => {
    if (!vendorCustomer) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress?.formatted?.join('\n') });
  }, [vendorCustomer]);

  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isCustomFieldPresetsModalOpen, setIsCustomFieldPresetsModalOpen] = useState(false);
  const [isFieldValuesModalOpen, setIsFieldValuesModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isVendorSelectorModalOpen, setIsVendorSelectorModalOpen] = useState(false);
  const [isLocationSelectorModalOpen, setIsLocationSelectorModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [customFieldPresetNameToEdit, setCustomFieldPresetNameToEdit] = useState<string>();

  if (!settingsQuery.data) {
    return <Loading />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <Box paddingBlockEnd={'1600'}>
      <TitleBar title={'Purchase orders'} />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: purchaseOrderMutation.isPending,
          onAction: () => purchaseOrderMutation.mutate(createPurchaseOrder),
        }}
        discardAction={{
          onAction: () => {
            dispatch.set(initialCreatePurchaseOrder);
            setHasUnsavedChanges(false);
          },
        }}
      />

      <BlockStack gap={'400'}>
        <InlineStack align={'space-between'}>
          <Text as={'h1'} variant={'headingLg'} fontWeight={'bold'}>
            {createPurchaseOrder.name ?? 'New purchase order'}
          </Text>
          <Select
            label={'Status'}
            requiredIndicator
            options={settings.purchaseOrders.statuses}
            onChange={status => dispatch.setPartial({ status })}
            value={createPurchaseOrder.status}
            disabled={purchaseOrderMutation.isPending}
          />
        </InlineStack>

        <InlineGrid gap={'400'} columns={2}>
          <PurchaseOrderGeneralCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isPending}
            selectedLocation={selectedLocation}
            isLoadingLocation={selectedLocationQuery.isLoading}
            onVendorSelectorClick={() => setIsVendorSelectorModalOpen(true)}
            onLocationSelectorClick={() => setIsLocationSelectorModalOpen(true)}
          />

          <PurchaseOrderShippingCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isPending}
            selectedLocation={selectedLocation}
          />

          <PurchaseOrderEmployeesCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isPending}
            onAssignEmployeesClick={() => setIsAddEmployeeModalOpen(true)}
          />

          <PurchaseOrderCustomFieldsCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isPending}
            onSavePresetClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
            onAddCustomFieldClick={() => setIsNewCustomFieldModalOpen(true)}
            onPresetsClick={() => setIsCustomFieldPresetsModalOpen(true)}
            onFieldValuesClick={() => setIsFieldValuesModalOpen(true)}
          />
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <PurchaseOrderProductsCard
              createPurchaseOrder={createPurchaseOrder}
              purchaseOrder={purchaseOrder}
              dispatch={dispatch}
              disabled={purchaseOrderMutation.isPending}
              onAddProductClick={() => {
                if (!createPurchaseOrder.locationId) {
                  setToastAction({ content: 'You must select a location to add products' });
                  return;
                }

                if (!createPurchaseOrder.vendorName) {
                  setToastAction({ content: 'You must select a vendor to add products' });
                  return;
                }

                setIsAddProductModalOpen(true);
              }}
            />
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <PurchaseOrderReceipts
                disabled={purchaseOrderMutation.isPending || hasUnsavedChanges || !createPurchaseOrder.name}
                name={createPurchaseOrder.name}
                action={
                  !!createPurchaseOrder.name && !hasUnsavedChanges ? (
                    <NewPurchaseOrderReceiptButton name={createPurchaseOrder.name} disabled={hasUnsavedChanges} />
                  ) : (
                    <Tooltip content="You must save your purchase order before you can add receipts.">
                      <BaseNewPurchaseOrderReceiptButton disabled />
                    </Tooltip>
                  )
                }
              />
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <LinkedTasks
                links={{ purchaseOrders: [createPurchaseOrder.name].filter(isNonNullable) }}
                disabled={purchaseOrderMutation.isPending || !createPurchaseOrder.name}
                action={
                  !!createPurchaseOrder.name ? (
                    <NewLinkedTaskButton links={{ purchaseOrders: [createPurchaseOrder.name] }} />
                  ) : (
                    <Tooltip content={'You must save your purchase order before you can create tasks'}>
                      <BaseNewTaskButton disabled />
                    </Tooltip>
                  )
                }
              />
            </Card>
          </Layout.Section>
        </Layout>

        <PurchaseOrderSummary
          createPurchaseOrder={createPurchaseOrder}
          dispatch={dispatch}
          hasUnsavedChanges={hasUnsavedChanges}
          disabled={purchaseOrderMutation.isPending}
          onSave={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
          isSaving={purchaseOrderMutation.isPending}
          onPrint={() => setIsPrintModalOpen(true)}
        />
      </BlockStack>

      {/*TODO: Nicer way of making this remount*/}
      {isNewCustomFieldModalOpen && (
        <NewCustomFieldModal
          open={isNewCustomFieldModalOpen}
          existingFields={Object.keys(createPurchaseOrder.customFields)}
          onClose={() => setIsNewCustomFieldModalOpen(false)}
          onAdd={(fieldName, fieldValue) =>
            dispatch.setPartial({
              customFields: {
                ...createPurchaseOrder.customFields,
                [fieldName]: fieldValue,
              },
            })
          }
        />
      )}

      {isSaveCustomFieldPresetModalOpen && (
        <SaveCustomFieldPresetModal
          type={'PURCHASE_ORDER'}
          fieldNames={Object.keys(createPurchaseOrder.customFields)}
          open={isSaveCustomFieldPresetModalOpen}
          onClose={() => setIsSaveCustomFieldPresetModalOpen(false)}
          setToastAction={setToastAction}
        />
      )}

      {isCustomFieldPresetsModalOpen && (
        <CustomFieldPresetsModal
          type={'PURCHASE_ORDER'}
          open={isCustomFieldPresetsModalOpen}
          onClose={() => setIsCustomFieldPresetsModalOpen(false)}
          onOverride={fieldNames => {
            dispatch.setPartial({
              customFields: Object.fromEntries(
                fieldNames.map(fieldName => [fieldName, createPurchaseOrder.customFields[fieldName] ?? '']),
              ),
            });
          }}
          onMerge={fieldNames => {
            dispatch.setPartial({
              customFields: {
                ...createPurchaseOrder.customFields,
                ...Object.fromEntries(
                  fieldNames.map(fieldName => [fieldName, createPurchaseOrder.customFields[fieldName] ?? '']),
                ),
              },
            });
          }}
          onEdit={presetName => setCustomFieldPresetNameToEdit(presetName)}
          setToastAction={setToastAction}
        />
      )}

      {isFieldValuesModalOpen && (
        <CustomFieldValuesSelectorModal
          names={Object.keys(createPurchaseOrder.customFields)}
          open={isFieldValuesModalOpen}
          onClose={() => setIsFieldValuesModalOpen(false)}
        />
      )}

      {isAddEmployeeModalOpen && (
        <AddEmployeeModal
          open={isAddEmployeeModalOpen}
          onClose={() => setIsAddEmployeeModalOpen(false)}
          selectedEmployeeIds={createPurchaseOrder.employeeAssignments.map(ea => ea.employeeId)}
          onUpdate={selectedEmployeeIds =>
            dispatch.setPartial({ employeeAssignments: selectedEmployeeIds.map(employeeId => ({ employeeId })) })
          }
          setToastAction={setToastAction}
        />
      )}

      {isVendorSelectorModalOpen && (
        <VendorSelectorModal
          open={isVendorSelectorModalOpen}
          onClose={() => setIsVendorSelectorModalOpen(false)}
          onSelect={vendorName => dispatch.setVendor({ vendorName })}
          setToastAction={setToastAction}
        />
      )}

      {isLocationSelectorModalOpen && (
        <LocationSelectorModal
          open={isLocationSelectorModalOpen}
          onClose={() => setIsLocationSelectorModalOpen(false)}
          onSelect={locationId => dispatch.setLocation({ locationId })}
        />
      )}

      {isPrintModalOpen && (
        <PurchaseOrderPrintModal
          open={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          setToastAction={setToastAction}
          createPurchaseOrder={createPurchaseOrder}
        />
      )}

      {isAddProductModalOpen && createPurchaseOrder.locationId && createPurchaseOrder.vendorName && (
        <AddProductModal
          outputType="PURCHASE_ORDER"
          productType="PRODUCT"
          createPurchaseOrder={createPurchaseOrder}
          open={isAddProductModalOpen}
          locationId={createPurchaseOrder.locationId}
          vendorName={createPurchaseOrder.vendorName}
          setToastAction={setToastAction}
          onClose={() => setIsAddProductModalOpen(false)}
          onAdd={products => dispatch.addProducts({ products })}
        />
      )}

      {!!customFieldPresetNameToEdit && (
        <EditCustomFieldPresetModal
          open={!!customFieldPresetNameToEdit}
          onClose={() => setCustomFieldPresetNameToEdit(undefined)}
          setToastAction={setToastAction}
          name={customFieldPresetNameToEdit}
          type="PURCHASE_ORDER"
        />
      )}

      {toast}
    </Box>
  );
}

import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useCreatePurchaseOrderReducer } from '@work-orders/common/create-purchase-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { BlockStack, Card, EmptyState, Frame, InlineGrid, InlineStack, Page, Select, Text } from '@shopify/polaris';
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
import { PrintModal } from '@web/frontend/components/purchase-orders/modals/PrintModal.js';
import { LocationSelectorModal } from '@web/frontend/components/purchase-orders/modals/LocationSelectorModal.js';
import { VendorSelectorModal } from '@web/frontend/components/purchase-orders/modals/VendorSelectorModal.js';
import { AddEmployeeModal } from '@web/frontend/components/purchase-orders/modals/AddEmployeeModal.js';
import { ImportCustomFieldPresetModal } from '@web/frontend/components/purchase-orders/modals/ImportCustomFieldPresetModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/purchase-orders/modals/SaveCustomFieldPresetModal.js';
import { NewCustomFieldModal } from '@web/frontend/components/purchase-orders/modals/NewCustomFieldModal.js';
import { GeneralCard } from '@web/frontend/components/purchase-orders/GeneralCard.js';
import { ShippingCard } from '@web/frontend/components/purchase-orders/ShippingCard.js';
import { EmployeesCard } from '@web/frontend/components/purchase-orders/EmployeesCard.js';
import { CustomFieldsCard } from '@web/frontend/components/purchase-orders/CustomFieldsCard.js';
import { ProductsCard } from '@web/frontend/components/purchase-orders/ProductsCard.js';
import { Summary } from '@web/frontend/components/purchase-orders/Summary.js';
import { AddProductModal } from '@web/frontend/components/purchase-orders/modals/AddProductModal.js';
import { AddOrderProductModal } from '@web/frontend/components/purchase-orders/modals/AddOrderProductModal.js';
import { Int } from '@web/schemas/generated/create-product.js';
import type { PurchaseOrder } from '@web/services/purchase-orders/types.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';

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

  if (purchaseOrderQuery.isError) {
    return (
      <>
        <Card>
          <EmptyState image={emptyState} heading={'An error occurred'}>
            <Text as={'p'} variant={'bodyLg'} fontWeight={'bold'} tone={'critical'}>
              {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading purchase order')}
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
    const { defaultPurchaseOrderStatus } = settingsQuery.data.settings;
    createPurchaseOrder = defaultCreatePurchaseOrder({ status: defaultPurchaseOrderStatus });

    const defaultCustomFieldPresets = customFieldsPresetsQuery.data.filter(preset => preset.default);
    const defaultCustomFieldKeys = defaultCustomFieldPresets.flatMap(preset => preset.keys);

    createPurchaseOrder.customFields = {
      ...Object.fromEntries(defaultCustomFieldKeys.map(key => [key, ''])),
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
  purchaseOrder: PurchaseOrder | null;
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
        if (createPurchaseOrder.name === null) {
          Redirect.create(app).dispatch(
            Redirect.Action.APP,
            `/purchase-orders/${encodeURIComponent(purchaseOrder.name)}`,
          );
        }
      },
    },
  );

  const settingsQuery = useSettingsQuery({ fetch });

  const selectedLocationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const selectedLocation = selectedLocationQuery.data;

  // Default "Ship To" to selected location's address
  useEffect(() => {
    if (!selectedLocation) return;
    if (createPurchaseOrder.shipTo) return;
    dispatch.setPartial({ shipTo: selectedLocation.address?.formatted?.join('\n') ?? null });
  }, [selectedLocation]);

  const vendorsQuery = useVendorsQuery({ fetch });
  const vendorCustomer = vendorsQuery?.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName)?.customer;

  // Default "Ship From" to vendor's default address
  useEffect(() => {
    if (!vendorCustomer) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress?.formatted?.join('\n') });
  }, [vendorCustomer]);

  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isImportCustomFieldPresetModalOpen, setIsImportCustomFieldPresetModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isVendorSelectorModalOpen, setIsVendorSelectorModalOpen] = useState(false);
  const [isLocationSelectorModalOpen, setIsLocationSelectorModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddOrderProductModalOpen, setIsAddOrderProductModalOpen] = useState(false);

  if (!settingsQuery.data) {
    return <Loading />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <>
      <TitleBar title={'Purchase Orders'} />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: purchaseOrderMutation.isLoading,
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
            options={settings.purchaseOrderStatuses}
            onChange={status => dispatch.setPartial({ status })}
            value={createPurchaseOrder.status}
            disabled={purchaseOrderMutation.isLoading}
          />
        </InlineStack>

        <InlineGrid gap={'400'} columns={2}>
          <GeneralCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isLoading}
            selectedLocation={selectedLocation}
            isLoadingLocation={selectedLocationQuery.isLoading}
            onVendorSelectorClick={() => setIsVendorSelectorModalOpen(true)}
            onLocationSelectorClick={() => setIsLocationSelectorModalOpen(true)}
          />

          <ShippingCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isLoading}
            selectedLocation={selectedLocation}
          />

          <EmployeesCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isLoading}
            onAssignEmployeesClick={() => setIsAddEmployeeModalOpen(true)}
          />

          <CustomFieldsCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isLoading}
            onImportPresetClick={() => setIsImportCustomFieldPresetModalOpen(true)}
            onSavePresetClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
            onAddCustomFieldClick={() => setIsNewCustomFieldModalOpen(true)}
          />

          <ProductsCard
            createPurchaseOrder={createPurchaseOrder}
            purchaseOrder={purchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isLoading}
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
            onAddOrderProductClick={() => {
              if (!createPurchaseOrder.locationId) {
                setToastAction({ content: 'You must select a location to add products' });
                return;
              }

              if (!createPurchaseOrder.vendorName) {
                setToastAction({ content: 'You must select a vendor to add products' });
                return;
              }

              setIsAddOrderProductModalOpen(true);
            }}
            onMarkAllAsNotReceivedClick={() => {
              for (const product of createPurchaseOrder.lineItems) {
                const savedLineItem = purchaseOrder?.lineItems.find(li => li.uuid === product.uuid);
                const minimumAvailableQuantity = savedLineItem?.availableQuantity ?? (0 as Int);
                dispatch.updateProduct({ product: { ...product, availableQuantity: minimumAvailableQuantity as Int } });
              }
            }}
            onMarkAllAsReceivedClick={() => {
              for (const product of createPurchaseOrder.lineItems) {
                dispatch.updateProduct({ product: { ...product, availableQuantity: product.quantity } });
              }
            }}
          />

          <Summary
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            hasUnsavedChanges={hasUnsavedChanges}
            disabled={purchaseOrderMutation.isLoading}
            onSave={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
            isSaving={purchaseOrderMutation.isLoading}
            onPrint={() => setIsPrintModalOpen(true)}
          />
        </InlineGrid>
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
          fieldNames={Object.keys(createPurchaseOrder.customFields)}
          open={isSaveCustomFieldPresetModalOpen}
          onClose={() => setIsSaveCustomFieldPresetModalOpen(false)}
          setToastAction={setToastAction}
        />
      )}

      {isImportCustomFieldPresetModalOpen && (
        <ImportCustomFieldPresetModal
          open={isImportCustomFieldPresetModalOpen}
          onClose={() => setIsImportCustomFieldPresetModalOpen(false)}
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
          setToastAction={setToastAction}
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
          setToastAction={setToastAction}
        />
      )}

      {isPrintModalOpen && (
        <PrintModal
          open={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          setToastAction={setToastAction}
          createPurchaseOrder={createPurchaseOrder}
        />
      )}

      {isAddProductModalOpen && createPurchaseOrder.locationId && createPurchaseOrder.vendorName && (
        <AddProductModal
          open={isAddProductModalOpen}
          locationId={createPurchaseOrder.locationId}
          setToastAction={setToastAction}
          onClose={() => setIsAddProductModalOpen(false)}
          vendorName={createPurchaseOrder.vendorName}
          onAdd={products => dispatch.addProducts({ products })}
        />
      )}

      {isAddOrderProductModalOpen && (
        <AddOrderProductModal
          open={isAddOrderProductModalOpen}
          setToastAction={setToastAction}
          onClose={() => setIsAddOrderProductModalOpen(false)}
          onAdd={products => dispatch.addProducts({ products })}
        />
      )}

      {toast}
    </>
  );
}

import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useCreatePurchaseOrderReducer } from '@work-orders/common/create-purchase-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import {
  Badge,
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
  Spinner,
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
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { PurchaseOrderPrintModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderPrintModal.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { AddEmployeeModal } from '@web/frontend/components/shared-orders/modals/AddEmployeeModal.js';
import { CustomFieldPresetsModal } from '@web/frontend/components/shared-orders/modals/CustomFieldPresetsModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SaveCustomFieldPresetModal.js';
import { NewCustomFieldModal } from '@web/frontend/components/shared-orders/modals/NewCustomFieldModal.js';
import { PurchaseOrderGeneralCard } from '@web/frontend/components/purchase-orders/PurchaseOrderGeneralCard.js';
import { PurchaseOrderShippingCard } from '@web/frontend/components/purchase-orders/PurchaseOrderShippingCard.js';
import { PurchaseOrderEmployeesCard } from '@web/frontend/components/purchase-orders/PurchaseOrderEmployeesCard.js';
import { PurchaseOrderProductsCard } from '@web/frontend/components/purchase-orders/PurchaseOrderProductsCard.js';
import { PurchaseOrderSummary } from '@web/frontend/components/purchase-orders/PurchaseOrderSummary.js';
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
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { uuid } from '@work-orders/common/util/uuid.js';
import { ImportSpecialOrderModal } from '@web/frontend/components/purchase-orders/modals/ImportSpecialOrderModal.js';
import { SupplierSelectorModal } from '@web/frontend/components/selectors/SupplierSelectorModal.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { ProductVariantResourceItemContent } from '@web/frontend/components/ProductVariantResourceList.js';

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

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const defaultLocationId = currentEmployeeQuery.data?.defaultLocationId;

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
    createPurchaseOrder = defaultCreatePurchaseOrder({
      status: purchaseOrders.defaultStatus,
    });

    createPurchaseOrder.locationId = defaultLocationId ?? null;

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

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: createPurchaseOrder.name });
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
  const supplierQuery = useSupplierQuery({ fetch, id: createPurchaseOrder.supplierId });

  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isCustomFieldPresetsModalOpen, setIsCustomFieldPresetsModalOpen] = useState(false);
  const [isFieldValuesModalOpen, setIsFieldValuesModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isSupplierSelectorModalOpen, setIsSupplierSelectorModalOpen] = useState(false);
  const [isLocationSelectorModalOpen, setIsLocationSelectorModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isProductVariantSelectorOpen, setIsProductVariantSelectorOpen] = useState(false);
  const [isSpecialOrderModalOpen, setIsSpecialOrderModalOpen] = useState(false);
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
            onVendorSelectorClick={() => setIsSupplierSelectorModalOpen(true)}
            onLocationSelectorClick={() => setIsLocationSelectorModalOpen(true)}
          />

          <PurchaseOrderShippingCard
            createPurchaseOrder={createPurchaseOrder}
            dispatch={dispatch}
            disabled={purchaseOrderMutation.isPending}
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

                if (!createPurchaseOrder.supplierId) {
                  setToastAction({ content: 'You must select a supplier to add products' });
                  return;
                }

                setIsProductVariantSelectorOpen(true);
              }}
              action={
                !!createPurchaseOrder.name && !hasUnsavedChanges ? (
                  <NewPurchaseOrderReceiptButton
                    purchaseOrderName={createPurchaseOrder.name}
                    disabled={hasUnsavedChanges}
                    props={{ icon: undefined, children: 'Receive products' }}
                  />
                ) : (
                  <Tooltip content="You must save your purchase order before you can receive products.">
                    <BaseNewPurchaseOrderReceiptButton disabled icon={undefined} children={'Receive products'} />
                  </Tooltip>
                )
              }
            />
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <PurchaseOrderReceipts
                disabled={purchaseOrderMutation.isPending || hasUnsavedChanges || !createPurchaseOrder.name}
                purchaseOrderName={createPurchaseOrder.name}
                action={
                  !!createPurchaseOrder.name && !hasUnsavedChanges ? (
                    <NewPurchaseOrderReceiptButton
                      purchaseOrderName={createPurchaseOrder.name}
                      disabled={hasUnsavedChanges}
                    />
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
                action={tasks =>
                  !!createPurchaseOrder.name ? (
                    <NewLinkedTaskButton
                      links={{ purchaseOrders: [createPurchaseOrder.name] }}
                      suggestedDeadlines={tasks.map(task => task.deadline).filter(isNonNullable)}
                    />
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

      {isSupplierSelectorModalOpen && (
        <SupplierSelectorModal
          open={isSupplierSelectorModalOpen}
          onClose={() => setIsSupplierSelectorModalOpen(false)}
          onSelect={supplier => {
            dispatch.setSupplier({ supplierId: supplier.id });
            setIsSupplierSelectorModalOpen(false);
          }}
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

      <ProductVariantSelectorModal
        open={isProductVariantSelectorOpen && !isSpecialOrderModalOpen}
        onClose={() => setIsProductVariantSelectorOpen(false)}
        filters={{
          type: ['product', 'serial'],
          status: ['active'],
          locationId: [createPurchaseOrder.locationId].filter(isNonNullable),
          vendor: supplierQuery.data?.vendors,
        }}
        closeOnSelect={false}
        render={productVariant => {
          const purchaseOrderQuantity = createPurchaseOrder.lineItems
            .filter(lineItem => lineItem.productVariantId === productVariant.id)
            .map(lineItem => lineItem.quantity)
            .reduce((a, b) => a + b, 0);

          const purchaseOrderReceiptQuantity =
            purchaseOrderQuery.data?.receipts
              .filter(receipt => receipt.status === 'COMPLETED')
              .flatMap(receipt => receipt.lineItems)
              .map(lineItem => lineItem.quantity)
              .reduce((a, b) => a + b, 0) ?? 0;

          const unsavedProductVariantQuantity = purchaseOrderQuantity - purchaseOrderReceiptQuantity;

          return (
            <ProductVariantResourceItemContent
              productVariant={productVariant}
              right={
                <InventoryItemAvailableQuantityBadge
                  inventoryItemId={productVariant.inventoryItem.id}
                  locationId={createPurchaseOrder.locationId}
                  delta={unsavedProductVariantQuantity}
                />
              }
            />
          );
        }}
        onSelect={productVariant => {
          setToastAction({ content: `Added ${getProductVariantName(productVariant)}` });

          dispatch.addProducts({
            products: [
              {
                uuid: uuid(),
                specialOrderLineItem: null,
                unitCost: (productVariant.inventoryItem.unitCost?.amount as Money | undefined) ?? ('0.00' as Money),
                productVariantId: productVariant.id,
                quantity: 1,
                customFields: lineItemCustomFieldsPresetsQuery.data?.defaultCustomFields ?? {},
                serialNumber: null,
              },
            ],
          });
        }}
        secondaryActions={[
          {
            content: 'Import special order',
            onAction: () => setIsSpecialOrderModalOpen(true),
          },
        ]}
      />

      {createPurchaseOrder.locationId && createPurchaseOrder.supplierId && (
        <ImportSpecialOrderModal
          open={isSpecialOrderModalOpen}
          onClose={() => setIsSpecialOrderModalOpen(false)}
          createPurchaseOrder={createPurchaseOrder}
          locationId={createPurchaseOrder.locationId}
          supplierId={createPurchaseOrder.supplierId}
          onSelect={products => {
            dispatch.addProducts({ products });
            setToastAction({ content: 'Special order imported' });
          }}
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

// TODO: Dedup with tommy branch
function InventoryItemAvailableQuantityBadge({
  inventoryItemId,
  locationId,
  delta = 0,
}: {
  inventoryItemId: ID;
  locationId: ID | null;
  /**
   * Optional delta to change the available quantity by.
   * Can be used to account for unsaved changes
   */
  delta?: number;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const inventoryItemQuery = useInventoryItemQuery({ fetch, id: inventoryItemId, locationId });
  const availableQuantity = inventoryItemQuery.data?.inventoryLevel?.quantities.find(
    q => q.name === 'available',
  )?.quantity;
  const adjustedAvailableQuantity = availableQuantity !== undefined ? availableQuantity + delta : undefined;

  // 🤠
  const nbsp = '\u00A0';

  return (
    <InlineStack align="end">
      {adjustedAvailableQuantity !== undefined && (
        <Badge
          tone={adjustedAvailableQuantity > 0 ? 'success' : 'warning'}
        >{`${adjustedAvailableQuantity}${nbsp}available`}</Badge>
      )}

      {inventoryItemQuery.isLoading && <Spinner size="small" />}

      {toast}
    </InlineStack>
  );
}

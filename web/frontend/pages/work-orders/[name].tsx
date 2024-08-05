import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useReducer, useRef, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import {
  Banner,
  BlockStack,
  Box,
  Card,
  EmptyState,
  Frame,
  InlineGrid,
  InlineStack,
  List,
  Page,
  Select,
  Text,
} from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { emptyState } from '@web/frontend/assets/index.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCreateWorkOrderReducer, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import { defaultCreateWorkOrder } from '@work-orders/common/create-work-order/default.js';
import { WorkOrder as WorkOrderType } from '@web/services/work-orders/types.js';
import {
  SaveWorkOrderValidationErrors,
  useSaveWorkOrderMutation,
} from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { WorkOrderGeneralCard } from '@web/frontend/components/work-orders/WorkOrderGeneralCard.js';
import { CustomerSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomerSelectorModal.js';
import { WorkOrderCustomFieldsCard } from '@web/frontend/components/work-orders/WorkOrderCustomFieldsCard.js';
import { NewCustomFieldModal } from '@web/frontend/components/shared-orders/modals/NewCustomFieldModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SaveCustomFieldPresetModal.js';
import { CustomFieldPresetsModal } from '@web/frontend/components/shared-orders/modals/CustomFieldPresetsModal.js';
import { WorkOrderPrintModal } from '@web/frontend/components/work-orders/modals/WorkOrderPrintModal.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { WorkOrderItemsCard } from '@web/frontend/components/work-orders/WorkOrderItemsCard.js';
import { WorkOrderSummary } from '@web/frontend/components/work-orders/WorkOrderSummary.js';
import { AddProductModal } from '@web/frontend/components/shared-orders/modals/AddProductModal.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { EditCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/EditCustomFieldPresetModal.js';
import { groupBy } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNonNullableProperty } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { CreateOrderModal } from '@web/frontend/components/work-orders/modals/CreateOrderModal.js';
import { CompanySelectorModal } from '@web/frontend/components/work-orders/modals/CompanySelectorModal.js';
import { CompanyLocationSelectorModal } from '@web/frontend/components/work-orders/modals/CompanyLocationSelectorModal.js';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { PaymentTermsSelectorModal } from '@web/frontend/components/work-orders/modals/PaymentTermsSelectorModal.js';
import { CustomFieldValuesSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomFieldValuesSelectorModal.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_work_orders', 'read_settings']}>
          <WorkOrderLoader />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function WorkOrderLoader() {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderQuery = useWorkOrderQuery({ fetch, name }, { enabled: name !== 'new', retry: false });

  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'WORK_ORDER' });

  const app = useAppBridge();
  if (!name) {
    Redirect.create(app).dispatch(Redirect.Action.APP, '/work-orders');
    return null;
  }

  if (workOrderQuery.isError || settingsQuery.isError || customFieldsPresetsQuery.isError) {
    return (
      <>
        <Card>
          <EmptyState image={emptyState} heading={'An error occurred'}>
            <Text as={'p'} variant={'bodyLg'} fontWeight={'bold'} tone={'critical'}>
              {extractErrorMessage(
                workOrderQuery.error ?? settingsQuery.error ?? customFieldsPresetsQuery.error,
                'An error occurred while loading work order',
              )}
            </Text>
          </EmptyState>
        </Card>
        {toast}
      </>
    );
  }

  if ((name !== 'new' && !workOrderQuery.data) || !settingsQuery.data || !customFieldsPresetsQuery.data) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  let createWorkOrder;

  if (workOrderQuery.data?.workOrder) {
    createWorkOrder = workOrderToCreateWorkOrder(workOrderQuery.data.workOrder);
  } else {
    const { defaultStatus } = settingsQuery.data.settings;
    createWorkOrder = defaultCreateWorkOrder({ status: defaultStatus });

    createWorkOrder.customFields = {
      ...customFieldsPresetsQuery.data.defaultCustomFields,
      ...createWorkOrder.customFields,
    };
  }

  return (
    <>
      <WorkOrder
        initialCreateWorkOrder={createWorkOrder}
        workOrder={!workOrderQuery.isFetching ? workOrderQuery.data?.workOrder ?? null : undefined}
      />
      {toast}
    </>
  );
}

export type Location = ReturnType<typeof useLocationQuery>['data'];

function WorkOrder({
  initialCreateWorkOrder,
  workOrder,
}: {
  initialCreateWorkOrder: WIPCreateWorkOrder;
  workOrder: WorkOrderType | null | undefined;
}) {
  const app = useAppBridge();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [createWorkOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreateWorkOrderReducer(
    initialCreateWorkOrder,
    workOrder,
    { useReducer, useState, useRef },
  );

  const workOrderMutation = useSaveWorkOrderMutation(
    { fetch },
    {
      onSuccess: workOrder => {
        const message = createWorkOrder.name ? 'Work order updated' : 'Work order created';
        setToastAction({ content: message });
        dispatch.set(workOrderToCreateWorkOrder(workOrder));
        setHasUnsavedChanges(false);
        if (createWorkOrder.name === null) {
          Redirect.create(app).dispatch(Redirect.Action.APP, `/work-orders/${encodeURIComponent(workOrder.name)}`);
        }
      },
    },
  );

  const settingsQuery = useSettingsQuery({ fetch });

  const [isCustomerSelectorModalOpen, setIsCustomerSelectorModalOpen] = useState(false);
  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isCustomFieldPresetsModalOpen, setIsCustomFieldPresetsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isFieldValuesModalOpen, setIsFieldValuesModalOpen] = useState(false);
  const [customFieldPresetNameToEdit, setCustomFieldPresetNameToEdit] = useState<string>();
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isCompanySelectorModalOpen, setIsCompanySelectorModalOpen] = useState(false);
  const [isCompanyLocationSelectorModalOpen, setIsCompanyLocationSelectorModalOpen] = useState(false);
  const [isPaymentTermsSelectorModalOpen, setIsPaymentTermsSelectorModalOpen] = useState(false);

  const isModalOpen = [
    isCustomerSelectorModalOpen,
    isNewCustomFieldModalOpen,
    isSaveCustomFieldPresetModalOpen,
    isCustomFieldPresetsModalOpen,
    isPrintModalOpen,
    isFieldValuesModalOpen,
    isCreateOrderModalOpen,
    isCompanySelectorModalOpen,
    isCompanyLocationSelectorModalOpen,
    isPaymentTermsSelectorModalOpen,
    !!customFieldPresetNameToEdit,
  ].some(Boolean);

  // all nested useCalculatedDraftOrderQuery's are disabled s.t. only this one fetches when no modals are opened
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...pick(
        createWorkOrder,
        'name',
        'customerId',
        'items',
        'charges',
        'discount',
        'companyLocationId',
        'companyId',
        'companyContactId',
      ),
    },
    { enabled: !isModalOpen },
  );

  if (!settingsQuery.data) {
    return <Loading />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <Box paddingBlockEnd={'1600'}>
      <TitleBar title={'Work Orders'} />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: workOrderMutation.isLoading,
          onAction: () => workOrderMutation.mutate(createWorkOrder),
        }}
        discardAction={{
          onAction: () => {
            dispatch.set(initialCreateWorkOrder);
            setHasUnsavedChanges(false);
          },
        }}
      />

      {workOrderMutation.error instanceof SaveWorkOrderValidationErrors && (
        <Box paddingBlock={'800'}>
          <Banner title="Cannot save work order" tone="critical">
            <List>
              {Object.entries(workOrderMutation.error.errors).map(([key, value]) => (
                <List.Item key={key}>
                  {titleCase(key)}: {value}
                </List.Item>
              ))}
            </List>
          </Banner>
        </Box>
      )}

      <BlockStack gap={'400'}>
        <InlineStack align={'space-between'}>
          <Text as={'h1'} variant={'headingLg'} fontWeight={'bold'}>
            {createWorkOrder.name ?? 'New work order'}
          </Text>
          <Select
            label={'Status'}
            requiredIndicator
            options={settings.statuses}
            onChange={status => dispatch.setPartial({ status })}
            value={createWorkOrder.status}
            disabled={workOrderMutation.isLoading}
          />
        </InlineStack>

        <InlineGrid gap={'400'} columns={2}>
          <WorkOrderGeneralCard
            createWorkOrder={createWorkOrder}
            dispatch={dispatch}
            disabled={workOrderMutation.isLoading}
            onCustomerSelectorClick={() => setIsCustomerSelectorModalOpen(true)}
            onCompanySelectorClick={() => setIsCompanySelectorModalOpen(true)}
            onCompanyLocationSelectorClick={() => setIsCompanyLocationSelectorModalOpen(true)}
            onPaymentTermsSelectorClick={() => setIsPaymentTermsSelectorModalOpen(true)}
          />

          <WorkOrderCustomFieldsCard
            createWorkOrder={createWorkOrder}
            dispatch={dispatch}
            disabled={workOrderMutation.isLoading}
            onAddCustomFieldClick={() => setIsNewCustomFieldModalOpen(true)}
            onSavePresetClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
            onPresetsClick={() => setIsCustomFieldPresetsModalOpen(true)}
            onFieldValuesClick={() => setIsFieldValuesModalOpen(true)}
          />
        </InlineGrid>

        <WorkOrderItemsCard
          createWorkOrder={createWorkOrder}
          dispatch={dispatch}
          workOrder={workOrder ?? null}
          disabled={workOrderMutation.isLoading}
          isLoading={calculatedDraftOrderQuery.isLoading}
        />

        <WorkOrderSummary
          createWorkOrder={createWorkOrder}
          hasUnsavedChanges={hasUnsavedChanges}
          disabled={workOrderMutation.isLoading}
          onSave={() => workOrderMutation.mutate(createWorkOrder)}
          isSaving={workOrderMutation.isLoading}
          onPrint={() => setIsPrintModalOpen(true)}
          onCreateOrder={() => setIsCreateOrderModalOpen(true)}
        />
      </BlockStack>

      {isCustomerSelectorModalOpen && (
        <CustomerSelectorModal
          open={isCustomerSelectorModalOpen}
          onClose={() => setIsCustomerSelectorModalOpen(false)}
          onSelect={customerId => dispatch.setCustomer({ customerId })}
          onSelectCompany={() => setIsCompanySelectorModalOpen(true)}
          setToastAction={setToastAction}
        />
      )}

      {/*TODO: Nicer way of making this remount*/}
      {isNewCustomFieldModalOpen && (
        <NewCustomFieldModal
          open={isNewCustomFieldModalOpen}
          existingFields={Object.keys(createWorkOrder.customFields)}
          onClose={() => setIsNewCustomFieldModalOpen(false)}
          onAdd={(fieldName, fieldValue) =>
            dispatch.setPartial({
              customFields: {
                ...createWorkOrder.customFields,
                [fieldName]: fieldValue,
              },
            })
          }
        />
      )}

      {isSaveCustomFieldPresetModalOpen && (
        <SaveCustomFieldPresetModal
          type={'WORK_ORDER'}
          fieldNames={Object.keys(createWorkOrder.customFields)}
          open={isSaveCustomFieldPresetModalOpen}
          onClose={() => setIsSaveCustomFieldPresetModalOpen(false)}
          setToastAction={setToastAction}
        />
      )}

      {isCustomFieldPresetsModalOpen && (
        <CustomFieldPresetsModal
          type={'WORK_ORDER'}
          open={isCustomFieldPresetsModalOpen && !customFieldPresetNameToEdit}
          onClose={() => setIsCustomFieldPresetsModalOpen(false)}
          onEdit={presetName => setCustomFieldPresetNameToEdit(presetName)}
          onOverride={fieldNames => {
            dispatch.setPartial({
              customFields: Object.fromEntries(
                fieldNames.map(fieldName => [fieldName, createWorkOrder.customFields[fieldName] ?? '']),
              ),
            });
          }}
          onMerge={fieldNames => {
            dispatch.setPartial({
              customFields: {
                ...createWorkOrder.customFields,
                ...Object.fromEntries(
                  fieldNames.map(fieldName => [fieldName, createWorkOrder.customFields[fieldName] ?? '']),
                ),
              },
            });
          }}
          setToastAction={setToastAction}
        />
      )}

      {isFieldValuesModalOpen && (
        <CustomFieldValuesSelectorModal
          names={Object.keys(createWorkOrder.customFields)}
          open={isFieldValuesModalOpen}
          onClose={() => setIsFieldValuesModalOpen(false)}
        />
      )}

      {isPrintModalOpen && (
        <WorkOrderPrintModal
          open={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          setToastAction={setToastAction}
          createWorkOrder={createWorkOrder}
        />
      )}

      {!!customFieldPresetNameToEdit && (
        <EditCustomFieldPresetModal
          open={!!customFieldPresetNameToEdit}
          onClose={() => setCustomFieldPresetNameToEdit(undefined)}
          setToastAction={setToastAction}
          name={customFieldPresetNameToEdit}
          type="WORK_ORDER"
        />
      )}

      {isCreateOrderModalOpen && (
        <CreateOrderModal
          workOrder={workOrder ?? null}
          open={isCreateOrderModalOpen}
          onClose={() => setIsCreateOrderModalOpen(false)}
          setToastAction={setToastAction}
        />
      )}

      {isCompanySelectorModalOpen && (
        <CompanySelectorModal
          open={isCompanySelectorModalOpen}
          onClose={() => setIsCompanySelectorModalOpen(false)}
          onSelect={(companyId, customerId, companyContactId) => {
            dispatch.setCompany({
              companyId,
              companyContactId,
              customerId,
              companyLocationId: null,
              paymentTerms: null,
            });
            setIsCompanyLocationSelectorModalOpen(true);
          }}
          setToastAction={setToastAction}
        />
      )}

      {isCompanyLocationSelectorModalOpen && createWorkOrder.companyId && (
        <CompanyLocationSelectorModal
          open={isCompanyLocationSelectorModalOpen}
          onClose={() => setIsCompanyLocationSelectorModalOpen(false)}
          onSelect={location => {
            const paymentTerms = location.buyerExperienceConfiguration?.paymentTermsTemplate?.id
              ? {
                  templateId: location.buyerExperienceConfiguration.paymentTermsTemplate.id,
                  date: new Date(Date.now() + 30 * DAY_IN_MS).toISOString() as DateTime,
                }
              : null;

            const { companyId, companyContactId, customerId } = createWorkOrder;
            dispatch.setCompany({
              companyLocationId: location.id,
              companyContactId,
              companyId,
              customerId: customerId!,
              paymentTerms,
            });
          }}
          setToastAction={setToastAction}
          companyId={createWorkOrder.companyId}
        />
      )}

      {isPaymentTermsSelectorModalOpen && (
        <PaymentTermsSelectorModal
          open={isPaymentTermsSelectorModalOpen}
          onClose={() => setIsPaymentTermsSelectorModalOpen(false)}
          onSelect={paymentTerms => dispatch.setPartial({ paymentTerms })}
          setToastAction={setToastAction}
          initialPaymentTerms={createWorkOrder.paymentTerms}
        />
      )}

      {toast}
    </Box>
  );
}

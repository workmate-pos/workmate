import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useCreatePurchaseOrderReducer } from '@work-orders/common/create-purchase-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { ToastActionCallable, useToast } from '@teifi-digital/shopify-app-react';
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  EmptyState,
  Filters,
  Frame,
  InlineError,
  InlineGrid,
  InlineStack,
  Label,
  Modal,
  Page,
  ResourceItem,
  ResourceList,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { usePurchaseOrderCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-purchase-order-custom-fields-presets-query.js';
import { usePurchaseOrderCustomFieldsPresetMutation } from '@work-orders/common/queries/use-purchase-order-custom-fields-preset-mutation.js';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useEmployeesQuery } from '@work-orders/common/queries/use-employees-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

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

  if ((name !== 'new' && !purchaseOrderQuery.data) || !settingsQuery.data) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  return (
    <>
      <PurchaseOrder
        initialCreatePurchaseOrder={{
          ...defaultCreatePurchaseOrder({
            status: settingsQuery.data.settings.defaultPurchaseOrderStatus,
          }),
          ...(purchaseOrderQuery.data ? createPurchaseOrderFromPurchaseOrder(purchaseOrderQuery.data) : {}),
        }}
      />
      {toast}
    </>
  );
}

function PurchaseOrder({ initialCreatePurchaseOrder }: { initialCreatePurchaseOrder: CreatePurchaseOrder }) {
  const [query, setQuery] = useState('');

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
        const message = !!createPurchaseOrder.name ? 'Purchase order updated' : 'Purchase order created';
        setToastAction({ content: message });
        dispatch.set(createPurchaseOrderFromPurchaseOrder(purchaseOrder));
        setHasUnsavedChanges(false);
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

  const assignedEmployeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);
  const employeeQueries = useEmployeeQueries({ fetch, ids: assignedEmployeeIds });

  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isImportCustomFieldPresetModalOpen, setIsImportCustomFieldPresetModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  if (!settingsQuery.data) {
    return <Loading />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <>
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
          <Card>
            <BlockStack gap={'400'}>
              <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
                General
              </Text>

              <TextField
                label={'Vendor'}
                autoComplete={'off'}
                requiredIndicator
                value={createPurchaseOrder.vendorName ?? ''}
                onFocus={() => {
                  // TODO: Popup
                  console.log('pop up');
                }}
                disabled={purchaseOrderMutation.isLoading}
                readOnly
              />
              {/*TODO:pop up*/}
              <TextField
                label={'Location'}
                requiredIndicator
                autoComplete={'off'}
                value={createPurchaseOrder.locationId ? selectedLocation?.name ?? 'Unknown location' : ''}
                onFocus={() => {
                  // TODO: Popup
                }}
                multiline
                disabled={purchaseOrderMutation.isLoading}
                readOnly
              />
              <TextField
                label={'Note'}
                autoComplete={'off'}
                value={createPurchaseOrder.note ?? ''}
                multiline={2}
                onChange={note => dispatch.setPartial({ note })}
                disabled={purchaseOrderMutation.isLoading}
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap={'400'}>
              <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
                Shipping
              </Text>

              <TextField
                label={'Ship From'}
                autoComplete={'off'}
                value={createPurchaseOrder.shipFrom ?? ''}
                onChange={(value: string) => dispatch.setPartial({ shipFrom: value })}
                multiline={3}
                disabled={purchaseOrderMutation.isLoading}
              />
              <TextField
                label={'Ship To'}
                autoComplete={'off'}
                value={createPurchaseOrder.shipTo ?? ''}
                onChange={(value: string) => dispatch.setPartial({ shipTo: value })}
                multiline={3}
                labelAction={
                  selectedLocation
                    ? {
                        content: 'Use location address',
                        onAction() {
                          dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') });
                        },
                      }
                    : undefined
                }
                disabled={purchaseOrderMutation.isLoading}
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap={'400'}>
              <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
                Employees
              </Text>
              <ResourceList
                items={createPurchaseOrder.employeeAssignments}
                loading={createPurchaseOrder.employeeAssignments.some(
                  employee => employeeQueries[employee.employeeId]?.isLoading,
                )}
                renderItem={employee => {
                  const query = employeeQueries[employee.employeeId];

                  return (
                    <InlineStack gap={'200'} align={'space-between'}>
                      <Text as={'p'}>{query?.data?.name ?? 'Unknown Employee'}</Text>
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
                        disabled={purchaseOrderMutation.isLoading}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  );
                }}
              />
              <Button onClick={() => setIsAddEmployeeModalOpen(true)} disabled={purchaseOrderMutation.isLoading}>
                Assign Employees
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap={'400'}>
              <InlineStack align={'space-between'}>
                <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
                  Custom Fields
                </Text>
                <ButtonGroup>
                  <Button
                    variant={'plain'}
                    onClick={() => setIsImportCustomFieldPresetModalOpen(true)}
                    disabled={purchaseOrderMutation.isLoading}
                  >
                    Import preset
                  </Button>
                  <Button
                    variant={'plain'}
                    disabled={
                      Object.keys(createPurchaseOrder.customFields).length === 0 || purchaseOrderMutation.isLoading
                    }
                    onClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
                  >
                    Save as preset
                  </Button>
                </ButtonGroup>
              </InlineStack>

              {Object.entries(createPurchaseOrder.customFields).map(([key, value], i) => (
                <TextField
                  key={i}
                  autoComplete={'off'}
                  label={key}
                  value={value}
                  onChange={(value: string) =>
                    dispatch.setPartial({ customFields: { ...createPurchaseOrder.customFields, [key]: value } })
                  }
                  labelAction={
                    !purchaseOrderMutation.isLoading
                      ? {
                          content: 'Remove',
                          onAction: () => {
                            const filteredCustomFields = Object.fromEntries(
                              Object.entries(createPurchaseOrder.customFields).filter(([k]) => k !== key),
                            );
                            dispatch.setPartial({ customFields: filteredCustomFields });
                          },
                        }
                      : undefined
                  }
                  disabled={purchaseOrderMutation.isLoading}
                />
              ))}

              <Button onClick={() => setIsNewCustomFieldModalOpen(true)} disabled={purchaseOrderMutation.isLoading}>
                Add Custom Field
              </Button>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap={'400'}>
              <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
                Products
              </Text>
              {/*TODO: Popup*/}
              <Button onClick={() => {}}>Add Product</Button>
            </BlockStack>
          </Card>

          <BlockStack gap={'400'}>
            <InlineGrid gap={'400'} columns={2}>
              <TextField label={'Subtotal'} autoComplete={'off'} readOnly value={'todo'} prefix={'$'} />
              <TextField label={'Discount'} autoComplete={'off'} value={'todo'} prefix={'$'} />
              <TextField label={'Tax'} autoComplete={'off'} value={'todo'} prefix={'$'} />
              <TextField label={'Shipping'} autoComplete={'off'} value={'todo'} prefix={'$'} />
              <TextField label={'Total'} autoComplete={'off'} readOnly value={'todo'} prefix={'$'} />
              <TextField label={'Deposited'} autoComplete={'off'} value={'todo'} prefix={'$'} />
              <TextField label={'Paid'} autoComplete={'off'} value={'todo'} prefix={'$'} />
              <TextField label={'Balance Due'} autoComplete={'off'} readOnly value={'todo'} prefix={'$'} />
            </InlineGrid>

            <ButtonGroup variant={'segmented'} fullWidth>
              <Button disabled={purchaseOrderMutation.isLoading || !createPurchaseOrder.name}>Print</Button>
              <Button
                variant={'primary'}
                onClick={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
                loading={purchaseOrderMutation.isLoading}
              >
                Save
              </Button>
            </ButtonGroup>
          </BlockStack>
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

      {toast}
    </>
  );
}

function NewCustomFieldModal({
  open,
  onClose,
  onAdd,
  existingFields,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (fieldName: string, fieldValue: string) => void;
  existingFields: string[];
}) {
  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');

  const isValid = !!fieldName && !existingFields.includes(fieldName);

  return (
    <Modal
      open={open}
      title={'New Custom Field'}
      onClose={onClose}
      primaryAction={{
        content: 'Add',
        disabled: !isValid,
        onAction: () => {
          onAdd(fieldName, fieldValue);
          onClose();
        },
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap={'400'}>
          <TextField
            label={'Field Name'}
            autoComplete={'off'}
            requiredIndicator
            value={fieldName}
            onChange={(value: string) => setFieldName(value)}
            error={existingFields.includes(fieldName) ? 'Field already exists' : undefined}
          />
          <TextField
            label={'Field Value'}
            autoComplete={'off'}
            value={fieldValue}
            onChange={(value: string) => setFieldValue(value)}
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

function SaveCustomFieldPresetModal({
  fieldNames,
  open,
  onClose,
  setToastAction,
}: {
  fieldNames: string[];
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = usePurchaseOrderCustomFieldsPresetsQuery({ fetch });
  const presetMutation = usePurchaseOrderCustomFieldsPresetMutation({ fetch });

  const [name, setName] = useState('');
  const [selectedFieldNames, setSelectedFieldNames] = useState(fieldNames);

  const presetNameInUse = presetsQuery.data?.some(preset => preset.name === name) ?? false;

  return (
    <Modal
      title={'Save Custom Field Preset'}
      open={open}
      onClose={onClose}
      primaryAction={{
        content: !presetNameInUse ? 'Save preset' : 'Override preset',
        loading: presetMutation.isLoading,
        onAction: async () => {
          if (!selectedFieldNames.length) {
            return;
          }

          await presetMutation.mutateAsync({ name, keys: selectedFieldNames as [string, ...string[]] });
          setToastAction({ content: 'Preset saved' });
          onClose();
        },
        disabled: !name || !selectedFieldNames.length,
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap={'400'}>
          <TextField
            label={'Preset Name'}
            autoComplete={'off'}
            requiredIndicator
            value={name}
            disabled={presetMutation.isLoading}
            onChange={(value: string) => setName(value)}
            error={presetNameInUse ? 'A preset with this name already exists' : undefined}
          />
          <Label id={'selected-fields'}>Selected Fields</Label>
          <InlineGrid gap={'400'} columns={2}>
            {fieldNames.map(fieldName => (
              <Checkbox
                key={fieldName}
                label={fieldName}
                value={fieldName}
                checked={selectedFieldNames.includes(fieldName)}
                onChange={value => {
                  if (value) {
                    setSelectedFieldNames([...selectedFieldNames, fieldName]);
                  } else {
                    setSelectedFieldNames(selectedFieldNames.filter(f => f !== fieldName));
                  }
                }}
              />
            ))}
          </InlineGrid>
          {selectedFieldNames.length === 0 && (
            <InlineError message={'You must select at least one field'} fieldID={'selected-fields'} />
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

function ImportCustomFieldPresetModal({
  open,
  onOverride,
  onMerge,
  onClose,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onOverride: (fieldNames: string[]) => void;
  onMerge: (fieldNames: string[]) => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = usePurchaseOrderCustomFieldsPresetsQuery({ fetch });

  const [query, setQuery] = useState('');

  const presets = presetsQuery.data ?? [];
  const filteredPresets = presets.filter(preset => {
    return (
      preset.name.toLowerCase().includes(query.toLowerCase()) ||
      preset.keys.some(key => key.toLowerCase().includes(query.toLowerCase()))
    );
  });

  return (
    <Modal open={open} title={'Import Custom Field Preset'} onClose={onClose}>
      <ResourceList
        items={filteredPresets}
        resourceName={{ plural: 'presets', singular: 'preset' }}
        emptyState={
          <Box paddingBlockStart={'500'} paddingBlockEnd={'1000'}>
            <InlineStack align={'center'}>
              <Text as={'p'} variant={'bodyMd'}>
                No presets found
              </Text>
            </InlineStack>
          </Box>
        }
        filterControl={
          <Filters
            filters={[]}
            appliedFilters={[]}
            loading={presetsQuery.isLoading}
            queryValue={query}
            queryPlaceholder={'Search presets'}
            onQueryChange={query => setQuery(query)}
            onQueryClear={() => setQuery('')}
            onClearAll={() => setQuery('')}
          />
        }
        loading={presetsQuery.isLoading}
        renderItem={preset => (
          <ResourceItem
            id={preset.name}
            onClick={() => {}}
            persistActions
            shortcutActions={[
              {
                content: 'Override',
                onAction: () => {
                  onOverride([...preset.keys]);
                  setToastAction({ content: 'Imported preset' });
                  onClose();
                },
              },
              {
                content: 'Merge',
                onAction: () => {
                  onMerge([...preset.keys]);
                  setToastAction({ content: 'Imported preset' });
                  onClose();
                },
              },
            ]}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {preset.name}
            </Text>
            <Text as={'p'} variant={'bodyMd'}>
              {preset.keys.join(', ')}
            </Text>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}

function AddEmployeeModal({
  open,
  onClose,
  onUpdate,
  selectedEmployeeIds,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onUpdate: (selectedEmployeeIds: ID[]) => void;
  selectedEmployeeIds: ID[];
  setToastAction: ToastActionCallable;
}) {
  const [page, setPage] = useState(0);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const employeesQuery = useEmployeesQuery({ fetch, params: {} });
  const employees =
    employeesQuery.data?.pages?.[page]?.filter(employee => !selectedEmployeeIds.includes(employee.id)) ?? [];

  const employeeQueries = useEmployeeQueries({ fetch, ids: selectedEmployeeIds });
  const selectedEmployees = selectedEmployeeIds.map(id => employeeQueries[id]?.data).filter(isNonNullable);

  const items = [...selectedEmployees, ...employees];

  return (
    <Modal open={open} title={'Assign Employees'} onClose={onClose}>
      <ResourceList
        items={items}
        resourceName={{ plural: 'employees', singular: 'employee' }}
        resolveItemId={employee => employee.id}
        loading={
          Object.values(employeeQueries).some(query => query.isLoading) ||
          employeesQuery.isLoading ||
          employeesQuery.isFetchingNextPage
        }
        pagination={{
          hasNext: (employeesQuery.data && page < employeesQuery.data.pages.length - 1) || employeesQuery.hasNextPage,
          hasPrevious: page > 0,
          onPrevious: () => setPage(page => page - 1),
          onNext: () => {
            if (employeesQuery.data && employeesQuery.data.pages.length - 1 === page) {
              employeesQuery.fetchNextPage();
            }

            setPage(page => page + 1);
          },
        }}
        selectable
        selectedItems={selectedEmployeeIds}
        onSelectionChange={selectedEmployeeIds => {
          if (selectedEmployeeIds === 'All') {
            return onUpdate(items.map(item => item.id));
          }

          onUpdate(
            selectedEmployeeIds.map(id => {
              assertGid(id);
              return id;
            }),
          );
        }}
        renderItem={employee => {
          const isSelected = selectedEmployeeIds.includes(employee.id);

          const onClick = () => {
            if (isSelected) {
              onUpdate(selectedEmployeeIds.filter(id => id !== employee.id));
            } else {
              onUpdate([...selectedEmployeeIds, employee.id]);
            }
          };

          return (
            <ResourceItem id={employee.id} key={employee.id} onClick={onClick}>
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {employee.name}
              </Text>
            </ResourceItem>
          );
        }}
      />
    </Modal>
  );
}

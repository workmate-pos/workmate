import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import {
  hasNestedPropertyValue,
  hasNonNullableProperty,
  hasPropertyValue,
  isNonNullable,
} from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Collapsible,
  Divider,
  Icon,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { IntegerField } from '@web/frontend/components/IntegerField.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { v4 as uuid } from 'uuid';
import { SegmentedChargeConfig } from '@web/frontend/components/work-orders/components/SegmentedChargeConfig.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { AddEmployeeModal } from '@web/frontend/components/shared-orders/modals/AddEmployeeModal.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { CustomFieldsList } from '@web/frontend/components/shared-orders/CustomFieldsList.js';
import { NewCustomFieldModal } from '@web/frontend/components/shared-orders/modals/NewCustomFieldModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SaveCustomFieldPresetModal.js';
import { ImportCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/ImportCustomFieldPresetModal.js';
import { CaretUpMinor } from '@shopify/polaris-icons';
import { SelectCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SelectCustomFieldPresetModal.js';
import { EditCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/EditCustomFieldPresetModal.js';

export function WorkOrderItemModal({
  createWorkOrder,
  itemUuid,
  workOrder,
  open,
  onClose,
  setToastAction,
  onSave,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  itemUuid: string;
  workOrder: WorkOrder | null;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  onSave: (
    item: CreateWorkOrder['items'][number],
    charges: DiscriminatedUnionOmit<CreateWorkOrder['charges'][number], 'workOrderItem'>[],
  ) => void;
}) {
  const [forceShowCharges, setForceShowCharges] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isImportCustomFieldPresetModalOpen, setIsImportCustomFieldPresetModalOpen] = useState(false);
  const [isSelectCustomFieldPresetToEditModalOpen, setIsSelectCustomFieldPresetToEditModalOpen] = useState(false);
  const [customFieldPresetNameToEdit, setCustomFieldPresetNameToEdit] = useState<string>();

  const isSubModalOpen = [
    isAddEmployeeModalOpen,
    isNewCustomFieldModalOpen,
    isSaveCustomFieldPresetModalOpen,
    isImportCustomFieldPresetModalOpen,
    isSelectCustomFieldPresetToEditModalOpen,
    !!customFieldPresetNameToEdit,
  ].some(Boolean);

  // TODO: Support custom items
  const initialCharges =
    createWorkOrder.charges
      .filter(hasNestedPropertyValue('workOrderItem.type', 'product' as 'product' | 'custom-item'))
      .filter(hasNestedPropertyValue('workOrderItem.uuid', itemUuid)) ?? [];
  const shouldShowCharges = initialCharges.length > 0 || forceShowCharges;

  const [item, setItem] = useState(
    createWorkOrder.items.find(hasPropertyValue('uuid', itemUuid)) ?? never('Invalid UUID'),
  );
  const [generalCharge, setGeneralCharge] = useState(extractInitialGeneralCharge(initialCharges));
  const [employeeCharges, setEmployeeCharges] = useState(
    initialCharges.filter(hasNonNullableProperty('employeeId')) ?? [],
  );

  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery({ fetch });
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
    { enabled: false },
  );

  const itemLineItemId = (() => {
    if (item.type === 'product') {
      return calculatedDraftOrderQuery.data?.itemLineItemIds[item.uuid];
    }

    if (item.type === 'custom-item') {
      return calculatedDraftOrderQuery.data?.customItemLineItemIds[item.uuid];
    }

    return item satisfies never;
  })();
  const itemLineItem = calculatedDraftOrderQuery.data?.lineItems.find(li => li.id === itemLineItemId);

  const name = getProductVariantName(itemLineItem?.variant) ?? 'Unknown Product';

  const readonly = !!itemLineItem?.order;

  return (
    <>
      <Modal
        open={open && !isSubModalOpen}
        title={name}
        onClose={onClose}
        loading={calculatedDraftOrderQuery.isLoading}
        primaryAction={{
          content: 'Save',
          onAction: () => {
            onSave(item, [generalCharge, ...employeeCharges].filter(isNonNullable));
            setToastAction({ content: 'Saved item' });
            onClose();
          },
        }}
        secondaryActions={[
          ...(shouldShowCharges
            ? [
                {
                  content: 'Remove Labour',
                  onAction: () => {
                    onSave(item, []);
                    setForceShowCharges(false);
                  },
                },
              ]
            : [
                {
                  content: 'Add Labour',
                  onAction: () => {
                    setForceShowCharges(true);
                  },
                  disabled: readonly,
                },
              ]),
          {
            content: 'Cancel',
            onAction: onClose,
          },
          {
            content: 'Remove',
            onAction: () => {
              onSave({ ...item, quantity: 0 as Int }, []);
              setToastAction({ content: 'Removed item' });
              onClose();
            },
            disabled: readonly,
            destructive: true,
          },
        ]}
      >
        {!!itemLineItem?.order && (
          <Modal.Section>
            <Box>
              <Badge tone={'info'}>{itemLineItem.order.name}</Badge>
            </Box>
          </Modal.Section>
        )}

        {shouldShowCharges && (
          <Modal.Section>
            <Charges
              setToastAction={setToastAction}
              generalCharge={generalCharge}
              setGeneralCharge={setGeneralCharge}
              employeeCharges={employeeCharges}
              setEmployeeCharges={setEmployeeCharges}
              setIsAddEmployeeModalOpen={setIsAddEmployeeModalOpen}
              readonly={readonly}
            />
          </Modal.Section>
        )}

        {!shouldShowCharges && (
          <Modal.Section>
            <BlockStack gap={'400'}>
              <IntegerField
                label={'Quantity'}
                autoComplete={'off'}
                value={item.quantity.toString()}
                onChange={value => setItem(item => ({ ...item, quantity: Number(value) as Int }))}
                readOnly={readonly}
                requiredIndicator
              />
            </BlockStack>
          </Modal.Section>
        )}

        <Modal.Section>
          <CustomFieldsList
            customFields={item.customFields}
            onImportPresetClick={() => setIsImportCustomFieldPresetModalOpen(true)}
            onAddCustomFieldClick={() => setIsNewCustomFieldModalOpen(true)}
            onEditPresetClick={() => setIsSelectCustomFieldPresetToEditModalOpen(true)}
            onSavePresetClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
            onUpdate={customFields => setItem(item => ({ ...item, customFields }))}
          />
        </Modal.Section>
      </Modal>

      {isAddEmployeeModalOpen && (
        <AddEmployeeModal
          open={isAddEmployeeModalOpen}
          onClose={() => setIsAddEmployeeModalOpen(false)}
          setToastAction={setToastAction}
          selectedEmployeeIds={employeeCharges.map(e => e.employeeId)}
          onUpdate={employeeIds =>
            setEmployeeCharges(current => {
              const filtered = current.filter(c => employeeIds.includes(c.employeeId));
              const chargeEmployeeIds = unique(filtered.map(c => c.employeeId));
              const newEmployeeIds = employeeIds.filter(employeeId => !chargeEmployeeIds.includes(employeeId));
              return [
                ...filtered,
                ...newEmployeeIds.map(
                  employeeId =>
                    ({
                      type: 'fixed-price-labour',
                      uuid: uuid(),
                      name: settingsQuery.data?.settings?.labourLineItemName || 'Labour',
                      amount: BigDecimal.ZERO.toMoney(),
                      employeeId,
                      workOrderItem: {
                        uuid: itemUuid,
                        // TODO: Support custom items
                        type: 'product',
                      },
                      amountLocked: false,
                      removeLocked: false,
                    }) as const,
                ),
              ];
            })
          }
        />
      )}

      {isNewCustomFieldModalOpen && (
        <NewCustomFieldModal
          open={isNewCustomFieldModalOpen}
          existingFields={Object.keys(item.customFields)}
          onClose={() => setIsNewCustomFieldModalOpen(false)}
          onAdd={(fieldName, fieldValue) =>
            setItem(item => ({ ...item, customFields: { ...item.customFields, [fieldName]: fieldValue } }))
          }
        />
      )}

      {isSaveCustomFieldPresetModalOpen && (
        <SaveCustomFieldPresetModal
          type={'LINE_ITEM'}
          fieldNames={Object.keys(item.customFields)}
          open={isSaveCustomFieldPresetModalOpen}
          onClose={() => setIsSaveCustomFieldPresetModalOpen(false)}
          setToastAction={setToastAction}
        />
      )}

      {isImportCustomFieldPresetModalOpen && (
        <ImportCustomFieldPresetModal
          type={'LINE_ITEM'}
          open={isImportCustomFieldPresetModalOpen && !customFieldPresetNameToEdit}
          onClose={() => setIsImportCustomFieldPresetModalOpen(false)}
          onOverride={fieldNames =>
            setItem(item => ({
              ...item,
              customFields: Object.fromEntries(
                fieldNames.map(fieldName => [fieldName, item.customFields[fieldName] ?? '']),
              ),
            }))
          }
          onMerge={fieldNames => {
            setItem(item => ({
              ...item,
              customFields: {
                ...item.customFields,
                ...Object.fromEntries(fieldNames.map(fieldName => [fieldName, item.customFields[fieldName] ?? ''])),
              },
            }));
          }}
          onEdit={presetName => setCustomFieldPresetNameToEdit(presetName)}
          setToastAction={setToastAction}
        />
      )}

      {isSelectCustomFieldPresetToEditModalOpen && (
        <SelectCustomFieldPresetModal
          open={isSelectCustomFieldPresetToEditModalOpen}
          onClose={() => setIsSelectCustomFieldPresetToEditModalOpen(false)}
          onSelect={({ name }) => setCustomFieldPresetNameToEdit(name)}
          setToastAction={setToastAction}
          type="LINE_ITEM"
        />
      )}

      {!!customFieldPresetNameToEdit && (
        <EditCustomFieldPresetModal
          open={!!customFieldPresetNameToEdit}
          onClose={() => setCustomFieldPresetNameToEdit(undefined)}
          setToastAction={setToastAction}
          name={customFieldPresetNameToEdit}
          type="LINE_ITEM"
        />
      )}
    </>
  );
}

/**
 * We only support one general charge, so we merge all general charges into one.
 * @TODO: Shared with pos!!!
 */
function extractInitialGeneralCharge(
  charges: DiscriminatedUnionOmit<CreateWorkOrder['charges'][number], 'workOrderItem'>[],
) {
  const generalCharges = charges.filter(hasPropertyValue('employeeId', null));

  if (generalCharges.length === 1) {
    return generalCharges[0]!;
  }

  if (generalCharges.length > 1) {
    return {
      type: 'fixed-price-labour',
      uuid: uuid(),
      employeeId: null,
      name: generalCharges[0]!.name,
      amount: getTotalPriceForCharges(generalCharges),
      amountLocked: false,
      removeLocked: false,
    } as const;
  }

  return null;
}

type LinkedEmployeeCharge = CreateWorkOrder['charges'][number] & {
  workOrderItem: { type: 'product' | 'custom-item' };
  employeeId: ID;
};

function Charges({
  setToastAction,
  generalCharge,
  setGeneralCharge,
  readonly,
  employeeCharges,
  setEmployeeCharges,
  setIsAddEmployeeModalOpen,
}: {
  setToastAction: ToastActionCallable;
  generalCharge: ReturnType<typeof extractInitialGeneralCharge>;
  setGeneralCharge: Dispatch<SetStateAction<ReturnType<typeof extractInitialGeneralCharge>>>;
  readonly: boolean;
  employeeCharges: LinkedEmployeeCharge[];
  setEmployeeCharges: Dispatch<SetStateAction<LinkedEmployeeCharge[]>>;
  setIsAddEmployeeModalOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery({ fetch });
  const employeeQueries = useEmployeeQueries({ fetch, ids: unique(employeeCharges.map(charge => charge.employeeId)) });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const [openEmployeeCharges, setOpenEmployeeCharges] = useState<string[]>([]);

  return (
    <BlockStack gap={'400'}>
      <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
        General Labour
      </Text>

      <SegmentedChargeConfig
        defaultHourlyRate={settingsQuery.data?.settings.defaultRate}
        types={['none', 'hourly-labour', 'fixed-price-labour']}
        charge={generalCharge}
        setCharge={charge =>
          setGeneralCharge(current => {
            if (charge === null) {
              return null;
            }

            if (charge.type === 'fixed-price-labour') {
              return { ...charge, uuid: current?.uuid ?? uuid(), employeeId: null };
            }

            if (charge.type === 'hourly-labour') {
              return { ...charge, uuid: current?.uuid ?? uuid(), employeeId: null };
            }

            return charge satisfies never;
          })
        }
        disabled={readonly}
      />

      <Divider />

      <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
        Employee Labour
      </Text>

      {employeeCharges.length === 0 && (
        <Box paddingBlock={'200'}>
          <InlineStack align={'center'}>
            <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
              No employees assigned
            </Text>
          </InlineStack>
        </Box>
      )}

      <ResourceList
        items={employeeCharges}
        resolveItemId={charge => `${charge.type}-${charge.uuid}` as const}
        renderItem={(charge, id) => (
          <>
            <ResourceItem
              id={id}
              onClick={() =>
                setOpenEmployeeCharges(current => {
                  if (current.includes(id)) {
                    return current.filter(c => c !== id);
                  }

                  return [...current, id];
                })
              }
            >
              <InlineStack align={'space-between'} blockAlign={'center'}>
                {!!employeeQueries[charge.employeeId]?.isError && (
                  <Text as={'p'} variant={'bodyMd'} tone={'critical'}>
                    {extractErrorMessage(
                      employeeQueries[charge.employeeId]?.error,
                      'An error occurred while loading employee',
                    )}
                  </Text>
                )}

                {employeeQueries[charge.employeeId]?.isLoading && <SkeletonBodyText lines={1} />}

                {employeeQueries[charge.employeeId]?.data && (
                  <BlockStack>
                    <Text as={'p'} variant={'bodyMd'}>
                      {employeeQueries[charge.employeeId]?.data?.name ?? 'Unknown employee'}
                    </Text>
                    <Text as={'p'} variant={'bodyXs'} tone={'subdued'}>
                      {charge.name}
                      {charge.type === 'hourly-labour' &&
                        `, ${charge.hours} hour${BigDecimal.fromDecimal(charge.hours).equals(BigDecimal.ONE) ? '' : 's'}`}
                    </Text>
                  </BlockStack>
                )}

                <InlineStack gap={'200'}>
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {currencyFormatter(getTotalPriceForCharges([charge]))}
                  </Text>
                  <span
                    style={{
                      transform: openEmployeeCharges.includes(id) ? 'rotate(180deg)' : undefined,
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Icon source={CaretUpMinor} tone={'subdued'} />
                  </span>
                </InlineStack>
              </InlineStack>
            </ResourceItem>

            <Collapsible id={id} open={openEmployeeCharges.includes(id)}>
              <SegmentedChargeConfig
                defaultHourlyRate={employeeQueries[charge.employeeId]?.data?.rate}
                types={['hourly-labour', 'fixed-price-labour']}
                charge={charge}
                setCharge={partialNewCharge =>
                  setEmployeeCharges(current => {
                    if (partialNewCharge === null) {
                      return current.filter(c => c !== charge);
                    }

                    const newCharge = (() => {
                      if (partialNewCharge.type === 'fixed-price-labour') {
                        return {
                          ...partialNewCharge,
                          uuid: charge.uuid,
                          workOrderItem: charge.workOrderItem,
                          employeeId: charge.employeeId,
                        };
                      }

                      if (partialNewCharge.type === 'hourly-labour') {
                        return {
                          ...partialNewCharge,
                          uuid: charge.uuid,
                          workOrderItem: charge.workOrderItem,
                          employeeId: charge.employeeId,
                        };
                      }

                      return partialNewCharge satisfies never;
                    })();

                    let inserted = false;

                    const newCharges = current.map(c => {
                      if (c === charge) {
                        inserted = true;
                        return newCharge;
                      }

                      return c;
                    });

                    if (inserted) {
                      return newCharges;
                    }

                    return [...newCharges, newCharge];
                  })
                }
              />
            </Collapsible>
          </>
        )}
      />

      <Button onClick={() => setIsAddEmployeeModalOpen(true)} disabled={readonly}>
        Add Employee
      </Button>
    </BlockStack>
  );
}
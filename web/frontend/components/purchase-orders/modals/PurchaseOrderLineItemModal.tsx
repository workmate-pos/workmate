import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { Badge, BlockStack, Box, DataTable, InlineStack, Modal, Text } from '@shopify/polaris';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { Int } from '@web/schemas/generated/create-product.js';
import { IntegerField } from '@web/frontend/components/IntegerField.js';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { PurchaseOrder } from '@web/services/purchase-orders/types.js';
import { CustomFieldsList } from '@web/frontend/components/shared-orders/CustomFieldsList.js';
import { NewCustomFieldModal } from '@web/frontend/components/shared-orders/modals/NewCustomFieldModal.js';
import { SaveCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SaveCustomFieldPresetModal.js';
import { ImportCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/ImportCustomFieldPresetModal.js';
import { SelectCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/SelectCustomFieldPresetModal.js';
import { EditCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/EditCustomFieldPresetModal.js';

export function PurchaseOrderLineItemModal({
  initialProduct,
  purchaseOrder,
  locationId,
  open,
  onClose,
  setToastAction,
  onSave,
}: {
  initialProduct: CreatePurchaseOrder['lineItems'][number];
  purchaseOrder: PurchaseOrder | null;
  locationId: ID | null;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  onSave: (product: CreatePurchaseOrder['lineItems'][number]) => void;
}) {
  const [isNewCustomFieldModalOpen, setIsNewCustomFieldModalOpen] = useState(false);
  const [isSaveCustomFieldPresetModalOpen, setIsSaveCustomFieldPresetModalOpen] = useState(false);
  const [isImportCustomFieldPresetModalOpen, setIsImportCustomFieldPresetModalOpen] = useState(false);
  const [isSelectCustomFieldPresetToEditModalOpen, setIsSelectCustomFieldPresetToEditModalOpen] = useState(false);
  const [customFieldPresetNameToEdit, setCustomFieldPresetNameToEdit] = useState<string>();

  const isSubModalOpen = [
    isNewCustomFieldModalOpen,
    isSaveCustomFieldPresetModalOpen,
    isImportCustomFieldPresetModalOpen,
    isSelectCustomFieldPresetToEditModalOpen,
    !!customFieldPresetNameToEdit,
  ].some(Boolean);

  const [product, setProduct] = useState(initialProduct);
  const savedProduct = purchaseOrder?.lineItems.find(li => li.uuid === product.uuid);

  const fetch = useAuthenticatedFetch({ setToastAction });
  const locationQuery = useLocationQuery({ fetch, id: locationId });
  const productVariantQuery = useProductVariantQuery({ fetch, id: product.productVariantId });
  const orderQuery = useOrderQuery({ fetch, id: product.shopifyOrderLineItem?.orderId ?? null });
  const inventoryItemQuery = useInventoryItemQuery({
    fetch,
    id: productVariantQuery?.data?.inventoryItem?.id ?? null,
    locationId,
  });

  const productVariant = productVariantQuery?.data;
  const order = orderQuery?.data?.order;
  const inventoryItem = inventoryItemQuery?.data;
  const location = locationQuery?.data;

  const name = getProductVariantName(productVariant) ?? 'Product';

  const isLoading = inventoryItemQuery.isLoading || locationQuery.isLoading || orderQuery.isLoading;

  const isImmutable = savedProduct && savedProduct.availableQuantity > 0;

  return (
    <>
      <Modal
        open={open && !isSubModalOpen}
        onClose={onClose}
        title={name}
        loading={isLoading}
        primaryAction={{
          content: 'Save',
          onAction: () => {
            onSave(product);
            setToastAction({ content: 'Saved product' });
            onClose();
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: onClose,
          },
          {
            content: 'Remove',
            onAction: () => {
              onSave({ ...product, quantity: 0 as Int });
              setToastAction({ content: 'Removed product' });
              onClose();
            },
            disabled: isImmutable,
            destructive: true,
          },
        ]}
      >
        {order && (
          <Modal.Section>
            <Box>
              <Badge tone={'info'}>{order.name}</Badge>
            </Box>
          </Modal.Section>
        )}

        {location && inventoryItem?.inventoryLevel && (
          <Modal.Section>
            <InlineStack align={'center'}>
              <Text as={'h3'} fontWeight={'semibold'}>
                Current stock at {location.name}
              </Text>
            </InlineStack>
            <DataTable
              columnContentTypes={['text', 'numeric']}
              headings={['Status', 'Quantity']}
              rows={inventoryItem.inventoryLevel.quantities.map(({ name, quantity }) => [titleCase(name), quantity])}
            />
          </Modal.Section>
        )}

        <Modal.Section>
          <BlockStack gap={'400'}>
            <MoneyField
              label={'Unit Cost'}
              autoComplete={'off'}
              value={product.unitCost.toString()}
              onChange={value => setProduct(product => ({ ...product, unitCost: value as Money }))}
              min={0}
              requiredIndicator
              readOnly={isImmutable}
            />
            <IntegerField
              label={'Quantity'}
              autoComplete={'off'}
              value={product.quantity.toString()}
              onChange={value => setProduct(product => ({ ...product, quantity: Number(value) as Int }))}
              helpText={'The quantity that has been ordered'}
              min={isImmutable ? savedProduct.quantity : 1}
              requiredIndicator
            />
            <IntegerField
              label={'Available Quantity'}
              autoComplete={'off'}
              value={product.availableQuantity.toString()}
              onChange={value => setProduct(product => ({ ...product, availableQuantity: Number(value) as Int }))}
              min={savedProduct ? savedProduct.availableQuantity : 0}
              max={product.quantity}
              helpText={'The quantity that has been delivered'}
              requiredIndicator
            />
          </BlockStack>
        </Modal.Section>

        <Modal.Section>
          <CustomFieldsList
            customFields={product.customFields}
            onImportPresetClick={() => setIsImportCustomFieldPresetModalOpen(true)}
            onAddCustomFieldClick={() => setIsNewCustomFieldModalOpen(true)}
            onEditPresetClick={() => setIsSelectCustomFieldPresetToEditModalOpen(true)}
            onSavePresetClick={() => setIsSaveCustomFieldPresetModalOpen(true)}
            onUpdate={customFields => setProduct(product => ({ ...product, customFields }))}
          />
        </Modal.Section>
      </Modal>

      {isNewCustomFieldModalOpen && (
        <NewCustomFieldModal
          open={isNewCustomFieldModalOpen}
          existingFields={Object.keys(product.customFields)}
          onClose={() => setIsNewCustomFieldModalOpen(false)}
          onAdd={(fieldName, fieldValue) =>
            setProduct(product => ({ ...product, customFields: { ...product.customFields, [fieldName]: fieldValue } }))
          }
        />
      )}

      {isSaveCustomFieldPresetModalOpen && (
        <SaveCustomFieldPresetModal
          type={'LINE_ITEM'}
          fieldNames={Object.keys(product.customFields)}
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
            setProduct(product => ({
              ...product,
              customFields: Object.fromEntries(
                fieldNames.map(fieldName => [fieldName, product.customFields[fieldName] ?? '']),
              ),
            }))
          }
          onMerge={fieldNames => {
            setProduct(product => ({
              ...product,
              customFields: {
                ...product.customFields,
                ...Object.fromEntries(fieldNames.map(fieldName => [fieldName, product.customFields[fieldName] ?? ''])),
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

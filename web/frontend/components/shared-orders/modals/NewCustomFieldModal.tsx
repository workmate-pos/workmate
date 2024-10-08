import { useState } from 'react';
import { BlockStack, Modal, TextField } from '@shopify/polaris';
import { CustomField } from '@web/frontend/components/shared-orders/CustomField.js';

export function NewCustomFieldModal({
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
      title={'New custom field'}
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
            label={'Field name'}
            autoComplete={'off'}
            requiredIndicator
            value={fieldName}
            onChange={(value: string) => setFieldName(value)}
            error={existingFields.includes(fieldName) ? 'Field already exists' : undefined}
          />
          <CustomField
            name={fieldName || 'New field'}
            value={fieldValue}
            onChange={setFieldValue}
            disabled={!fieldName}
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

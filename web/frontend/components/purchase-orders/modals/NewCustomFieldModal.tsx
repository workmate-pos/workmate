import { useState } from 'react';
import { BlockStack, Modal, TextField } from '@shopify/polaris';

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

import { Button, InlineGrid, Modal, Text, TextField } from '@shopify/polaris';
import { useState } from 'react';
import { CustomFieldValuesModal } from '@web/frontend/components/shared-orders/modals/CustomFieldValuesModal.js';

/**
 * Modal that shows certain custom fields and allows the user to manage their values
 */
export function CustomFieldValuesSelectorModal({
  names,
  open,
  onClose,
  isLoading,
  allowCreateNew,
}: {
  names: string[];
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  allowCreateNew?: boolean;
}) {
  const [name, setName] = useState<string>();
  const [newName, setNewName] = useState<string>();
  const newNameError = newName && names.includes(newName) ? 'Custom field already exists' : undefined;

  return (
    <>
      <Modal open={open && !name} title={'Custom Field Values'} onClose={onClose} loading={isLoading}>
        {names.length === 0 && (
          <Modal.Section>
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              No custom fields found
            </Text>
          </Modal.Section>
        )}

        {names.length > 0 && (
          <Modal.Section>
            <InlineGrid gap={'200'} columns={3}>
              {names.map(name => (
                <Button onClick={() => setName(name)}>{name}</Button>
              ))}
            </InlineGrid>
          </Modal.Section>
        )}

        {allowCreateNew && (
          <Modal.Section>
            <TextField
              label={'New Custom Field'}
              autoComplete="off"
              onChange={setNewName}
              value={newName}
              error={newNameError}
              connectedRight={
                <Button
                  disabled={!newName || newName.trim().length === 0 || !!newNameError}
                  onClick={() => {
                    setNewName(undefined);
                    setName(newName);
                  }}
                >
                  Create
                </Button>
              }
            />
          </Modal.Section>
        )}
      </Modal>

      {!!name && <CustomFieldValuesModal open={!!name} onClose={() => setName(undefined)} name={name} />}
    </>
  );
}

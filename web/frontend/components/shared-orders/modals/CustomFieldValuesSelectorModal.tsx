import { Button, FormLayout, Grid, InlineGrid, InlineStack, Modal, Text, TextField } from '@shopify/polaris';
import { useState } from 'react';
import { CustomFieldValuesModal } from '@web/frontend/components/shared-orders/modals/CustomFieldValuesModal.js';

/**
 * Modal that shows certain custom fields and allows the user to manage their values
 */
export function CustomFieldValuesSelectorModal({
  names,
  open,
  onClose,
}: {
  names: string[];
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState<string>();

  return (
    <>
      <Modal open={open} title={'Custom Field Values'} onClose={onClose}>
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
      </Modal>

      {!!name && <CustomFieldValuesModal open={!!name} onClose={() => setName(undefined)} name={name} />}
    </>
  );
}

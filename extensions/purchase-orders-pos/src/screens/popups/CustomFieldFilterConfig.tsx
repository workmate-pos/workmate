import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useRouter } from '../../routes.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { CustomFieldFilter } from '@web/services/purchase-orders/get.js';

export function CustomFieldFilterConfig({
  initialFilters,
  onSave,
}: {
  initialFilters: CustomFieldFilter[];
  onSave: (filters: CustomFieldFilter[]) => void;
}) {
  const [filters, setFilters] = useState([...initialFilters]);

  const router = useRouter();

  return (
    <ScrollView>
      <Stack direction={'vertical'} paddingVertical={'ExtraLarge'} spacing={4}>
        {filters.map((filter, i) => (
          <CustomFieldFilterRow
            key={i}
            filter={filter}
            onRemove={() => setFilters(filters => filters.filter((_, j) => i !== j))}
            onUpdate={filter => setFilters(filters => filters.map((f, j) => (i === j ? filter : f)))}
          />
        ))}

        <FormButton
          title={'Add Filter'}
          onPress={() =>
            setFilters(filters => [...filters, { type: 'require-field', key: null, value: null, inverse: false }])
          }
        />
      </Stack>

      <Stack direction={'vertical'} spacing={1}>
        <Button
          title={'Save Filter'}
          type={'primary'}
          onPress={() => {
            onSave(filters);
            router.popCurrent();
          }}
        />
        <Button title={'Back'} onPress={() => router.popCurrent()} />
      </Stack>
    </ScrollView>
  );
}

function CustomFieldFilterRow({
  filter,
  onRemove,
  onUpdate,
}: {
  filter: CustomFieldFilter;
  onRemove: () => void;
  onUpdate: (filter: CustomFieldFilter) => void;
}) {
  return (
    <ResponsiveGrid columns={1}>
      <ResponsiveGrid columns={4}>
        <FormStringField
          label={'Field'}
          value={filter.key ?? ''}
          onChange={value => onUpdate({ ...filter, key: value || null })}
          formatter={() => (filter.key === null ? 'some field' : filter.key)}
        />
        <FormButton
          title={filter.inverse ? 'does not contain' : 'contains'}
          type={'plain'}
          onPress={() => onUpdate({ ...filter, inverse: !filter.inverse })}
        />
        <FormStringField
          label={'Value'}
          value={filter.value ?? ''}
          onChange={value => onUpdate({ ...filter, value: value || null })}
          formatter={() => (filter.value === null ? 'no value' : filter.value)}
        />
        <FormButton title={'Remove'} type={'destructive'} onPress={() => onRemove()} />
      </ResponsiveGrid>
    </ResponsiveGrid>
  );
}

export function getCustomFieldFilterText(filter: CustomFieldFilter): string {
  if (filter.type === 'require-field') {
    const fieldName = filter.key ?? 'some field';
    const valueName = filter.value ?? 'no value';
    const relation = filter.inverse ? 'does not contain' : 'contains';

    return `${fieldName} ${relation} ${valueName}`.trim();
  }

  throw new Error('Unknown filter type');
}

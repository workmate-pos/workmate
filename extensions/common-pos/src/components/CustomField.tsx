import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Route, UseRouter } from '../screens/router.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { DropdownProps } from '../screens/Dropdown.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export function CustomField({
  name,
  value,
  onChange,
  useRouter,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  useRouter: UseRouter<{
    Dropdown: Route<DropdownProps<string>>;
  }>;
}) {
  const fetch = useAuthenticatedFetch();
  const router = useRouter();

  const customFieldValueOptionsQuery = useCustomFieldValueOptionsQuery({ fetch, name });

  return (
    <FormStringField
      label={name}
      value={value}
      onChange={onChange}
      onFocus={() => {
        const options = customFieldValueOptionsQuery.data;

        if (options && options.length > 0) {
          const clearValue = 'Clear Value';

          router.push('Dropdown', {
            title: name,
            options: unique([clearValue, value, ...options]),
            onSelect: selected => onChange(selected === clearValue ? '' : selected),
            useRouter,
          });
        }
      }}
      disabled={!customFieldValueOptionsQuery.data}
    />
  );
}

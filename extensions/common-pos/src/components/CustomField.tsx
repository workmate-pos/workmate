import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Route, UseRouter } from '../screens/router.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { DropdownProps } from '../screens/Dropdown.js';

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

  const customFieldValueOptionsQuery = useCustomFieldValueOptionsQuery({ fetch, name: name });

  return (
    <FormStringField
      label={name}
      value={value}
      onChange={onChange}
      onFocus={() => {
        const options = customFieldValueOptionsQuery.data;

        if (options && options.length > 0) {
          router.push('Dropdown', {
            title: name,
            options: customFieldValueOptionsQuery.data ?? [],
            onSelect: onChange,
            useRouter,
          });
        }
      }}
      disabled={!customFieldValueOptionsQuery.data}
    />
  );
}

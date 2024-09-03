import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { Route, UseRouter } from '../screens/router.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { ListPopupProps } from '../screens/ListPopup.js';

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
    ListPopup: Route<ListPopupProps>;
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
          router.push('ListPopup', {
            title: name,
            selection: {
              type: 'select',
              items: [
                {
                  id: '',
                  leftSide: {
                    label: 'Clear',
                  },
                },
                ...options.map(option => ({
                  id: option,
                  leftSide: {
                    label: option,
                  },
                })),
              ],
              onSelect: selected => onChange(selected),
            },
            useRouter,
          });
        }
      }}
      disabled={!customFieldValueOptionsQuery.data}
    />
  );
}

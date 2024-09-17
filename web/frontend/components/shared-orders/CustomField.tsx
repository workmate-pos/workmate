import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { Select, TextField } from '@shopify/polaris';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';

export function CustomField({
  name,
  value,
  onChange,
  onRemove,
  disabled: _disabled,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const customFieldValueOptionsQuery = useCustomFieldValueOptionsQuery({ fetch, name }, { enabled: !!name });
  const options = customFieldValueOptionsQuery.data ?? [];

  const disabled = _disabled || customFieldValueOptionsQuery.isLoading;

  const labelAction = !disabled && onRemove ? { content: 'Remove', onAction: onRemove } : undefined;

  if (options.length > 0) {
    return (
      <>
        <Select
          label={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          labelAction={labelAction}
          options={unique(['', value, ...options])}
        />

        {toast}
      </>
    );
  }

  return (
    <>
      <TextField
        label={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        labelAction={labelAction}
        autoComplete="off"
        loading={customFieldValueOptionsQuery.isFetching}
      />

      {toast}
    </>
  );
}

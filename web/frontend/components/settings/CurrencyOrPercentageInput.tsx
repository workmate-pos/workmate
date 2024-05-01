import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { Combobox, Listbox } from '@shopify/polaris';
import { isNumber } from '@teifi-digital/shopify-app-toolbox/numbers';

export function CurrencyOrPercentageInput({
  label,
  value,
  setValue,
  onSelect,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  onSelect: (unit: 'percentage' | 'currency') => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  return (
    <>
      <Combobox
        activator={
          <Combobox.TextField type="number" label={label} autoComplete="off" value={value} onChange={setValue} />
        }
      >
        {value.length > 0 && isNumber(value) && Number(value) > 0 ? (
          <Listbox onSelect={onSelect}>
            <Listbox.Option value={'currency'}>{currencyFormatter(Number(value))}</Listbox.Option>
            {Number(value) <= 100 && <Listbox.Option value={'percentage'}>{value + '%'}</Listbox.Option>}
          </Listbox>
        ) : null}
      </Combobox>
      {toast}
    </>
  );
}

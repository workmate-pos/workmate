import { useStorePropertiesQuery } from '../queries/use-store-properties-query';
import { useMemo } from 'react';

export const useCurrencyFormatter = () => {
  const { data } = useStorePropertiesQuery();
  const formatParts = data?.storeProperties.currencyFormat.split(/{{.*}}/);

  return useMemo(
    () =>
      Object.assign(
        (amount: number) => {
          if (!data) return `$${amount.toFixed(2)}`;

          const { currencyFormat } = data.storeProperties;
          const variables = {
            amount: amount.toFixed(2),
            amount_no_decimals: amount.toFixed(0),
          };

          let formattedString = currencyFormat;

          for (const [key, value] of Object.entries(variables)) {
            formattedString = formattedString.replace(`{{${key}}}`, value);
          }

          return formattedString;
        },
        {
          get prefix() {
            return formatParts?.[0] ?? '$';
          },
          get suffix() {
            if (formatParts?.length === 1) return undefined;
            return formatParts?.at(-1) ?? undefined;
          },
        },
      ),
    [data],
  );
};

export type CurrencyFormatter = ReturnType<typeof useCurrencyFormatter>;

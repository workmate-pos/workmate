import { useStorePropertiesQuery } from '../queries/use-store-properties-query.js';
import { useMemo } from 'react';
import { Fetch } from '../queries/fetch.js';
import type { Money } from '@web/services/gql/queries/generated/schema.js';

export const useCurrencyFormatter = ({ fetch }: { fetch: Fetch }) => {
  const { data } = useStorePropertiesQuery({ fetch });
  const formatParts = data?.storeProperties.currencyFormat.split(/{{.*}}/);

  return useMemo(
    () =>
      Object.assign(
        (_amount: number | Money) => {
          const amount = typeof _amount === 'number' ? _amount : Number(_amount);

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

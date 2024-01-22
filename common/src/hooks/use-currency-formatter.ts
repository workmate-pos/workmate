import { useStorePropertiesQuery } from '../queries/use-store-properties-query.js';
import { useMemo } from 'react';
import { Fetch } from '../queries/fetch.js';
import type { Money } from '@web/services/gql/queries/generated/schema.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export const useCurrencyFormatter = ({ fetch }: { fetch: Fetch }) => {
  const { data } = useStorePropertiesQuery({ fetch });
  const formatParts = data?.storeProperties.currencyFormat.split(/{{.*}}/);

  return useMemo(
    () =>
      Object.assign(
        (amount: number | Money) => {
          const decimal = BigDecimal.fromString(typeof amount === 'number' ? amount.toFixed(10) : amount);

          if (!data) return `$${decimal.round(2n).toString()}`;

          const { currencyFormat } = data.storeProperties;
          const variables = {
            amount: decimal.round(2n).toString(),
            amount_no_decimals: decimal.setPrecision(0n).toString(),
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

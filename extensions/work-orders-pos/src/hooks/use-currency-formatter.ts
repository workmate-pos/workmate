import { useStorePropertiesQuery } from '../queries/use-store-properties-query';

export const useCurrencyFormatter = () => {
  const storePropertiesQuery = useStorePropertiesQuery();

  return (amount: number) => {
    const { data } = storePropertiesQuery;
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
  };
};

export type CurrencyFormatter = ReturnType<typeof useCurrencyFormatter>;

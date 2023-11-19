import { useStoreProperties } from './use-store-properties';

export const useCurrencyFormatter = () => {
  const storeProperties = useStoreProperties();

  return (amount: number) => {
    if (!storeProperties) return `$${amount.toFixed(2)}`;

    const { currencyFormat } = storeProperties;
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

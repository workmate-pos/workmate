import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { titleCase } from '../util/casing';
import { useState } from 'react';

// NOTE: Do NOT change these keys - they are used to detect deposits in the backend. They are also shown to the user
const WORK_ORDER_NAME_KEY = 'Work Order';
const PAYMENT_TYPE_KEY = 'Type';

export const usePaymentHandler = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async (
    options: { workOrderName: string; amount: number } & (
      | { type: 'balance'; previouslyDeposited?: number }
      | { type: 'deposit' }
    ),
  ) => {
    setIsLoading(true);

    await api.cart.clearCart();

    const taxable = options.type === 'balance';

    await api.cart.addCustomSale({
      title: `Payment for ${options.workOrderName}`,
      taxable,
      price: options.amount.toFixed(2),
      quantity: 1,
    });

    if (options.type === 'balance' && options.previouslyDeposited) {
      await api.cart.applyCartDiscount('FixedAmount', 'Deposit', options.previouslyDeposited.toFixed(2));
    }

    await api.cart.addCartProperties({
      [WORK_ORDER_NAME_KEY]: options.workOrderName,
      [PAYMENT_TYPE_KEY]: titleCase(options.type), // case insensitive,
    });

    api.navigation.dismiss();

    setIsLoading(false);
  };

  return {
    handlePayment,
    isLoading,
  };
};

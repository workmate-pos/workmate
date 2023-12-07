import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { titleCase } from '../util/casing';

// NOTE: Do NOT change these keys - they are used to detect deposits in the backend. They are also shown to the user
export const PAYMENT_ADDITIONAL_DETAIL_KEYS = {
  WORK_ORDER_NAME: 'Work Order',
  PAYMENT_TYPE: 'Type',
};

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

    api.toast.show(`Preparing ${options.type} payment`);

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
      [PAYMENT_ADDITIONAL_DETAIL_KEYS.WORK_ORDER_NAME]: options.workOrderName,
      [PAYMENT_ADDITIONAL_DETAIL_KEYS.PAYMENT_TYPE]: titleCase(options.type), // case insensitive,
    });

    api.navigation.dismiss();

    setIsLoading(false);
  };

  return {
    handlePayment,
    isLoading,
  };
};

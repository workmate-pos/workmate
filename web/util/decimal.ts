import { Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function decimalToMoney(decimal: Decimal): Money {
  return decimal as unknown as Money;
}

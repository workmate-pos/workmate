import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

type BinaryBigDecimalOperation = {
  [K in keyof BigDecimal]: ((b: BigDecimal) => BigDecimal) extends BigDecimal[K] ? K : never;
}[keyof BigDecimal];

function binaryBigDecimalOperation<const O extends BinaryBigDecimalOperation>(operation: O) {
  return (a: Money, b: Money) => {
    const x = BigDecimal.fromMoney(a);
    const y = BigDecimal.fromMoney(b);

    return x[operation](y).toMoney();
  };
}

// TODO: @teifi-digital/shopify-app-toolbox
export const addMoney = binaryBigDecimalOperation('add');
export const multiplyMoney = binaryBigDecimalOperation('multiply');
export const subtractMoney = binaryBigDecimalOperation('subtract');
export const divideMoney = binaryBigDecimalOperation('divide');
export const compareMoney = (a: Money, b: Money) => BigDecimal.fromMoney(a).compare(BigDecimal.fromMoney(b));
export const ZERO_MONEY = BigDecimal.ZERO.round(2).toMoney();
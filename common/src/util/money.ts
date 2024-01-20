type Money = `${number}` & { __brand: 'Money' };
type Decimal = `${number}` & { __brand: 'Decimal' };
type MoneyV2 = { amount: Decimal; currencyCode: string };

export type Cents = number & { __brand: 'Cents' };
export type Dollars = number & { __brand: 'Dollars' };

export function toCents(amount: Dollars): Cents {
  return Math.round(amount * 100) as Cents;
}

export function toDollars(amount: Cents): Dollars {
  return (amount / 100) as Dollars;
}

export function parseMoney(money: Money): Dollars {
  return Number(money) as Dollars;
}

export function toMoney(amount: Dollars): Money {
  return amount.toFixed(2) as Money;
}

export function moneyV2ToMoney(moneyV2: Pick<MoneyV2, 'amount'>): Money {
  return moneyV2.amount as unknown as Money;
}

// TODO: Get rid of Cents and Dollars. Instead use @teifi-digital/shopify-app-toolbox/money for arbitrary precision money calculations.

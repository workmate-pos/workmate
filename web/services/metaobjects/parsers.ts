import { assertDecimal, assertMoney, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export function parseMoney(value: string | null | undefined): Money {
  if (!value) {
    throw new Error('Money must be set');
  }

  const { amount } = JSON.parse(value);

  assertMoney(amount);

  return amount;
}

export function parseDecimal(value: string | null | undefined): Decimal {
  if (!value) {
    throw new Error('Decimal must be set');
  }

  const amount = JSON.parse(value);

  assertDecimal(amount);

  return amount;
}

export function parseBoolean(value: string | null | undefined): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value '${value}' - must be "true" or "false"`);
}

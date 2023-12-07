export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function toDollars(amount: number): number {
  return amount / 100;
}

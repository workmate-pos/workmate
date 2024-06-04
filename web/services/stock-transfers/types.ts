import { getStockTransfer } from './get.js';

export type StockTransfer = NonNullable<Awaited<ReturnType<typeof getStockTransfer>>>;

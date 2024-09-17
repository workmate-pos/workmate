import { getDetailedStockTransfer } from './get.js';

export type DetailedStockTransfer = NonNullable<Awaited<ReturnType<typeof getDetailedStockTransfer>>>;

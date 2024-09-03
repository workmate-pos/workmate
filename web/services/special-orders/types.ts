import { getDetailedSpecialOrder } from './get.js';

export type DetailedSpecialOrder = NonNullable<Awaited<ReturnType<typeof getDetailedSpecialOrder>>>;

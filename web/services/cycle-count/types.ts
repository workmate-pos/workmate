import { getDetailedCycleCount } from './get.js';

export type CycleCountApplicationStatus = 'APPLIED' | 'NOT_APPLIED' | 'PARTIALLY_APPLIED';

export type DetailedCycleCount = Awaited<ReturnType<typeof getDetailedCycleCount>>;
export type DetailedCycleCountItem = DetailedCycleCount['items'][number];
export type DetailedCycleCountApplication = DetailedCycleCountItem['applications'][number];

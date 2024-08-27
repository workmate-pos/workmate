import { getDetailedCycleCount, getDetailedCycleCountItems } from './get.js';
import { getCycleCountEmployeeAssignments } from './queries.js';

export type CycleCountApplicationStatus = 'APPLIED' | 'NOT_APPLIED' | 'PARTIALLY_APPLIED';

export type DetailedCycleCount = Awaited<ReturnType<typeof getDetailedCycleCount>>;
export type DetailedCycleCountItem = Awaited<ReturnType<typeof getDetailedCycleCountItems>>[number];
export type DetailedCycleCountApplication = DetailedCycleCountItem['applications'][number];
export type DetailedCycleCountEmployeeAssignment = Awaited<ReturnType<typeof getCycleCountEmployeeAssignments>>[number];

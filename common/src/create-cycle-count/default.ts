import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const defaultCreateCycleCount = (locationId: ID, status: string): CreateCycleCount => ({
  name: null,
  status,
  items: [],
  locationId,
  note: '',
  dueDate: null,
  employeeAssignments: [],
  locked: false,
});

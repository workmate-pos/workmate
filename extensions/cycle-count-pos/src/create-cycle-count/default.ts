import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const getDefaultCreateCycleCount = (locationId: ID): CreateCycleCount => ({
  name: null,
  status: 'Draft',
  items: [],
  locationId,
  note: '',
  dueDate: null,
  employeeAssignments: [],
});

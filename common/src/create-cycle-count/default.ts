import { WIPCreateCycleCount } from './reducer.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const defaultCreateCycleCount = (locationId: ID): WIPCreateCycleCount => ({
  name: null,
  status: 'Draft',
  items: [],
  locationId,
  note: '',
  dueDate: null,
  employeeAssignments: [],
  locked: false,
});

import { WIPCreateStockTransfer } from './reducer.js';

export const defaultCreateStockTransfer: WIPCreateStockTransfer = {
  name: null,
  note: '',
  fromLocationId: null,
  toLocationId: null,
  lineItems: [],
};

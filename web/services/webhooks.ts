import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { insertWorkOrderPayment } from './work-order-payment.js';
import { toCents } from '../util/money.js';

// NOTE: Do NOT change these keys - they are used in the front end too when creating payments
export const PAYMENT_ADDITIONAL_DETAIL_KEYS = {
  WORK_ORDER_NAME: 'Work Order',
  PAYMENT_TYPE: 'Type',
};

export default {
  'orders/paid': {
    async handler(session, topic, shop, body) {
      const order = body as {
        id: number;
        note_attributes: { name: string; value: string }[];
        current_total_price: string;
      };

      const attributes = Object.fromEntries(order.note_attributes.map(a => [a.name, a.value]));

      const workOrderName = attributes[PAYMENT_ADDITIONAL_DETAIL_KEYS.WORK_ORDER_NAME];
      const paymentType = attributes[PAYMENT_ADDITIONAL_DETAIL_KEYS.PAYMENT_TYPE];

      if (workOrderName === undefined || paymentType === undefined) {
        // not a work order payment
        return;
      }

      const amount = toCents(Number(order.current_total_price));

      await insertWorkOrderPayment(shop, order.id, amount, workOrderName, paymentType);
    },
  },
} satisfies WebhookHandlers;

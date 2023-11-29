import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { insertWorkOrderPayment } from './work-order-payment.js';

export default {
  'orders/paid': {
    async handler(session, topic, shop, body) {
      const WORK_ORDER_NAME_KEY = 'Work Order';
      const PAYMENT_TYPE_KEY = 'Type';

      const order = body as {
        id: number;
        note_attributes: { name: string; value: string }[];
        current_total_price: string;
      };

      const attributes = Object.fromEntries(order.note_attributes.map(a => [a.name, a.value]));

      if (!(WORK_ORDER_NAME_KEY in attributes && PAYMENT_TYPE_KEY in attributes)) {
        // not a work order payment
        return;
      }

      const amount = Number(order.current_total_price) * 100; // TODO: only count the deposit line item
      const workOrderName = attributes[WORK_ORDER_NAME_KEY];
      const paymentType = attributes[PAYMENT_TYPE_KEY];

      await insertWorkOrderPayment(shop, order.id, amount, workOrderName, paymentType);
    },
  },
} satisfies WebhookHandlers;

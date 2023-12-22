import { WebhookHandler, WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { db } from './db/db.js';
import { WorkOrderAttribute } from '@work-orders/common/custom-attributes/attributes/WorkOrderAttribute.js';
import { never } from '@work-orders/common/util/never.js';

export default {
  'orders/create': {
    async handler(
      session,
      topic,
      shop,
      body: {
        admin_graphql_api_id: string;
        note_attributes: { name: string; value: string }[];
      },
    ) {
      const rawWorkOrderName = body.note_attributes.find(({ name }) => name === WorkOrderAttribute.key)?.value;

      if (!rawWorkOrderName) {
        return;
      }

      const workOrderName = WorkOrderAttribute.deserialize({ key: WorkOrderAttribute.key, value: rawWorkOrderName });

      const [workOrder = never()] = await db.workOrder.get({ shop, name: workOrderName });

      await db.workOrder.updateOrderIds({
        id: workOrder.id,
        orderId: body.admin_graphql_api_id,
      });
    },
  },
} as WebhookHandlers;

import { WebhookHandlers } from '@teifi-digital/shopify-app-express/services/webhooks.js';
import { WebhookSubscriptionTopic } from './gql/queries/generated/types.js';
import { db } from './db/db.js';

export default {
  // [WebhookSubscriptionTopic.CustomersCreate]: async (session, topic, shop, body, webhookId) => {
  //   // TODO: also other webhook listeners
  // },
  // [WebhookSubscriptionTopic.CustomersUpdate]: async (session, topic, shop, body, webhookId) => {
  //   const { admin_graphql_api_id: id, phone, email, first_name, last_name } = body as any;
  //
  //   let name = '';
  //
  //   if (first_name && last_name) name = `${first_name} ${last_name}`;
  //   name ||= email;
  //   name ||= phone;
  //   name ||= 'Unnamed Customer';
  //
  //   await db.customer.upsert({
  //     id,
  //     shop,
  //     phone,
  //     email,
  //     name,
  //   });
  // },
} satisfies WebhookHandlers;

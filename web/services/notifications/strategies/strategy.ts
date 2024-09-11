import { consoleNotificationStrategy } from './console-strategy.js';
import { smsNotificationStrategy } from './sms-strategy.js';
import { emailNotificationStrategy } from './email-strategy.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';
import { uuid, UUID } from '@work-orders/common/util/uuid.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { upsertNotification } from '../queries.js';

export type Notification = {
  uuid: UUID;
  shop: string;
  message: string;
  recipient: string;
};

export type NotificationStrategy<Name extends string, Context> = {
  name: Name;
  handler: (notification: Notification, context: Context) => Promise<string | null>;
};

type NotificationStrategyContext<T extends NotificationStrategy<any, any>> = Parameters<T['handler']>[1];

export function defineNotificationStrategy<
  const Name extends string,
  const Context extends Record<string, unknown> = Record<string, never>,
>(strategy: NotificationStrategy<Name, Context>) {
  return strategy;
}

export const notificationStrategies = {
  smsNotificationStrategy,
  consoleNotificationStrategy,
  emailNotificationStrategy,
} as const;

type RegisteredStrategy = (typeof notificationStrategies)[keyof typeof notificationStrategies];

export async function sendNotification<const StrategyName extends RegisteredStrategy['name']>(
  type: StrategyName,
  notification: Omit<Notification, 'uuid'>,
  context: NotificationStrategyContext<RegisteredStrategy & { name: StrategyName }>,
) {
  const strategy = Object.values(notificationStrategies).find(s => s.name === type) ?? never();

  const notificationUuid = uuid();
  const notificationWithUuid = { ...notification, uuid: notificationUuid };

  const { failed, externalId } = await strategy
    .handler(notificationWithUuid, context as UnionToIntersection<NotificationStrategyContext<RegisteredStrategy>>)
    .then(
      externalId => ({ failed: false, externalId }),
      error => {
        sentryErr(new Error('Notification failed', { cause: error }), { notificationUuid });
        return { failed: true, externalId: null };
      },
    );

  await upsertNotification({
    notification: notificationWithUuid,
    externalId,
    failed,
    type,
  });
}

import { consoleNotificationStrategy } from './console-strategy.js';
import { smsNotificationStrategy } from './sms-strategy.js';
import { emailNotificationStrategy } from './email-strategy.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';
import { uuid, UUID } from '@work-orders/common/util/uuid.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { getNotifications, upsertNotification } from '../queries.js';
import { z } from 'zod';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { unit } from '../../db/unit-of-work.js';

export type Notification = {
  uuid: UUID;
  shop: string;
  message: string;
  recipient: string;
};

export type NotificationStrategy<Name extends string, Context> = {
  name: Name;
  /**
   * Schema used to parse the Context. Required to allow merchants to replay failed notifications.
   */
  schema: z.ZodType<Context>;
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
    replayUuid: null,
    context,
    failed,
    type,
  });

  return notificationUuid;
}

export async function replayNotification({ shop, uuid }: { shop: string; uuid: string }) {
  const {
    notifications: [notification],
  } = await getNotifications({ shop, uuid, limit: 1 });

  if (!notification) {
    throw new HttpError('Notification not found', 404);
  }

  if (!notification.failed) {
    throw new HttpError('Notification did not fail', 400);
  }

  if (notification.replayUuid) {
    throw new HttpError('Notification has already been replayed', 400);
  }

  const strategy = Object.values(notificationStrategies).find(s => s.name === notification.type);

  if (!strategy) {
    throw new HttpError('Unsupported notification type', 400);
  }

  const parseContext = strategy.schema.safeParse(notification.context);

  if (!parseContext.success) {
    throw new HttpError('Notification cannot be replayed', 400);
  }

  const { data: context } = parseContext;

  const replayUuid = await sendNotification(strategy.name, notification, context);

  await upsertNotification({
    notification: notification,
    context: notification.context,
    replayUuid,
    type: notification.type,
    failed: notification.failed,
    externalId: notification.externalId,
  });
}

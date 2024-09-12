import { Authenticated, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { UUID } from '@work-orders/common/util/uuid.js';
import { NotificationsPaginationOptions } from '../../schemas/generated/notifications-pagination-options.js';
import { getNotifications } from '../../services/notifications/queries.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { replayNotification } from '../../services/notifications/strategies/strategy.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

@Authenticated()
export default class NotificationsController {
  @Get('/')
  @QuerySchema('notifications-pagination-options')
  async fetchNotificationsPage(
    req: Request<unknown, unknown, unknown, NotificationsPaginationOptions>,
    res: Response<FetchNotificationsPageResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { order, orderBy, limit, offset, uuid, recipient, query, replayUuid, type, failed } = req.query;

    const { notifications, hasNextPage } = await getNotifications({
      shop,
      order,
      orderBy,
      limit,
      offset,
      uuid,
      recipient,
      query,
      replayUuid,
      type,
      failed,
    });

    return res.json({
      notifications: notifications.map(
        ({ uuid, type, recipient, message, failed, updatedAt, createdAt, replayUuid }) => ({
          uuid,
          type,
          recipient,
          message,
          failed,
          replayUuid,
          createdAt: createdAt.toISOString() as DateTime,
          updatedAt: updatedAt.toISOString() as DateTime,
        }),
      ),
      hasNextPage,
    });
  }

  @Post('/:uuid/replay')
  async replayNotification(req: Request<{ uuid: string }>, res: Response<ReplayNotificationResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { uuid } = req.params;

    await replayNotification({ shop, uuid });

    const {
      notifications: [notification = never()],
    } = await getNotifications({ shop, uuid, limit: 1 });

    return res.json({
      uuid: notification.uuid,
      type: notification.type,
      recipient: notification.recipient,
      message: notification.message,
      failed: notification.failed,
      replayUuid: notification.replayUuid,
      createdAt: notification.createdAt.toISOString() as DateTime,
      updatedAt: notification.updatedAt.toISOString() as DateTime,
    });
  }
}

export type FetchNotificationsPageResponse = {
  notifications: {
    uuid: UUID;
    type: string;
    recipient: string;
    message: string;
    failed: boolean;
    replayUuid: UUID | null;
    createdAt: DateTime;
    updatedAt: DateTime;
  }[];
  hasNextPage: boolean;
};

export type ReplayNotificationResponse = {
  uuid: UUID;
  type: string;
  recipient: string;
  message: string;
  failed: boolean;
  replayUuid: UUID | null;
  createdAt: DateTime;
  updatedAt: DateTime;
};

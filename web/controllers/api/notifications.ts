import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { UUID } from '@work-orders/common/util/uuid.js';
import { NotificationsPaginationOptions } from '../../schemas/generated/notifications-pagination-options.js';
import { getNotifications } from '../../services/notifications/queries.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';

@Authenticated()
export default class NotificationsController {
  @Get('/')
  @QuerySchema('notifications-pagination-options')
  async fetchNotificationsPage(
    req: Request<unknown, unknown, unknown, NotificationsPaginationOptions>,
    res: Response<FetchNotificationsPageResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { order, orderBy, limit, offset, uuid, recipient, query } = req.query;

    const { notifications, hasNextPage } = await getNotifications({
      shop,
      order,
      orderBy,
      limit,
      offset,
      uuid,
      recipient,
      query,
    });

    return res.json({
      notifications: notifications.map(({ uuid, type, recipient, message, failed, updatedAt }) => ({
        uuid,
        type,
        recipient,
        message,
        failed,
        createdAt: updatedAt.toISOString() as DateTime,
        updatedAt: updatedAt.toISOString() as DateTime,
      })),
      hasNextPage,
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
    createdAt: DateTime;
    updatedAt: DateTime;
  }[];
  hasNextPage: boolean;
};

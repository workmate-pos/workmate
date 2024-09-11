import { Middleware, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { urlencoded } from 'express';
import twilio from 'twilio';
import { getNotifications, upsertNotification } from '../../services/notifications/queries.js';
import { z } from 'zod';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';

const { TWILIO_AUTH_TOKEN, HOST } = process.env;

if (!TWILIO_AUTH_TOKEN) {
  throw new Error('TWILIO_AUTH_TOKEN is not set');
}

if (!HOST) {
  throw new Error('HOST is not set');
}

export const statusCallbackUrl = new URL(`/api/twilio/status`, HOST).toString();

const twilioWebhook = twilio.webhook({
  authToken: process.env.TWILIO_AUTH_TOKEN,
  url: statusCallbackUrl,
  validate: true,
});

export default class TwilioController {
  @Post('/status')
  @Middleware(twilioWebhook)
  @Middleware(urlencoded({ extended: true }))
  async handleTwilioStatus(req: Request, res: Response) {
    const parsed = z
      .object({
        MessageStatus: z.string(),
        MessageSid: z.string(),
        To: z.string(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      sentryErr('Invalid twilio status request', { body: req.body, error: parsed.error });
      return res.sendStatus(400);
    }

    const { MessageSid, MessageStatus, To } = parsed.data;

    const { notifications } = await getNotifications({ externalId: MessageSid, recipient: To });

    if (!notifications.length) {
      sentryErr('No notifications found', { MessageSid, MessageStatus, To });
    }

    for (const notification of notifications) {
      await upsertNotification({
        externalId: notification.externalId,
        failed: MessageStatus === 'failed',
        type: notification.type,
        notification: {
          recipient: notification.recipient,
          message: notification.message,
          shop: notification.shop,
          uuid: notification.uuid,
        },
      });
    }

    res.sendStatus(200);
  }
}

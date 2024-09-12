import { defineNotificationStrategy } from './strategy.js';
import { mg } from '../../mail/mailgun.js';
import { z } from 'zod';

export const emailNotificationStrategy = defineNotificationStrategy({
  name: 'email',
  schema: z.object({
    subject: z.string(),
    replyTo: z.string(),
    from: z.string(),
  }),
  handler: async (notification, context) => {
    const message = await mg.send(
      {
        emailReplyTo: context.replyTo,
        emailFromTitle: context.from,
      },
      {
        subject: context.subject,
        to: notification.recipient,
        // TODO: Do some formatting / allow the user to pick a format
        text: notification.message,
      },
    );

    if (!message.id) {
      throw new Error(`Failed to send email (${message.status}). ${message.details}`);
    }

    return message.id;
  },
});

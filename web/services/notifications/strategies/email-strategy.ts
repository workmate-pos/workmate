import { defineNotificationStrategy } from './strategy.js';
import { mg } from '../../mail/mailgun.js';

export const emailNotificationStrategy = defineNotificationStrategy({
  name: 'email',
  handler: async (notification, context: { subject: string; replyTo: string; from: string }) => {
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

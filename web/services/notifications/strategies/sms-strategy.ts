import twilio from 'twilio';
import { defineNotificationStrategy } from './strategy.js';
import { consoleNotificationStrategy } from './console-strategy.js';
import { statusCallbackUrl } from '../../../controllers/api/twilio.js';
import { z } from 'zod';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

const hasTwilioEnvVars = !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_PHONE_NUMBER;

if (!hasTwilioEnvVars) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Twilio account SID and auth token must be set');
  }

  console.warn('Twilio account SID and auth token are not set, logging notifications to console instead.');
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const smsNotificationStrategy = defineNotificationStrategy({
  name: 'sms',
  schema: z.object({}),
  handler: async (notification, context) => {
    if (!hasTwilioEnvVars) {
      return consoleNotificationStrategy.handler(notification, {});
    }

    let message = await client.messages.create({
      body: notification.message,
      from: TWILIO_PHONE_NUMBER,
      to: notification.recipient,
      statusCallback: statusCallbackUrl,
    });

    return message.sid;
  },
});

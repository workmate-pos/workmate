import { defineNotificationStrategy } from './strategy.js';
import { z } from 'zod';

export const consoleNotificationStrategy = defineNotificationStrategy({
  name: 'console',
  schema: z.object({}),
  handler: async notification => {
    console.log(`[NOTIFICATION] [${notification.shop}] ${notification.message}`);

    return null;
  },
});

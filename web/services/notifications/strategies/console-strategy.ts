import { defineNotificationStrategy } from './strategy.js';

export const consoleNotificationStrategy = defineNotificationStrategy({
  name: 'console',
  handler: async notification => {
    console.log(`[NOTIFICATION] [${notification.shop}] ${notification.message}`);

    return null;
  },
});

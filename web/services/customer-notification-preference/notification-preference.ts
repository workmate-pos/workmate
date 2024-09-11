import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { notificationStrategies } from '../notifications/strategies/strategy.js';

const notificationPreferences = Object.values(notificationStrategies).map(strategy => strategy.name);
export type NotificationPreference = (typeof notificationPreferences)[number];

/**
 * Convert a string to a notification preference, falling back to a fallback if the string is invalid.
 */
export function getNotificationPreference<Fallback extends NotificationPreference | null>(
  preference: string,
  fallback: Fallback,
): NotificationPreference | Fallback {
  if (notificationPreferences.some(p => p === preference)) {
    return preference as NotificationPreference;
  }

  sentryErr('Encountered invalid notification preference', { preference });

  return fallback;
}

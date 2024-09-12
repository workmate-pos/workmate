import { Customer } from '../queries/use-customers-query.js';
import { NotificationPreference } from '@web/services/customer-notification-preference/notification-preference.js';

export type OnStatusChangeNotificationVariables = {
  name: string;
  status: string;
  'customer.displayName': string;
  'customer.phone': string | null;
  'customer.email': string | null;
};

export function replaceNotificationVariables(text: string, variables: OnStatusChangeNotificationVariables) {
  return Object.entries(variables).reduce(
    (acc, [variable, value]) => acc.replace(new RegExp(String.raw`{{\s*${variable}\s*}}`, 'g'), value || ''),
    text,
  );
}

export function getNotificationType(customer: Customer, preference: string | null): NotificationPreference | null {
  if (preference === 'email' && !!customer.email) {
    return 'email';
  }

  if (preference === 'sms' && !!customer.phone) {
    return 'sms';
  }

  if (customer.email) {
    return 'email';
  }

  if (customer.phone) {
    return 'sms';
  }

  return null;
}

import { Customer } from '../queries/use-customers-query.js';
import { NotificationPreference } from '@web/services/customer-notification-preference/notification-preference.js';

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

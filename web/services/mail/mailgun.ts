import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { MailgunMessageData } from 'mailgun.js/Types/Messages/Messages.js';
import { IMailgunClient } from 'mailgun.js/Interfaces/MailgunClient/IMailgunClient.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { ShopSettings } from '../../schemas/generated/shop-settings.js';

export type MailgunProps = {
  key: string;
  domain: string;
  fromEmail: string;
};

export class MailgunService {
  private mailgun;
  private client: IMailgunClient;
  private readonly domain: string;
  private readonly fromEmail: string;

  constructor({ key, domain, fromEmail }: MailgunProps) {
    this.mailgun = new (Mailgun as any)(FormData);
    this.client = this.mailgun.client({ username: 'api', key });
    this.domain = domain;
    this.fromEmail = fromEmail;
  }

  async send(settings: Pick<ShopSettings, 'emailFromTitle' | 'emailReplyTo'>, data: MailgunMessageData) {
    return this.client.messages.create(this.domain, {
      from: `${settings.emailFromTitle} <${this.fromEmail}>`,
      'h:Reply-To': data['h:Reply-To'] ?? settings.emailReplyTo,
      ...data,
    });
  }
}

const fixYourEnv = () =>
  never('Please set the MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM_EMAIL environment variables');

export const mg = new MailgunService({
  key: process.env.MAILGUN_API_KEY ?? fixYourEnv(),
  domain: process.env.MAILGUN_DOMAIN ?? fixYourEnv(),
  fromEmail: process.env.MAILGUN_FROM_EMAIL ?? fixYourEnv(),
});

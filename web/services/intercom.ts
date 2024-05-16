import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import crypto from 'crypto';

export type IntercomUser = {
  userId: string;
  userHash: string;
  company: {
    name: string;
    companyId: string;
    website: string;
  };
};

export class Intercom {
  getUser(shop: string, staffMemberId: ID): IntercomUser {
    const companyId = shop.replace('.myshopify.com', '');
    return {
      userId: parseGid(staffMemberId).id,
      userHash: this.getUserHash(staffMemberId),
      company: {
        name: companyId,
        companyId: companyId,
        website: shop,
      },
    };
  }

  private getUserHash(staffMemberId: ID) {
    return crypto
      .createHmac('sha256', process.env.INTERCOM_VERIFICATION_SECRET!)
      .update(parseGid(staffMemberId).id)
      .digest('hex');
  }
}

export const intercom = new Intercom();

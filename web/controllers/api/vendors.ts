import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { getVendors, Vendor } from '../../services/vendors/get.js';
import { ID, createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

@Authenticated()
export default class VendorsController {
  @Get('/')
  async fetchVendors(req: Request, res: Response<FetchVendorsResponse>) {
    const session: Session = res.locals.shopify.session;

    const vendors = await getVendors(session);

    const vendorsWithCustomerId = vendors.map(vendor => ({
      ...vendor,
      customer: vendor.customer
        ? {
            ...vendor.customer,
            // vendor id is in the CustomerSegmentMember namespace but has the same id as Customer (don't ask me why)
            customerId: createGid('Customer', parseGid(vendor.customer.id).id),
          }
        : null,
    }));

    return res.json({ vendors: vendorsWithCustomerId });
  }
}

export type FetchVendorsResponse = {
  vendors: (Vendor & { customer: { customerId: ID } | null })[];
};

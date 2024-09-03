import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { getVendors, Vendor } from '../../services/vendors/get.js';
import { ID, createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { getNotFullyOrderedSpecialOrderVendors } from '../../services/vendors/queries.js';

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

  @Get('/not-fully-ordered-special-orders/:locationId')
  async fetchNotFullyOrderedSpecialOrderVendors(
    req: Request<{ locationId: string }>,
    res: Response<FetchVendorsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { locationId } = req.params;

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

    const relevantVendors = await getNotFullyOrderedSpecialOrderVendors(createGid('Location', locationId));

    return res.json({
      vendors: vendorsWithCustomerId.filter(vendor => relevantVendors.includes(vendor.name)),
    });
  }
}

export type FetchVendorsResponse = {
  vendors: (Vendor & { customer: { customerId: ID } | null })[];
};

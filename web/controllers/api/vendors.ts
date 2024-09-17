import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { getVendors, Vendor } from '../../services/vendors/get.js';
import { ID, createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { VendorFilter } from '../../schemas/generated/get-vendors-filters.js';
import { getSpecialOrderVendors } from '../../services/vendors/queries.js';

@Authenticated()
export default class VendorsController {
  @Get('/')
  @QuerySchema('get-vendors-filters')
  async fetchVendors(req: Request<unknown, unknown, unknown, VendorFilter>, res: Response<FetchVendorsResponse>) {
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

    const relevantVendors =
      req.query.specialOrderLocationId || req.query.specialOrderLineItemOrderState
        ? await getSpecialOrderVendors(req.query)
        : null;

    return res.json({
      vendors: vendorsWithCustomerId.filter(vendor => !relevantVendors || relevantVendors.includes(vendor.name)),
    });
  }
}

export type FetchVendorsResponse = {
  vendors: (Vendor & { customer: { customerId: ID } | null })[];
};
